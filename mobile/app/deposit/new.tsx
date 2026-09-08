/**
 * TrọCare Mobile — Create Deposit Screen
 * Form fields:
 * - Vacant Room selection
 * - Tenant details (name, phone)
 * - Deposit amount & date
 * - Target wallet (to log income balance)
 * - Internal notes
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAppToast } from '@/components/ui/ToastProvider';
import DataErrorState from '@/components/ui/DataErrorState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { loadRentalRooms, loadWallets, createDeposit, formatMoney } from '@/lib/rentalOps';

export default function NewDepositScreen() {
  const router = useRouter();
  const { showToast, showError, showSuccess } = useAppToast();
  const { room_id, facility_id } = useLocalSearchParams<{ room_id?: string; facility_id?: string }>();

  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [rooms, setRooms] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  // Selection states
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  // Form Inputs
  const [form, setForm] = useState({
    tenantName: '',
    tenantPhone: '',
    amount: '',
    depositDate: '',
    note: '',
  });

  const handleBack = useCallback(() => {
    router.replace('/deposit' as any);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });

      return () => subscription.remove();
    }, [handleBack])
  );

  const selectedWallet = wallets.find((w) => String(w.id) === String(selectedWalletId));
  const selectedRoomPrice = Number(selectedRoom?.price || 0);
  const amountNumber = Number(form.amount || 0);
  const suggestedAmounts = Array.from(new Set([
    selectedRoomPrice,
    Math.round(selectedRoomPrice / 2),
    amountNumber,
  ].filter((value) => value > 0)));

  const setAmountDigits = (value: string) => {
    setForm((prev) => ({ ...prev, amount: value.replace(/\D/g, '') }));
  };

  const setPhoneDigits = (value: string) => {
    setForm((prev) => ({ ...prev, tenantPhone: value.replace(/\D/g, '').slice(0, 10) }));
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setLoadError('');
        const [roomsList, walletsList] = await Promise.all([
          loadRentalRooms(facility_id),
          loadWallets(),
        ]);

        // Filter vacant rooms or room already selected
        const vacantRooms = roomsList.filter((r) => r.status === 'vacant' || String(r.id) === String(room_id));
        setRooms(vacantRooms);

        if (room_id) {
          const preselected = vacantRooms.find((r) => String(r.id) === String(room_id));
          if (preselected) {
            setSelectedRoom(preselected);
            // Default cọc amount is usually half or full room price
            setForm((prev) => ({ ...prev, amount: String(preselected.price ? Math.round(preselected.price / 2) : '') }));
          }
        }

        setWallets(walletsList);
        if (walletsList.length > 0) {
          setSelectedWalletId(walletsList[0].id);
        }

        // Set default deposit date as today
        setForm((prev) => ({ ...prev, depositDate: formatDate(new Date()) }));
      } catch (e: any) {
        setLoadError(e?.message || 'Không tải được danh mục phòng và ví nhận tiền.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [room_id, facility_id, retryKey]);

  const handleSubmit = async () => {
    if (!selectedRoom) {
      showError('Vui lòng chọn phòng để cọc.', 'Thiếu thông tin');
      return;
    }

    if (!form.tenantName.trim()) {
      showError('Họ tên khách cọc không được để trống.', 'Thiếu thông tin');
      return;
    }

    if (form.tenantPhone && form.tenantPhone.replace(/\D/g, '').length !== 10) {
      showError('Số điện thoại khách cọc phải có đúng 10 chữ số.', 'Thông tin không hợp lệ');
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      showError('Số tiền cọc giữ phòng phải lớn hơn 0.', 'Thông tin không hợp lệ');
      return;
    }

    if (!form.depositDate) {
      showError('Vui lòng chọn ngày nhận tiền cọc.', 'Thiếu thông tin');
      return;
    }

    try {
      setSubmitting(true);
      showToast('Đang tạo phiếu đặt cọc giữ phòng…', 'info', 'Đang xử lý');

      await createDeposit({
        roomId: selectedRoom.id,
        tenantName: form.tenantName.trim(),
        tenantPhone: form.tenantPhone.trim() || undefined,
        amount: Number(form.amount),
        depositDate: form.depositDate,
        note: form.note.trim() || undefined,
        walletId: selectedWalletId || undefined,
      });

      showSuccess('Phiếu cọc đã được ghi nhận và phòng chuyển sang trạng thái giữ chỗ.', 'Đã nhận cọc giữ phòng');
      router.replace('/deposit' as any);
    } catch (e: any) {
      showError(e?.message || 'Không thể tạo phiếu cọc giữ phòng.', 'Tạo phiếu cọc chưa thành công');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer} accessibilityLabel="Đang chuẩn bị phiếu cọc giữ phòng">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </View>
    );
  }


  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: true, title: 'Nhận cọc giữ phòng' }} />
        <DataErrorState
          title="Chưa thể chuẩn bị phiếu cọc"
          message={loadError}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nhận cọc giữ phòng',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} hitSlop={12} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introRow}>
            <View style={styles.introIcon}>
              <Ionicons name="bookmark-outline" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.introText}>Phòng sẽ chuyển sang trạng thái đã giữ ngay sau khi ghi nhận.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Chọn phòng</Text>
          {rooms.length === 0 ? (
            <View style={styles.emptyRoom}>
              <Ionicons name="home-outline" size={22} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Không còn phòng trống để nhận cọc.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomRow}>
              {rooms.map((r) => {
                const isSelected = selectedRoom?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roomOption, isSelected && styles.roomOptionActive]}
                    onPress={() => {
                      setSelectedRoom(r);
                      setForm((prev) => ({ ...prev, amount: String(r.price ? Math.round(r.price / 2) : '') }));
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.roomOptionTop}>
                      <Text style={[styles.roomName, isSelected && styles.roomNameActive]} numberOfLines={1}>{r.name}</Text>
                      {isSelected ? <Ionicons name="checkmark-circle" size={19} color={Colors.primary} /> : null}
                    </View>
                    <Text style={styles.roomPrice} numberOfLines={1}>{formatMoney(r.price)}/tháng</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          </View>

          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Thông tin khách</Text>
          <Input
            label="Họ tên khách"
            placeholder="Ví dụ: Nguyễn Văn A"
            required
            value={form.tenantName}
            onChangeText={(v) => setForm({ ...form, tenantName: v })}
            leftIcon={<Ionicons name="person-outline" size={19} color={Colors.textSecondary} />}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Input
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            maxLength={10}
            value={form.tenantPhone}
            onChangeText={setPhoneDigits}
            leftIcon={<Ionicons name="call-outline" size={19} color={Colors.textSecondary} />}
            hint="Không bắt buộc · dùng để tìm lại khi lập hợp đồng"
          />
          </View>

          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Khoản cọc</Text>
            <Text style={styles.amountLabel}>Số tiền nhận</Text>
            <View style={styles.amountField}>
              <Text style={styles.amountCurrency}>₫</Text>
              <Input
                keyboardType="number-pad"
                required
                value={form.amount ? Number(form.amount).toLocaleString('vi-VN') : ''}
                onChangeText={setAmountDigits}
                placeholder="0"
                containerStyle={styles.amountInputContainer}
              />
            </View>
          {suggestedAmounts.length > 0 && (
            <View style={styles.quickAmountRow}>
              {suggestedAmounts.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.quickAmount, amountNumber === value && styles.quickAmountActive]}
                  onPress={() => setAmountDigits(String(value))}
                >
                  <Text style={[styles.quickAmountText, amountNumber === value && styles.quickAmountTextActive]}>
                    {value === selectedRoomPrice ? '1 tháng · ' : value === Math.round(selectedRoomPrice / 2) ? '1/2 tháng · ' : ''}{formatMoney(value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Input
            label="Ngày nhận cọc"
            placeholder="YYYY-MM-DD"
            required
            value={form.depositDate}
            onChangeText={(v) => setForm({ ...form, depositDate: v })}
            leftIcon={<Ionicons name="calendar-outline" size={19} color={Colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setForm((prev) => ({ ...prev, depositDate: formatDate(new Date()) }))} hitSlop={10}>
                <Text style={styles.todayAction}>Hôm nay</Text>
              </TouchableOpacity>
            }
          />
          </View>

          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Ghi vào ví</Text>
          {wallets.length === 0 ? (
            <View style={styles.noticeBox}>
              <Ionicons name="wallet-outline" size={18} color={Colors.warning} />
              <Text style={styles.noticeText}>Chưa có ví. Phiếu cọc vẫn được tạo, nhưng chưa ghi vào sổ quỹ.</Text>
            </View>
          ) : (
            <View style={styles.walletList}>
              {wallets.map((w) => {
                const isSelected = selectedWalletId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.walletRow, isSelected && styles.walletRowActive]}
                    onPress={() => setSelectedWalletId(w.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.walletIcon, isSelected && styles.walletIconActive]}>
                      <Ionicons name="wallet-outline" size={19} color={isSelected ? Colors.primary : Colors.textSecondary} />
                    </View>
                    <View style={styles.walletCopy}>
                      <Text style={styles.walletName} numberOfLines={1}>{w.name}</Text>
                      <Text style={styles.walletBalance} numberOfLines={1}>Số dư {formatMoney(w.balance)}</Text>
                    </View>
                    <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={21} color={isSelected ? Colors.primary : Colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          </View>

          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Ghi chú</Text>
          <Input
            placeholder="Ví dụ: Khách dự kiến vào ở ngày 25/07"
            value={form.note}
            onChangeText={(v) => setForm({ ...form, note: v })}
            multiline
            numberOfLines={3}
          />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>{selectedRoom?.name || 'Chưa chọn phòng'}</Text>
            <Text style={styles.footerAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {amountNumber > 0 ? formatMoney(amountNumber) : '0 ₫'}
            </Text>
            <Text style={styles.footerMeta} numberOfLines={1}>Nhận vào {selectedWallet?.name || 'không ghi sổ quỹ'}</Text>
          </View>
          <Button
            title="Xác nhận giữ phòng"
            variant="primary"
            size="lg"
            loading={submitting}
            onPress={handleSubmit}
            disabled={submitting || rooms.length === 0}
            style={styles.submitBtn}
            icon={<Ionicons name="checkmark" size={19} color="#fff" />}
          />
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBackButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  loadingContainer: { flex: 1, padding: 16, gap: 14, backgroundColor: Colors.background },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  introIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight },
  introText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  section: { paddingVertical: 2 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 22 },
  sectionHeader: { fontSize: 17, lineHeight: 22, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.25 },
  emptyRoom: { minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: Colors.surface },
  emptyText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  roomRow: { gap: 10, paddingRight: 20 },
  roomOption: { width: 148, minHeight: 78, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#E2E8F0' },
  roomOptionActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  roomOptionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  roomName: { flex: 1, fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  roomNameActive: { color: Colors.primaryDark },
  roomPrice: { marginTop: 8, fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  amountLabel: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, marginBottom: 6 },
  amountField: { flexDirection: 'row', alignItems: 'center', minHeight: 62, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
  amountCurrency: { fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary, marginRight: 8 },
  amountInputContainer: { flex: 1, marginBottom: 0 },
  quickAmountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 20 },
  quickAmount: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#E2E8F0' },
  quickAmountActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  quickAmountText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  quickAmountTextActive: { color: Colors.primary },
  todayAction: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.primary },
  noticeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.warningLight },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  walletList: { borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surface },
  walletRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  walletRowActive: { backgroundColor: Colors.primaryLight },
  walletIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  walletIconActive: { backgroundColor: 'rgba(0, 113, 227, 0.10)' },
  walletCopy: { flex: 1, minWidth: 0 },
  walletName: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  walletBalance: { marginTop: 3, fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 8 : 14, backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#CBD5E1' },
  footerSummary: { flex: 1, minWidth: 0 },
  footerLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  footerAmount: { marginTop: 1, fontSize: 20, lineHeight: 24, fontFamily: Typography.fontFamily.extrabold, color: Colors.textPrimary, letterSpacing: -0.45 },
  footerMeta: { marginTop: 1, fontSize: 10, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  submitBtn: { minWidth: 174, paddingHorizontal: 16 },
});
