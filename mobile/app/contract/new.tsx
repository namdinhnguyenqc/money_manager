/**
 * TrọCare Mobile — Create Contract Screen
 * Form fields:
 * - Room Selection (loads vacant rooms)
 * - Tenant Info (Name, Phone, CCCD, Email, Address)
 * - Contract details (Start date, duration, rent, deposit, billing day, occupant count)
 * - Service checklist (loads services from API)
 * - Initial meter readings (electricity, water)
 * - Wallet selector for deposit
 * Two-stage creation: Create Tenant → Create Contract.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useAppToast } from '@/components/ui/ToastProvider';
import { CardSkeleton } from '@/components/ui/Skeleton';
import {
  loadRentalRooms,
  loadServiceConfigs,
  loadWallets,
  createTenant,
  createContract,
  formatMoney,
  loadTenants,
  RentalValidationError,
} from '@/lib/rentalOps';

export default function NewContractScreen() {
  const router = useRouter();
  const { showToast, showError } = useAppToast();
  const { room_id, facility_id, tenant_name, tenant_phone } = useLocalSearchParams<{
    room_id?: string;
    facility_id?: string;
    tenant_name?: string;
    tenant_phone?: string;
  }>();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  
  // Selection States
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  // Form inputs
  const [tenantForm, setTenantForm] = useState({
    name: '',
    phone: '',
    idCard: '',
    email: '',
    address: '',
  });

  const [contractForm, setContractForm] = useState({
    startDate: '',
    endDate: '',
    deposit: '',
    rentAmount: '',
    billingDay: '5',
    electricStart: '0',
    waterStart: '0',
    occupantCount: '1',
    note: '',
  });


  // Initialize
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [roomsList, servicesList, walletsList] = await Promise.all([
          loadRentalRooms(facility_id),
          loadServiceConfigs(true),
          loadWallets(),
        ]);

        // 1. Set services & wallets
        setServices(servicesList);
        setWallets(walletsList);
        if (walletsList.length > 0) {
          setSelectedWalletId(walletsList[0].id);
        }

        // 2. Set rooms and pre-select room if provided
        const vacantRooms = roomsList.filter((r) => r.status === 'vacant' || String(r.id) === String(room_id));
        setRooms(vacantRooms);

        let activeRoom = null;
        if (room_id) {
          activeRoom = vacantRooms.find((r) => String(r.id) === String(room_id));
        } else if (vacantRooms.length > 0) {
          activeRoom = vacantRooms[0];
        }

        if (activeRoom) {
          setSelectedRoom(activeRoom);
          setContractForm((prev) => ({
            ...prev,
            rentAmount: String(activeRoom.price || ''),
          }));
        }

        // 3. Set default dates
        const today = new Date();
        const startStr = formatDate(today);
        
        // Default 6 months duration
        const end = new Date(today);
        end.setMonth(end.getMonth() + 6);
        const endStr = formatDate(end);

        setContractForm((prev) => ({
          ...prev,
          startDate: startStr,
          endDate: endStr,
        }));

        // Select all services by default
        setSelectedServiceIds(servicesList.map((s) => s.id));

      } catch (e: any) {
        showToast(e?.message || 'Không tải được danh mục khởi tạo.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [room_id, facility_id]);

  useEffect(() => {
    setTenantForm((prev) => ({
      ...prev,
      name: tenant_name ? String(tenant_name) : prev.name,
      phone: tenant_phone ? String(tenant_phone).replace(/\D/g, '').slice(0, 10) : prev.phone,
    }));
  }, [tenant_name, tenant_phone]);

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Quick duration selection helper
  const setDuration = (months: number) => {
    const start = contractForm.startDate ? new Date(contractForm.startDate) : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    setContractForm({ ...contractForm, endDate: formatDate(end) });
  };

  const handleRoomChange = (room: any) => {
    setSelectedRoom(room);
    setContractForm((prev) => ({
      ...prev,
      rentAmount: String(room.price || ''),
    }));
  };

  const toggleService = (id: string) => {
    if (selectedServiceIds.includes(id)) {
      setSelectedServiceIds(selectedServiceIds.filter((sId) => sId !== id));
    } else {
      setSelectedServiceIds([...selectedServiceIds, id]);
    }
  };

  const parseIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parts = value.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    if (Number.isNaN(date.getTime())) return null;
    return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : null;
  };

  const handleSubmit = async () => {
    if (!selectedRoom) {
      showError('Vui lòng chọn phòng cần cho thuê.', 'Thiếu thông tin');
      return;
    }

    if (!tenantForm.name.trim()) {
      showError('Họ tên khách thuê không được để trống.', 'Thiếu thông tin');
      return;
    }

    if (tenantForm.phone.replace(/\D/g, '').length !== 10) {
      showError('Số điện thoại khách thuê phải có đúng 10 chữ số.', 'Thông tin không hợp lệ');
      return;
    }

    try {
      const tenants = await loadTenants();
      const inputPhone = tenantForm.phone.replace(/\D/g, '');
      const duplicate = (tenants || []).find(t => (t.phone || '').replace(/\D/g, '') === inputPhone);
      if (duplicate) {
        showError('Số điện thoại này đã được sử dụng cho người thuê khác. Vui lòng kiểm tra lại.', 'Trùng số điện thoại');
        return;
      }
    } catch (e) {
      // Continue silently if DB call fails, backend will check it anyway
    }

    const cleanIdCard = tenantForm.idCard.replace(/\D/g, '');
    if (cleanIdCard && cleanIdCard.length !== 12) {
      showError('CCCD phải có đúng 12 chữ số.', 'Thông tin không hợp lệ');
      return;
    }

    if (!contractForm.startDate || !contractForm.endDate) {
      showError('Vui lòng nhập ngày bắt đầu và kết thúc hợp đồng.', 'Thiếu thông tin');
      return;
    }
    const startDate = parseIsoDate(contractForm.startDate);
    const endDate = parseIsoDate(contractForm.endDate);
    if (!startDate || !endDate) {
      showError('Ngày bắt đầu và ngày kết thúc phải có định dạng YYYY-MM-DD hợp lệ.', 'Ngày hợp đồng không hợp lệ');
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      showError('Ngày kết thúc phải sau ngày bắt đầu.', 'Ngày hợp đồng không hợp lệ');
      return;
    }

    const rentAmount = Number(contractForm.rentAmount || selectedRoom.price || 0);
    const depositAmount = Number(contractForm.deposit || 0);
    const billingDay = Number(contractForm.billingDay || 5);
    const electricStart = Number(contractForm.electricStart || 0);
    const waterStart = Number(contractForm.waterStart || 0);
    const occupantCount = Number(contractForm.occupantCount || 1);

    if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
      showError('Tiền thuê phòng phải lớn hơn 0.', 'Giá thuê không hợp lệ');
      return;
    }
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      showError('Tiền cọc không được âm.', 'Tiền cọc không hợp lệ');
      return;
    }
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) {
      showError('Ngày chốt tiền phải nằm trong khoảng 1 đến 28.', 'Ngày chốt tiền không hợp lệ');
      return;
    }
    if (!Number.isFinite(electricStart) || electricStart < 0 || !Number.isFinite(waterStart) || waterStart < 0) {
      showError('Chỉ số điện/nước ban đầu không được âm.', 'Chỉ số công tơ không hợp lệ');
      return;
    }
    if (!Number.isInteger(occupantCount) || occupantCount <= 0) {
      showError('Số người ở phải lớn hơn 0.', 'Số người không hợp lệ');
      return;
    }

    try {
      setSubmitting(true);
      
      // Step 1: Create Tenant
      showToast('Đang tạo hồ sơ khách thuê…', 'info', 'Đang xử lý');
      const tenant = await createTenant({
        name: tenantForm.name,
        phone: tenantForm.phone,
        idCard: tenantForm.idCard,
        email: tenantForm.email || undefined,
        address: tenantForm.address || undefined,
      });

      if (!tenant?.id) {
        throw new Error('Tạo hồ sơ khách thuê thất bại.');
      }

      // Step 2: Create Contract
      showToast('Đang thiết lập hợp đồng thuê…', 'info', 'Đang xử lý');
      const contract = await createContract({
        roomId: selectedRoom.id,
        tenantId: tenant.id,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        deposit: depositAmount,
        rentAmount,
        billingDay,
        electricStart,
        waterStart,
        occupantCount,
        note: contractForm.note || undefined,
        serviceIds: selectedServiceIds,
        walletId: selectedWalletId || undefined,
      });

      showToast('Tạo hợp đồng thành công!', 'success');
      router.replace(`/contract/${contract.id}`);

    } catch (e: any) {
      if (e instanceof RentalValidationError) {
        const msg = Object.values(e.fieldErrors).join('\n');
        showError(msg, 'Lỗi nhập liệu');
      } else {
        showError(e?.message || 'Không tạo được hợp đồng.', 'Tạo hợp đồng chưa thành công');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer} accessibilityLabel="Đang chuẩn bị hợp đồng">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo hợp đồng</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        
        {/* Room Picker */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>1. Chọn phòng cho thuê</Text>
          {rooms.length === 0 ? (
            <Text style={styles.emptyText}>Không còn phòng trống nào khả dụng.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {rooms.map((r) => {
                const isSelected = selectedRoom?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => handleRoomChange(r)}
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

        {/* Tenant Information Form */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>2. Thông tin khách thuê</Text>
          
          <Input
            label="Họ và tên khách thuê *"
            placeholder="Ví dụ: Nguyễn Văn A"
            value={tenantForm.name}
            onChangeText={(v) => setTenantForm({ ...tenantForm, name: v })}
          />
          <View style={{ height: 10 }} />
          
          <Input
            label="Số điện thoại *"
            placeholder="Nhập đúng 10 số"
            keyboardType="phone-pad"
            maxLength={10}
            value={tenantForm.phone}
            onChangeText={(v) => setTenantForm({ ...tenantForm, phone: v })}
          />
          <View style={{ height: 10 }} />
          
          <Input
            label="Số CCCD / Hộ chiếu (không bắt buộc)"
            placeholder="Nhập đúng 12 số"
            keyboardType="number-pad"
            maxLength={12}
            value={tenantForm.idCard}
            onChangeText={(v) => setTenantForm({ ...tenantForm, idCard: v })}
          />
          <View style={{ height: 10 }} />

          <Input
            label="Địa chỉ email (không bắt buộc)"
            placeholder="khachthue@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={tenantForm.email}
            onChangeText={(v) => setTenantForm({ ...tenantForm, email: v })}
          />
          <View style={{ height: 10 }} />

          <Input
            label="Quê quán / Hộ khẩu (không bắt buộc)"
            placeholder="Quận 1, TP. Hồ Chí Minh"
            value={tenantForm.address}
            onChangeText={(v) => setTenantForm({ ...tenantForm, address: v })}
          />
        </Card>

        {/* Contract Specifics */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>3. Thiết lập hợp đồng</Text>

          <Input
            label="Ngày bắt đầu (YYYY-MM-DD) *"
            placeholder="Ví dụ: 2026-05-21"
            value={contractForm.startDate}
            onChangeText={(v) => setContractForm({ ...contractForm, startDate: v })}
          />
          <View style={{ height: 10 }} />

          <Input
            label="Ngày hết hạn (YYYY-MM-DD) *"
            placeholder="Ví dụ: 2026-11-21"
            value={contractForm.endDate}
            onChangeText={(v) => setContractForm({ ...contractForm, endDate: v })}
          />
          
          {/* Quick duration selection */}
          <View style={styles.durationRow}>
            <TouchableOpacity style={styles.durationChip} onPress={() => setDuration(3)}>
              <Text style={styles.durationChipText}>3 tháng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.durationChip} onPress={() => setDuration(6)}>
              <Text style={styles.durationChipText}>6 tháng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.durationChip} onPress={() => setDuration(12)}>
              <Text style={styles.durationChipText}>1 năm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.durationChip} onPress={() => setDuration(24)}>
              <Text style={styles.durationChipText}>2 năm</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 10 }} />

          <Input
            label="Giá thuê hàng tháng (₫) *"
            keyboardType="numeric"
            value={contractForm.rentAmount}
            onChangeText={(v) => setContractForm({ ...contractForm, rentAmount: v })}
          />
          <View style={{ height: 10 }} />

          <Input
            label="Tiền đặt cọc (₫)"
            placeholder="Mặc định là 0"
            keyboardType="numeric"
            value={contractForm.deposit}
            onChangeText={(v) => setContractForm({ ...contractForm, deposit: v })}
          />
          <View style={{ height: 10 }} />

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Ngày chốt tiền hàng tháng"
                placeholder="Từ 1 đến 28"
                keyboardType="numeric"
                value={contractForm.billingDay}
                onChangeText={(v) => setContractForm({ ...contractForm, billingDay: v })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Số lượng khách ở"
                placeholder="Ví dụ: 2"
                keyboardType="numeric"
                value={contractForm.occupantCount}
                onChangeText={(v) => setContractForm({ ...contractForm, occupantCount: v })}
              />
            </View>
          </View>
        </Card>

        {/* Initial Meter Readings */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>4. Chỉ số công tơ ban đầu</Text>
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Chỉ số điện đầu kì (kWh)"
                keyboardType="numeric"
                value={contractForm.electricStart}
                onChangeText={(v) => setContractForm({ ...contractForm, electricStart: v })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Chỉ số nước đầu kì (m³)"
                keyboardType="numeric"
                value={contractForm.waterStart}
                onChangeText={(v) => setContractForm({ ...contractForm, waterStart: v })}
              />
            </View>
          </View>
        </Card>

        {/* Services Checklist */}
        {services.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionHeader}>5. Áp dụng dịch vụ tiện ích</Text>
            <View style={styles.servicesGrid}>
              {services.map((s) => {
                const isSelected = selectedServiceIds.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.serviceChip, isSelected && styles.serviceChipActive]}
                    onPress={() => toggleService(s.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isSelected ? Colors.primary : Colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.serviceChipText, isSelected && styles.serviceChipTextActive]}>
                        {s.name}
                      </Text>
                      <Text style={styles.servicePriceText}>
                        {formatMoney(s.unit_price)}
                        {s.type === 'per_person'
                          ? '/người'
                          : s.type === 'per_room'
                          ? '/phòng'
                          : s.type === 'metered' || s.type === 'meter'
                          ? '/số'
                          : '/tháng'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Deposit Wallet Selector if deposit is specified */}
        {Number(contractForm.deposit || 0) > 0 && wallets.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionHeader}>6. Ví nhận tiền đặt cọc</Text>
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
          </Card>
        )}

        {/* Notes */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Ghi chú nội bộ</Text>
          <Input
            value={contractForm.note}
            onChangeText={(v) => setContractForm({ ...contractForm, note: v })}
            placeholder="Ví dụ: Đóng cọc đủ ngày dọn vào, không nuôi chó mèo..."
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Submit */}
        <Button
          title={submitting ? 'Đang tạo hợp đồng...' : 'Tạo hợp đồng mới'}
          variant="primary"
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitBtn}
          icon={submitting ? <ActivityIndicator size="small" color="#fff" /> : undefined}
        />
      </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  loadingContainer: { flex: 1, padding: 16, gap: 14, backgroundColor: Colors.background },
  card: { padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  sectionHeader: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 12, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 10 },
  pickerRow: { flexDirection: 'row', gap: 8 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent', marginRight: 8 },
  pickerItemActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  pickerText: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  pickerTextActive: { color: Colors.primary },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  durationChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: Colors.border },
  durationChipText: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  inputRow: { flexDirection: 'row', gap: 12 },
  servicesGrid: { gap: 10 },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 10,
  },
  serviceChipActive: {
    backgroundColor: Colors.primaryLight + '10',
    borderColor: Colors.primary + '50',
  },
  serviceChipText: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  serviceChipTextActive: { color: Colors.primary },
  servicePriceText: { fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  submitBtn: { marginVertical: 10, paddingVertical: 14 },
});
