/**
 * TrọCare Mobile — Bulk Invoice Creation Screen
 * A state-of-the-art interface designed for Senior UI/UX.
 * Allows owner to batch generate invoices for multiple rooms in a cycle.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
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
} from '@/lib/rentalOps';

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
}

export default function BulkInvoiceScreen() {
  const router = useRouter();
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Initialize data
  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const bhs = await loadBoardingHouses();
      setBoardingHouses(bhs);

      // Load active contracts awaiting billing for selected period
      const pending = await loadPendingBilling(period.month, period.year);
      
      const initialState: Record<string, RoomBillingState> = {};
      const newSelectedRoomIds = new Set<string>();

      pending.forEach((room) => {
        initialState[room.id] = {
          room,
          elecOld: 0,
          elecNew: '',
          waterOld: 0,
          waterNew: '',
          roomFee: Number(room.price || 0),
          loading: true,
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
              loadContract(room.contract_id!),
              loadLatestMeterReadings(room.id),
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
                  roomFee: Number(contractData?.rent_amount ?? room.price),
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
      setLoading(false);
      setRefreshing(false);
    }
  }, [period.month, period.year]);

  useEffect(() => {
    initData();
  }, [initData]);

  const onRefresh = () => {
    setRefreshing(true);
    initData();
  };

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
  const handleBulkSubmit = async () => {
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

    try {
      setSubmitting(true);
      setProgressMsg(`Đang khởi tạo lập ${selectedList.length} hóa đơn...`);

      const payloads = selectedList.map((state) => buildInvoicePayload(state.room.id)).filter(Boolean);
      
      setProgressMsg(`Đang lập hóa đơn trên máy chủ...`);
      await bulkCreateInvoices(payloads);

      setToast({ message: `Lập thành công ${payloads.length} hóa đơn!`, type: 'success' });
      setTimeout(() => {
        router.back();
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

  if (loading && Object.keys(billingStates).length === 0) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.stateText}>Đang kiểm tra chỉ số điện nước & dịch vụ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Lập hóa đơn hàng loạt',
          headerBackTitle: 'Quay lại',
          headerStyle: { backgroundColor: Colors.background },
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold, fontSize: 16 },
        }}
      />

      {/* Date Period Select Bar */}
      <View style={styles.periodPicker}>
        <TouchableOpacity style={styles.periodArrow} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.periodTextContainer}>
          <Ionicons name="calendar-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.periodText}>
            Tháng {period.month}, {period.year}
          </Text>
        </View>
        <TouchableOpacity style={styles.periodArrow} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Boarding House Horizontal Selector */}
      <View style={styles.facilitySelectorContainer}>
        <Text style={styles.selectLabel}>Chọn dãy trọ:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
          <TouchableOpacity
            style={[styles.pickerItem, selectedBhId === 'all' && styles.pickerItemActive]}
            onPress={() => setSelectedBhId('all')}
          >
            <Text style={[styles.pickerText, selectedBhId === 'all' && styles.pickerTextActive]}>
              Tất cả dãy
            </Text>
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

      {/* Main Billing Rooms Form */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {filteredStates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Tất cả hóa đơn đã được lập!</Text>
            <Text style={styles.emptyDesc}>
              Không có phòng occupied nào chưa lập hóa đơn trong tháng {period.month}/{period.year}.
            </Text>
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
                  styles.porcelainCard,
                  isChecked && styles.porcelainCardActive,
                  { shadowColor: isChecked ? Colors.primary : '#94A3B8' },
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
                    <View>
                      <Text style={styles.roomName}>{state.room.name}</Text>
                      <Text style={styles.tenantName}>
                        👤 {state.room.tenant_name || 'Không rõ khách'}
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
                      <Text style={styles.detailItemText}>
                        🏠 Tiền phòng: <Text style={styles.boldText}>{formatMoney(state.roomFee)}</Text>
                      </Text>
                      <Text style={styles.detailItemText}>
                        ⚙️ Dịch vụ khác:{' '}
                        <Text style={styles.boldText}>
                          {formatMoney(calculateTotal(state) - state.roomFee)}
                        </Text>
                      </Text>
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
                            <TextInput
                              placeholder="Số điện mới"
                              keyboardType="numeric"
                              value={state.elecNew}
                              onChangeText={(v) => handleInputChange(state.room.id, 'elecNew', v)}
                              style={styles.textInput}
                            />
                          </View>
                        )}

                        {hasWater && (
                          <View style={styles.inputCol}>
                            <View style={styles.inputLabelRow}>
                              <Ionicons name="water-outline" size={12} color="#06B6D4" />
                              <Text style={styles.inputFieldLabel}>Nước (Cũ: {state.waterOld})</Text>
                            </View>
                            <TextInput
                              placeholder="Số nước mới"
                              keyboardType="numeric"
                              value={state.waterNew}
                              onChangeText={(v) => handleInputChange(state.room.id, 'waterNew', v)}
                              style={styles.textInput}
                            />
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
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarSummary}>
            <Text style={styles.bottomSummaryLabel}>Đang lập</Text>
            <Text style={styles.bottomSummaryValue}>{visibleSelectedCount} phòng</Text>
          </View>
          <Button
            title="Lập hóa đơn hàng loạt"
            variant="primary"
            onPress={handleBulkSubmit}
            disabled={submitting || visibleSelectedCount === 0}
            style={styles.submitButton}
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

      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F6' },
  container: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 110 },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F6', gap: 12 },
  stateText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: '#64748B' },

  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
  },
  periodArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTextContainer: { flexDirection: 'row', alignItems: 'center' },
  periodText: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: '#0F172A' },

  facilitySelectorContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
    paddingLeft: 16,
    gap: 8,
  },
  selectLabel: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#94A3B8', textTransform: 'uppercase' },
  pickerRow: { flexDirection: 'row' },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F4F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 8,
  },
  pickerItemActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  pickerText: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  pickerTextActive: { color: Colors.primary, fontFamily: Typography.fontFamily.bold },

  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EAEAEF',
  },
  selectAllText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#475569' },
  selectedCount: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: '#64748B' },

  /* 3D Porcelain Cards Styles */
  porcelainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#EAEAEF',
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  porcelainCardActive: {
    borderColor: 'rgba(138, 63, 252, 0.25)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roomName: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: '#0F172A', letterSpacing: -0.4 },
  tenantName: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#64748B', marginTop: 2 },

  totalBlock: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 9, fontFamily: Typography.fontFamily.bold, color: '#94A3B8', textTransform: 'uppercase' },
  totalValue: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.primary, marginTop: 1 },

  divider: { height: 1, backgroundColor: '#F4F4F6', marginVertical: 12 },
  cardLoading: { paddingVertical: 16, alignItems: 'center' },

  baseDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailItemText: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  boldText: { fontFamily: Typography.fontFamily.bold, color: '#334155' },

  inputsContainer: { flexDirection: 'row', gap: 12 },
  inputCol: { flex: 1, gap: 6 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inputFieldLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, color: '#64748B' },
  textInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  bottomBarSummary: { flex: 1 },
  bottomSummaryLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#94A3B8' },
  bottomSummaryValue: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.primary, marginTop: 2 },
  submitButton: { minWidth: 160 },

  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: '#0F172A' },
  emptyDesc: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: '#64748B', textAlign: 'center', lineHeight: 18 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  progressTitle: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: '#0F172A' },
  progressSub: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: '#64748B', textAlign: 'center' },
});
