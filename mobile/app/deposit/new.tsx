/**
 * TrọCare Mobile — Create Deposit Screen
 * Form fields:
 * - Vacant Room selection
 * - Tenant details (name, phone)
 * - Deposit amount & date
 * - Target wallet (to log income balance)
 * - Internal notes
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import { loadRentalRooms, loadWallets, createDeposit, formatMoney } from '@/lib/rentalOps';

export default function NewDepositScreen() {
  const router = useRouter();
  const { room_id, facility_id } = useLocalSearchParams<{ room_id?: string; facility_id?: string }>();

  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

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
        } else if (vacantRooms.length > 0) {
          setSelectedRoom(vacantRooms[0]);
          setForm((prev) => ({ ...prev, amount: String(vacantRooms[0].price ? Math.round(vacantRooms[0].price / 2) : '') }));
        }

        setWallets(walletsList);
        if (walletsList.length > 0) {
          setSelectedWalletId(walletsList[0].id);
        }

        // Set default deposit date as today
        setForm((prev) => ({ ...prev, depositDate: formatDate(new Date()) }));
      } catch (e: any) {
        showToast(e?.message || 'Không tải được danh mục phòng.', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [room_id, facility_id]);

  const handleSubmit = async () => {
    if (!selectedRoom) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn phòng để cọc.');
      return;
    }

    if (!form.tenantName.trim()) {
      Alert.alert('Thiếu thông tin', 'Họ tên khách cọc không được để trống.');
      return;
    }

    if (form.tenantPhone && form.tenantPhone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Thông tin không hợp lệ', 'Số điện thoại khách cọc phải có đúng 10 chữ số.');
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      Alert.alert('Thông tin không hợp lệ', 'Số tiền cọc giữ phòng phải lớn hơn 0.');
      return;
    }

    if (!form.depositDate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày nhận tiền cọc.');
      return;
    }

    try {
      setSubmitting(true);
      showToast('Đang tạo phiếu đặt cọc giữ phòng...', 'success');

      await createDeposit({
        roomId: selectedRoom.id,
        tenantName: form.tenantName.trim(),
        tenantPhone: form.tenantPhone.trim() || undefined,
        amount: Number(form.amount),
        depositDate: form.depositDate,
        note: form.note.trim() || undefined,
        walletId: selectedWalletId || undefined,
      });

      showToast('Ghi nhận đặt cọc giữ phòng thành công!', 'success');
      router.replace('/deposit' as any);
    } catch (e: any) {
      Alert.alert('Lỗi tạo đặt cọc', e?.message || 'Không thể tạo phiếu cọc giữ phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải danh mục cho thuê...</Text>
      </View>
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
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <View style={styles.heroPanel}>
          <Text style={styles.eyebrow}>Đặt cọc giữ phòng</Text>
          <Text style={styles.heroTitle}>Ghi nhận khách đã cọc, phòng tự chuyển sang đã giữ.</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaLabel}>Phòng</Text>
              <Text style={styles.heroMetaValue}>{selectedRoom?.name || 'Chưa chọn'}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaLabel}>Tiền cọc</Text>
              <Text style={styles.heroMetaValue}>{amountNumber > 0 ? formatMoney(amountNumber) : 'Chưa nhập'}</Text>
            </View>
          </View>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Phòng nhận cọc</Text>
          {rooms.length === 0 ? (
            <Text style={styles.emptyText}>Không còn phòng trống nào khả dụng để nhận cọc.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {rooms.map((r) => {
                const isSelected = selectedRoom?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedRoom(r);
                      setForm((prev) => ({ ...prev, amount: String(r.price ? Math.round(r.price / 2) : '') }));
                    }}
                  >
                    <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                      {r.name} · {formatMoney(r.price)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Khách đặt cọc</Text>
          <Input
            label="Họ tên khách"
            placeholder="Ví dụ: Nguyễn Văn A"
            required
            value={form.tenantName}
            onChangeText={(v) => setForm({ ...form, tenantName: v })}
          />
          <View style={{ height: 12 }} />

          <Input
            label="Số điện thoại"
            placeholder="Nhập 10 số"
            keyboardType="phone-pad"
            maxLength={10}
            value={form.tenantPhone}
            onChangeText={setPhoneDigits}
            hint="Không bắt buộc, nhưng nên nhập để dễ tìm lại khi ký hợp đồng."
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Tiền và ngày nhận cọc</Text>

          <Input
            label="Số tiền cọc"
            keyboardType="numeric"
            required
            value={form.amount}
            onChangeText={setAmountDigits}
          />
          {suggestedAmounts.length > 0 && (
            <View style={styles.quickAmountRow}>
              {suggestedAmounts.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.quickAmount, amountNumber === value && styles.quickAmountActive]}
                  onPress={() => setAmountDigits(String(value))}
                >
                  <Text style={[styles.quickAmountText, amountNumber === value && styles.quickAmountTextActive]}>
                    {formatMoney(value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ height: 12 }} />

          <Input
            label="Ngày nhận cọc"
            placeholder="Ví dụ: 2026-05-21"
            required
            value={form.depositDate}
            onChangeText={(v) => setForm({ ...form, depositDate: v })}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Ví nhận tiền</Text>
          {wallets.length === 0 ? (
            <View style={styles.noticeBox}>
              <Ionicons name="wallet-outline" size={18} color={Colors.warning} />
              <Text style={styles.noticeText}>Chưa có ví. Phiếu cọc vẫn được tạo, nhưng chưa ghi vào sổ quỹ.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {wallets.map((w) => {
                const isSelected = selectedWalletId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => setSelectedWalletId(w.id)}
                  >
                    <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                      {w.name} ({formatMoney(w.balance)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Ghi chú nội bộ</Text>
          <Input
            placeholder="Ví dụ: Khách hẹn 1 tuần sau dọn vào ký hợp đồng..."
            value={form.note}
            onChangeText={(v) => setForm({ ...form, note: v })}
            multiline
            numberOfLines={3}
          />
        </Card>

        <View style={styles.reviewPanel}>
          <Text style={styles.reviewTitle}>Kiểm tra trước khi ghi nhận</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Phòng</Text>
            <Text style={styles.reviewValue}>{selectedRoom?.name || 'Chưa chọn'}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Khách</Text>
            <Text style={styles.reviewValue}>{form.tenantName.trim() || 'Chưa nhập'}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Tiền cọc</Text>
            <Text style={styles.reviewValue}>{amountNumber > 0 ? formatMoney(amountNumber) : 'Chưa nhập'}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Vào ví</Text>
            <Text style={styles.reviewValue}>{selectedWallet?.name || 'Không ghi sổ quỹ'}</Text>
          </View>
        </View>

        <Button
          title={submitting ? 'Đang ghi nhận...' : 'Xác nhận giữ phòng'}
          variant="primary"
          onPress={handleSubmit}
          disabled={submitting || rooms.length === 0}
          style={styles.submitBtn}
          icon={submitting ? <ActivityIndicator size="small" color="#fff" /> : undefined}
        />
      </ScrollView>

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
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  heroPanel: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  eyebrow: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0 },
  heroTitle: { marginTop: 6, fontSize: 20, lineHeight: 26, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: 0 },
  heroMetaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroMetaItem: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Colors.borderLight },
  heroMetaLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  heroMetaValue: { marginTop: 4, fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  card: { padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  sectionHeader: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 12, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 10 },
  pickerRow: { flexDirection: 'row', gap: 8 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent', marginRight: 8 },
  pickerItemActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  pickerText: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  pickerTextActive: { color: Colors.primary },
  quickAmountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAmount: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Colors.borderLight },
  quickAmountActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  quickAmountText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  quickAmountTextActive: { color: Colors.primary },
  noticeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.warningLight },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  reviewPanel: { padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Colors.borderLight },
  reviewTitle: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 10 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 12 },
  reviewLabel: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  reviewValue: { flex: 1, textAlign: 'right', fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  submitBtn: { marginVertical: 10, paddingVertical: 14 },
});
