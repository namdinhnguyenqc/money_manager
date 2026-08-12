/**
 * TrọCare Mobile — Bulk Invoice Creation Screen
 * A state-of-the-art interface designed for Senior UI/UX.
 * Allows owner to batch generate invoices for multiple rooms in a cycle.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Modal,
  AppState,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import MeterOcrAction from '@/components/invoice/MeterOcrAction';
import {
  loadBoardingHouses,
  loadPendingBilling,
  loadContract,
  loadLatestMeterReadings,
  bulkCreateInvoices,
  formatMoney,
  AppliedServiceSnapshot,
  BoardingHouse,
  RentalRoom,
  ContractView,
  loadServiceConfigs,
  calculateProratedRoomFee,
} from '@/lib/rentalOps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MeterReview = {
  confidence?: number;
  imageUri?: string;
  needsReview: boolean;
};

const parseMeterDraft = (value: string | null) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

interface RoomBillingState {
  room: RentalRoom;
  contract?: ContractView;
  elecOld: number;
  elecNew: string;
  waterOld: number;
  waterNew: string;
  roomFee: number;
  loading: boolean;
  error?: string;
  elecReview?: MeterReview;
  waterReview?: MeterReview;
}

export default function BulkInvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ month?: string; year?: string }>();

  // Period State (Defaults to params or current date)
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    const month = params.month ? Number(params.month) : today.getMonth() + 1;
    const year = params.year ? Number(params.year) : today.getFullYear();
    return { month, year };
  });

  // Data Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // UI Selection States
  const [boardingHouses, setBoardingHouses] = useState<BoardingHouse[]>([]);
  const [selectedBhId, setSelectedBhId] = useState<string>('all');
  const [billingStates, setBillingStates] = useState<Record<string, RoomBillingState>>({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [captureVisible, setCaptureVisible] = useState(false);
  const [captureIndex, setCaptureIndex] = useState(0);
  const hasLoadedRef = useRef(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const draftKey = `trocare-meter-draft:${period.year}-${period.month}`;

  // Initialize data
  const initData = useCallback(async (forceRefresh = false) => {
    try {
      if (hasLoadedRef.current) setRefreshing(true);
      else setLoading(true);

      const requestOptions = forceRefresh ? { forceRefresh: true } : undefined;
      const [services, bhs, pending, savedDraft] = await Promise.all([
        loadServiceConfigs(false, requestOptions),
        loadBoardingHouses(requestOptions),
        loadPendingBilling(period.month, period.year, undefined, requestOptions),
        AsyncStorage.getItem(draftKey).catch(() => null),
      ]);
      if (services.length === 0) {
        Alert.alert(
          'Chưa cấu hình dịch vụ',
          'Bạn chưa cấu hình bảng giá dịch vụ. Vui lòng thiết lập bảng giá dịch vụ trước khi tạo hóa đơn.',
          [
            {
              text: 'Thiết lập ngay',
              onPress: () => router.replace('/services' as any),
            },
            {
              text: 'Quay lại',
              onPress: () => handleBack(),
              style: 'cancel',
            },
          ]
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setBoardingHouses(bhs);

      const draft = parseMeterDraft(savedDraft) as Record<string, Pick<RoomBillingState, 'elecNew' | 'waterNew' | 'elecReview' | 'waterReview'>>;
      
      const initialState: Record<string, RoomBillingState> = {};
      const newSelectedRoomIds = new Set<string>();

      pending.forEach((room) => {
        initialState[room.id] = {
          room,
          elecOld: 0,
          elecNew: draft[room.id]?.elecNew || '',
          waterOld: 0,
          waterNew: draft[room.id]?.waterNew || '',
          roomFee: Number(room.price || 0),
          loading: true,
          elecReview: draft[room.id]?.elecReview,
          waterReview: draft[room.id]?.waterReview,
        };
        newSelectedRoomIds.add(room.id); // Check all by default
      });

      setBillingStates(initialState);
      setSelectedRoomIds(newSelectedRoomIds);

      // Load contract details and previous readings for each room in parallel
      await Promise.all(
        pending.map(async (room) => {
          try {
            const [contractData, readings] = await Promise.all([
              loadContract(room.contract_id!, requestOptions),
              loadLatestMeterReadings(room.id, requestOptions),
            ]);

            setBillingStates((prev) => {
              if (!prev[room.id]) return prev;
              return {
                ...prev,
                [room.id]: {
                  ...prev[room.id],
                  contract: contractData || undefined,
                  elecOld: Number(readings.elec_old || 0),
                  waterOld: Number(readings.water_old || 0),
                  roomFee: calculateProratedRoomFee(
                    Number(contractData?.rent_amount ?? room.price),
                    contractData?.start_date ?? room.start_date,
                    period.month,
                    period.year,
                  ),
                  loading: false,
                },
              };
            });
          } catch (e) {
            setBillingStates((prev) => {
              if (!prev[room.id]) return prev;
              return {
                ...prev,
                [room.id]: {
                  ...prev[room.id],
                  error: 'Không tải được dịch vụ',
                  loading: false,
                },
              };
            });
          }
        })
      );
    } catch (e: any) {
      setToast({ message: e?.message || 'Lỗi tải danh sách lập hóa đơn.', type: 'error' });
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [period.month, period.year, draftKey, router]);

  useFocusEffect(useCallback(() => {
    void initData(true);
  }, [initData]));

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (previousState !== 'active' && nextState === 'active') {
        void initData(true);
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, [initData]);

  const onRefresh = () => {
    setRefreshing(true);
    void initData(true);
  };

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/settings' as any);
  }, [router]);

  // Handle billing inputs
  const handleInputChange = (roomId: string, field: 'elecNew' | 'waterNew', value: string) => {
    setBillingStates((prev) => {
      if (!prev[roomId]) return prev;
      return {
        ...prev,
        [roomId]: {
          ...prev[roomId],
          [field]: value,
        },
      };
    });
  };

  const acceptOcrResult = (
    roomId: string,
    meter: 'electricity' | 'water',
    result: { confidence: number; imageUri: string; needsReview: boolean },
  ) => {
    setBillingStates((prev) => prev[roomId] ? {
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [meter === 'electricity' ? 'elecReview' : 'waterReview']: result,
      },
    } : prev);
  };

  useEffect(() => {
    if (loading || Object.keys(billingStates).length === 0) return;
    const timer = setTimeout(() => {
      const draft = Object.fromEntries(Object.entries(billingStates).map(([id, state]) => [id, {
        elecNew: state.elecNew,
        waterNew: state.waterNew,
        elecReview: state.elecReview,
        waterReview: state.waterReview,
      }]));
      AsyncStorage.setItem(draftKey, JSON.stringify(draft)).catch(() => undefined);
    }, 250);
    return () => clearTimeout(timer);
  }, [billingStates, draftKey, loading]);

  // Toggle selection checkbox
  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleRoomIds = Object.values(billingStates)
      .filter((state) => selectedBhId === 'all' || state.room.boarding_house_id === selectedBhId)
      .map((state) => state.room.id);

    const allSelected = visibleRoomIds.every((id) => selectedRoomIds.has(id));

    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all visible
        visibleRoomIds.forEach((id) => next.delete(id));
      } else {
        // Select all visible
        visibleRoomIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Calculation engine mimicking backend items mapping
  const calculateTotal = (state: RoomBillingState) => {
    if (!state.contract) return state.roomFee;

    let total = state.roomFee;
    const services = (state.contract.applied_services_snapshot || []) as AppliedServiceSnapshot[];

    services.forEach((s) => {
      const type = String(s.type || '').toLowerCase();
      const unitPrice = Number(s.applied_unit_price || 0);

      if (type === 'fixed') {
        total += unitPrice;
      } else if (type === 'per_person') {
        const occupants = Number(state.contract?.occupant_count || 1);
        total += unitPrice * occupants;
      } else if (type === 'per_room') {
        total += unitPrice;
      } else if (type === 'metered' || type === 'meter') {
        const name = String(s.name || '').toLowerCase();
        const isElec = name.includes('điện') || name.includes('dien') || name.includes('electric');
        const isWater = name.includes('nước') || name.includes('nuoc') || name.includes('water');

        const newVal = isElec ? Number(state.elecNew) : isWater ? Number(state.waterNew) : 0;
        const oldVal = isElec ? state.elecOld : isWater ? state.waterOld : 0;

        if (newVal > oldVal) {
          total += (newVal - oldVal) * unitPrice;
        }
      }
    });

    return total;
  };

  // Build backend compatible bulk request item
  const buildInvoicePayload = (roomId: string) => {
    const state = billingStates[roomId];
    if (!state || !state.contract) return null;

    const contract = state.contract;
    const items: any[] = [];
    const services = (contract.applied_services_snapshot || []) as AppliedServiceSnapshot[];

    services.forEach((s) => {
      const type = String(s.type || '').toLowerCase();
      const unitPrice = Number(s.applied_unit_price || 0);
      const name = String(s.name || '').toLowerCase();
      const isElec = name.includes('điện') || name.includes('dien') || name.includes('electric');
      const isWater = name.includes('nước') || name.includes('nuoc') || name.includes('water');

      if (type === 'fixed') {
        items.push({
          name: s.name,
          detail: `${formatMoney(unitPrice)} cố định`,
          amount: unitPrice,
          serviceId: s.service_id,
          calculationType: type,
          unitPrice,
          quantity: 1,
          serviceSnapshot: s,
        });
      } else if (type === 'per_person') {
        const occupants = Number(contract.occupant_count || 1);
        items.push({
          name: s.name,
          detail: `${occupants} người x ${formatMoney(unitPrice)}`,
          amount: unitPrice * occupants,
          serviceId: s.service_id,
          calculationType: type,
          unitPrice,
          quantity: occupants,
          serviceSnapshot: s,
        });
      } else if (type === 'per_room') {
        items.push({
          name: s.name,
          detail: `1 phòng x ${formatMoney(unitPrice)}`,
          amount: unitPrice,
          serviceId: s.service_id,
          calculationType: type,
          unitPrice,
          quantity: 1,
          serviceSnapshot: s,
        });
      } else if (type === 'metered' || type === 'meter') {
        const newVal = isElec ? Number(state.elecNew) : isWater ? Number(state.waterNew) : 0;
        const oldVal = isElec ? state.elecOld : isWater ? state.waterOld : 0;
        const usage = Math.max(0, newVal - oldVal);

        items.push({
          name: s.name,
          detail: `${oldVal} → ${newVal} = ${usage} x ${formatMoney(unitPrice)}`,
          amount: usage * unitPrice,
          serviceId: s.service_id,
          calculationType: type,
          unitPrice,
          quantity: usage,
          startReading: oldVal,
          endReading: newVal,
          usageValue: usage,
          serviceSnapshot: s,
        });
      }
    });

    return {
      roomId,
      contractId: contract.id,
      month: period.month,
      year: period.year,
      roomFee: state.roomFee,
      totalAmount: calculateTotal(state),
      elecOld: state.elecOld,
      elecNew: state.elecNew ? Number(state.elecNew) : null,
      waterOld: state.waterOld,
      waterNew: state.waterNew ? Number(state.waterNew) : null,
      items,
      note: 'Lập hàng loạt',
    };
  };

  // Submit batch payload
  const handleBulkSubmit = async (reviewWarningsConfirmed = false) => {
    const selectedList = Object.values(billingStates)
      .filter((state) => selectedRoomIds.has(state.room.id))
      .filter((state) => selectedBhId === 'all' || state.room.boarding_house_id === selectedBhId);

    if (selectedList.length === 0) {
      Alert.alert('Chưa chọn phòng', 'Vui lòng chọn ít nhất một phòng cần lập hóa đơn.');
      return;
    }

    // Input validations
    for (const state of selectedList) {
      if (state.contract) {
        const services = state.contract.applied_services_snapshot || [];
        const hasElec = services.some((s) => s.name.toLowerCase().includes('điện'));
        const hasWater = services.some((s) => s.name.toLowerCase().includes('nước'));

        if (hasElec && state.elecNew && Number(state.elecNew) < state.elecOld) {
          Alert.alert(
            'Chỉ số điện lỗi',
            `Phòng ${state.room.name}: Chỉ số điện mới không được nhỏ hơn chỉ số cũ (${state.elecOld}).`
          );
          return;
        }
        if (hasWater && state.waterNew && Number(state.waterNew) < state.waterOld) {
          Alert.alert(
            'Chỉ số nước lỗi',
            `Phòng ${state.room.name}: Chỉ số nước mới không được nhỏ hơn chỉ số cũ (${state.waterOld}).`
          );
          return;
        }
      }
    }

    const warningRooms = selectedList.filter((state) =>
      state.elecReview?.needsReview || state.waterReview?.needsReview
    );
    if (!reviewWarningsConfirmed && warningRooms.length > 0) {
      Alert.alert(
        'Có chỉ số cần kiểm tra',
        `${warningRooms.length} phòng có kết quả OCR độ tin cậy thấp hoặc bất thường. Bạn nên kiểm tra ảnh và chỉ số trước khi lập hóa đơn.`,
        [
          { text: 'Quay lại kiểm tra', style: 'cancel' },
          { text: 'Tôi đã kiểm tra', onPress: () => handleBulkSubmit(true) },
        ],
      );
      return;
    }

    try {
      setSubmitting(true);
      setProgressMsg(`Đang khởi tạo lập ${selectedList.length} hóa đơn...`);

      const payloads = selectedList.map((state) => buildInvoicePayload(state.room.id)).filter(Boolean);
      
      setProgressMsg(`Đang lập hóa đơn trên máy chủ...`);
      await bulkCreateInvoices(payloads);

      await AsyncStorage.removeItem(draftKey).catch(() => undefined);

      setToast({ message: `Lập thành công ${payloads.length} hóa đơn!`, type: 'success' });
      setTimeout(() => {
        handleBack();
      }, 1500);
    } catch (e: any) {
      Alert.alert('Lỗi lập hàng loạt', e?.message || 'Có lỗi xảy ra trong quá trình lập hóa đơn.');
    } finally {
      setSubmitting(false);
      setProgressMsg('');
    }
  };

  // Period changers
  const handlePrevMonth = () => {
    setPeriod((prev) => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      return { month: m, year: y };
    });
  };

  const handleNextMonth = () => {
    setPeriod((prev) => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      return { month: m, year: y };
    });
  };

  // Filtered pending states
  const filteredStates = useMemo(() => {
    return Object.values(billingStates).filter(
      (state) => selectedBhId === 'all' || state.room.boarding_house_id === selectedBhId
    );
  }, [billingStates, selectedBhId]);

  const visibleSelectedCount = useMemo(() => {
    return filteredStates.filter((s) => selectedRoomIds.has(s.room.id)).length;
  }, [filteredStates, selectedRoomIds]);

  const allVisibleSelected = useMemo(() => {
    return filteredStates.length > 0 && visibleSelectedCount === filteredStates.length;
  }, [filteredStates, visibleSelectedCount]);

  const captureStates = useMemo(() => filteredStates.filter((state) => {
    const services = state.contract?.applied_services_snapshot || [];
    return services.some((service) => {
      const name = service.name.toLowerCase();
      return name.includes('điện') || name.includes('nước');
    });
  }), [filteredStates]);
  const currentCapture = captureStates[captureIndex];
  const reviewCount = useMemo(() => captureStates.filter((state) =>
    state.elecReview?.needsReview || state.waterReview?.needsReview
  ).length, [captureStates]);

  if (loading && Object.keys(billingStates).length === 0) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.stateText}>Đang kiểm tra chỉ số điện nước & dịch vụ...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.customBackBtn} onPress={handleBack} hitSlop={10} activeOpacity={0.72}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.customHeaderTitle}>Lập hóa đơn hàng loạt</Text>
        <TouchableOpacity
          style={styles.captureHeaderButton}
          onPress={() => { setCaptureIndex(0); setCaptureVisible(true); }}
          disabled={captureStates.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Bắt đầu ghi chỉ số nhanh"
        >
          <Ionicons name="camera-outline" size={18} color={captureStates.length ? Colors.primary : Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.commandPanel}>
        <View style={styles.periodPicker}>
          <TouchableOpacity style={styles.periodArrow} onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.periodTextContainer}>
            <Text style={styles.selectLabel}>Kỳ hóa đơn</Text>
            <Text style={styles.periodText}>Tháng {period.month}/{period.year}</Text>
          </View>
          <TouchableOpacity style={styles.periodArrow} onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
          <TouchableOpacity style={[styles.pickerItem, selectedBhId === 'all' && styles.pickerItemActive]} onPress={() => setSelectedBhId('all')}>
            <Text style={[styles.pickerText, selectedBhId === 'all' && styles.pickerTextActive]}>Tất cả dãy</Text>
          </TouchableOpacity>
          {boardingHouses.map((bh) => (
            <TouchableOpacity
              key={bh.id}
              style={[styles.pickerItem, selectedBhId === bh.id && styles.pickerItemActive]}
              onPress={() => setSelectedBhId(bh.id)}
            >
              <Text style={[styles.pickerText, selectedBhId === bh.id && styles.pickerTextActive]}>
                {bh.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Select All Checkbox Row */}
      {filteredStates.length > 0 && (
        <View style={styles.selectAllRow}>
          <TouchableOpacity style={styles.checkboxRow} onPress={toggleSelectAll} activeOpacity={0.7}>
            <View style={[styles.checkbox, allVisibleSelected && styles.checkboxChecked]}>
              {allVisibleSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.selectAllText}>
              {allVisibleSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả phòng hiển thị'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>
            Đã chọn {visibleSelectedCount}/{filteredStates.length} phòng
          </Text>
        </View>
      )}

      {captureStates.length > 0 && (
        <TouchableOpacity
          style={styles.captureBanner}
          onPress={() => { setCaptureIndex(0); setCaptureVisible(true); }}
          activeOpacity={0.76}
        >
          <View style={styles.captureBannerIcon}>
            <Ionicons name="scan-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.captureBannerCopy}>
            <Text style={styles.captureBannerTitle}>Ghi chỉ số nhanh</Text>
            <Text style={styles.captureBannerText}>Đi tuần tự {captureStates.length} phòng · tự lưu nháp</Text>
          </View>
          {reviewCount > 0 ? <Text style={styles.reviewCount}>{reviewCount} cần xem</Text> : null}
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Main Billing Rooms Form */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scroll, { paddingBottom: 112 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {filteredStates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có phòng đủ điều kiện</Text>
            <Text style={styles.emptyDesc}>
              Hệ thống chỉ lập hàng loạt cho phòng đang thuê, có hợp đồng hoạt động và chưa có hóa đơn tháng {period.month}/{period.year}.
            </Text>
            <View style={styles.emptyChecklist}>
              <Text style={styles.emptyCheckItem}>1. Phòng phải ở trạng thái Đang thuê.</Text>
              <Text style={styles.emptyCheckItem}>2. Hợp đồng phải còn hoạt động.</Text>
              <Text style={styles.emptyCheckItem}>3. Kỳ này chưa được lập hóa đơn.</Text>
            </View>
            <View style={styles.emptyActions}>
              <TouchableOpacity style={styles.emptyPrimaryBtn} onPress={() => router.push('/(tabs)/facilities' as any)} activeOpacity={0.78}>
                <Text style={styles.emptyPrimaryText}>Kiểm tra phòng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.emptySecondaryBtn} onPress={() => router.push('/services' as any)} activeOpacity={0.78}>
                <Text style={styles.emptySecondaryText}>Bảng giá dịch vụ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          filteredStates.map((state) => {
            const isChecked = selectedRoomIds.has(state.room.id);
            const services = state.contract?.applied_services_snapshot || [];
            const hasElec = services.some((s) => s.name.toLowerCase().includes('điện'));
            const hasWater = services.some((s) => s.name.toLowerCase().includes('nước'));

            return (
              <View
                key={state.room.id}
                style={[
                  styles.roomCard,
                  isChecked && styles.roomCardActive,
                ]}
              >
                {/* Header detail */}
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => toggleRoomSelection(state.room.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={styles.roomIdentity}>
                      <Text style={styles.roomName}>{state.room.name}</Text>
                      <Text style={styles.tenantName}>
                        {state.room.tenant_name || 'Không rõ khách'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.totalBlock}>
                    <Text style={styles.totalLabel}>Dự tính tổng:</Text>
                    <Text style={styles.totalValue}>
                      {state.loading ? 'Đang tính...' : formatMoney(calculateTotal(state))}
                    </Text>
                  </View>
                </View>

                {state.loading ? (
                  <View style={styles.cardLoading}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : (
                  <>
                    <View style={styles.divider} />

                    {/* Quick Info */}
                    <View style={styles.baseDetails}>
                      <View style={styles.detailPill}>
                        <Ionicons name="home-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.detailItemText}>
                          Tiền phòng <Text style={styles.boldText}>{formatMoney(state.roomFee)}</Text>
                        </Text>
                      </View>
                      <View style={styles.detailPill}>
                        <Ionicons name="construct-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.detailItemText}>
                          Dịch vụ <Text style={styles.boldText}>{formatMoney(calculateTotal(state) - state.roomFee)}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Inputs Row for Electric and Water */}
                    {(hasElec || hasWater) && (
                      <View style={styles.inputsContainer}>
                        {hasElec && (
                          <View style={styles.inputCol}>
                            <View style={styles.inputLabelRow}>
                              <Ionicons name="flash-outline" size={12} color="#EAB308" />
                              <Text style={styles.inputFieldLabel}>Điện (Cũ: {state.elecOld})</Text>
                            </View>
                            <View style={styles.meterInputRow}>
                              <TextInput
                                placeholder="Số điện mới"
                                keyboardType="numeric"
                                value={state.elecNew}
                                onChangeText={(v) => handleInputChange(state.room.id, 'elecNew', v)}
                                style={[styles.textInput, styles.meterTextInput]}
                              />
                              <MeterOcrAction
                                compact
                                meter="electricity"
                                previousValue={state.elecOld}
                                onValueSuggested={(value) => handleInputChange(state.room.id, 'elecNew', value)}
                                onResultAccepted={(result) => acceptOcrResult(state.room.id, 'electricity', result)}
                              />
                            </View>
                            {state.elecReview ? (
                              <Text style={[styles.reviewLabel, state.elecReview.needsReview && styles.reviewLabelWarning]}>
                                {state.elecReview.needsReview ? 'Cần kiểm tra' : `Đã đọc · ${state.elecReview.confidence}%`}
                              </Text>
                            ) : null}
                          </View>
                        )}

                        {hasWater && (
                          <View style={styles.inputCol}>
                            <View style={styles.inputLabelRow}>
                              <Ionicons name="water-outline" size={12} color="#06B6D4" />
                              <Text style={styles.inputFieldLabel}>Nước (Cũ: {state.waterOld})</Text>
                            </View>
                            <View style={styles.meterInputRow}>
                              <TextInput
                                placeholder="Số nước mới"
                                keyboardType="numeric"
                                value={state.waterNew}
                                onChangeText={(v) => handleInputChange(state.room.id, 'waterNew', v)}
                                style={[styles.textInput, styles.meterTextInput]}
                              />
                              <MeterOcrAction
                                compact
                                meter="water"
                                previousValue={state.waterOld}
                                onValueSuggested={(value) => handleInputChange(state.room.id, 'waterNew', value)}
                                onResultAccepted={(result) => acceptOcrResult(state.room.id, 'water', result)}
                              />
                            </View>
                            {state.waterReview ? (
                              <Text style={[styles.reviewLabel, state.waterReview.needsReview && styles.reviewLabelWarning]}>
                                {state.waterReview.needsReview ? 'Cần kiểm tra' : `Đã đọc · ${state.waterReview.confidence}%`}
                              </Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Sticky Bottom Generator Action Bar */}
      {filteredStates.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.bottomBarSummary}>
            <Text style={styles.bottomSummaryLabel}>Đang lập</Text>
            <Text style={styles.bottomSummaryValue}>{visibleSelectedCount} phòng</Text>
          </View>
          <Button
            title="Tạo hóa đơn"
            variant="primary"
            onPress={() => handleBulkSubmit()}
            disabled={submitting || visibleSelectedCount === 0}
            style={styles.submitButton}
            textStyle={styles.submitButtonText}
            icon={submitting ? <ActivityIndicator size="small" color="#fff" /> : undefined}
          />
        </View>
      )}

      {/* Progress Loading Overlay */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.progressTitle}>Đang tạo hóa đơn...</Text>
            <Text style={styles.progressSub}>{progressMsg}</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={captureVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCaptureVisible(false)}>
        <View style={[styles.captureSheet, { paddingTop: insets.top }]}>
          <View style={styles.captureSheetHeader}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => setCaptureVisible(false)} accessibilityLabel="Đóng ghi chỉ số">
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.sheetHeading}>
              <Text style={styles.sheetTitle}>Ghi chỉ số</Text>
              <Text style={styles.sheetProgress}>{captureIndex + 1}/{captureStates.length}</Text>
            </View>
            <View style={styles.sheetClose} />
          </View>

          {currentCapture ? (() => {
            const services = currentCapture.contract?.applied_services_snapshot || [];
            const hasElec = services.some((service) => service.name.toLowerCase().includes('điện'));
            const hasWater = services.some((service) => service.name.toLowerCase().includes('nước'));
            return (
              <ScrollView contentContainerStyle={styles.captureSheetContent}>
                <View style={styles.captureRoomHeader}>
                  <Text style={styles.captureRoomName}>{currentCapture.room.name}</Text>
                  <Text style={styles.captureTenant}>{currentCapture.room.tenant_name || 'Chưa có tên khách thuê'}</Text>
                </View>
                {hasElec ? (
                  <View style={styles.captureMeterRow}>
                    <View style={styles.captureMeterCopy}>
                      <Text style={styles.captureMeterTitle}>Điện</Text>
                      <Text style={styles.captureMeterOld}>Chỉ số trước: {currentCapture.elecOld}</Text>
                      <Text style={styles.captureMeterValue}>{currentCapture.elecNew || 'Chưa ghi'}</Text>
                    </View>
                    <MeterOcrAction
                      meter="electricity"
                      previousValue={currentCapture.elecOld}
                      onValueSuggested={(value) => handleInputChange(currentCapture.room.id, 'elecNew', value)}
                      onResultAccepted={(result) => acceptOcrResult(currentCapture.room.id, 'electricity', result)}
                    />
                  </View>
                ) : null}
                {hasWater ? (
                  <View style={styles.captureMeterRow}>
                    <View style={styles.captureMeterCopy}>
                      <Text style={styles.captureMeterTitle}>Nước</Text>
                      <Text style={styles.captureMeterOld}>Chỉ số trước: {currentCapture.waterOld}</Text>
                      <Text style={styles.captureMeterValue}>{currentCapture.waterNew || 'Chưa ghi'}</Text>
                    </View>
                    <MeterOcrAction
                      meter="water"
                      previousValue={currentCapture.waterOld}
                      onValueSuggested={(value) => handleInputChange(currentCapture.room.id, 'waterNew', value)}
                      onResultAccepted={(result) => acceptOcrResult(currentCapture.room.id, 'water', result)}
                    />
                  </View>
                ) : null}
                <Text style={styles.captureHint}>Kết quả có độ tin cậy thấp sẽ được đánh dấu để kiểm tra. Ảnh không bao giờ tự ghi đè chỉ số nếu bạn chưa xác nhận.</Text>
              </ScrollView>
            );
          })() : null}

          <View style={[styles.captureNav, { paddingBottom: 12 + insets.bottom }]}>
            <Button
              title="Phòng trước"
              variant="outline"
              onPress={() => setCaptureIndex((index) => Math.max(0, index - 1))}
              disabled={captureIndex === 0}
              style={styles.captureNavButton}
            />
            <Button
              title={captureIndex === captureStates.length - 1 ? 'Xong' : 'Phòng tiếp'}
              onPress={() => captureIndex === captureStates.length - 1
                ? setCaptureVisible(false)
                : setCaptureIndex((index) => index + 1)}
              style={styles.captureNavButton}
            />
          </View>
        </View>
      </Modal>

      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  customBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  captureHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHeaderTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12 },
  stateText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  headerBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    marginLeft: 2,
    borderRadius: 10,
  },

  commandPanel: {
    margin: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTextContainer: { alignItems: 'center' },
  periodText: { marginTop: 2, fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  selectLabel: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerRow: { gap: 8 },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerItemActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryAlpha50 },
  pickerText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  pickerTextActive: { color: Colors.primary, fontFamily: Typography.fontFamily.bold },

  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  selectAllText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  selectedCount: {
    flexShrink: 0,
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  captureBanner: {
    minHeight: 64,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  captureBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBannerCopy: { flex: 1, minWidth: 0 },
  captureBannerTitle: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  captureBannerText: { marginTop: 2, fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  reviewCount: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.warning },

  roomCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  roomCardActive: {
    borderColor: Colors.primaryAlpha50,
    backgroundColor: '#FCFDFF',
  },
  cardHeader: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roomIdentity: { flex: 1, minWidth: 0 },
  roomName: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  tenantName: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, marginTop: 2 },

  totalBlock: {
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  totalLabel: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  totalValue: { fontSize: 17, fontFamily: Typography.fontFamily.bold, color: Colors.primary, marginTop: 3 },

  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  cardLoading: { paddingVertical: 16, alignItems: 'center' },

  baseDetails: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailItemText: { flex: 1, fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  boldText: { fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },

  inputsContainer: { flexDirection: 'row', gap: 10 },
  inputCol: { flex: 1, gap: 6 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inputFieldLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  reviewLabel: { fontSize: 10, fontFamily: Typography.fontFamily.semibold, color: Colors.success },
  reviewLabelWarning: { color: Colors.warning },
  meterInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterTextInput: { flex: 1, minWidth: 0 },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
  },
  captureSheet: { flex: 1, backgroundColor: Colors.background },
  captureSheetHeader: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sheetClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetHeading: { alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  sheetProgress: { marginTop: 2, fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  captureSheetContent: { padding: 20, gap: 12, paddingBottom: 120 },
  captureRoomHeader: { paddingVertical: 8 },
  captureRoomName: { fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  captureTenant: { marginTop: 4, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  captureMeterRow: {
    minHeight: 132,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  captureMeterCopy: { flex: 1, minWidth: 0 },
  captureMeterTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  captureMeterOld: { marginTop: 5, fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  captureMeterValue: { marginTop: 12, fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.primary },
  captureHint: { fontSize: 12, lineHeight: 18, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  captureNav: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 12,
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  captureNavButton: { flex: 1 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  bottomBarSummary: { flexShrink: 0, minWidth: 82 },
  bottomSummaryLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  bottomSummaryValue: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.primary, marginTop: 2 },
  submitButton: { flex: 1, minWidth: 0, paddingHorizontal: 14 },
  submitButtonText: { fontSize: 14 },

  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  emptyTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  emptyDesc: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  emptyChecklist: {
    width: '100%',
    gap: 6,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  emptyCheckItem: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  emptyPrimaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
  },
  emptyPrimaryText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },
  emptySecondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: 11,
  },
  emptySecondaryText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    width: 280,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  progressTitle: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  progressSub: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, textAlign: 'center' },
});
