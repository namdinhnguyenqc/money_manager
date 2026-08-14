/**
 * TrọCare Mobile — Create Invoice Screen
 * Allows creating a new invoice for a contract, including meter readings (electricity, water),
 * contract services, custom fees, and due date.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import MeterOcrAction from '@/components/invoice/MeterOcrAction';
import {
  loadContract,
  loadContracts,
  loadLatestMeterReadings,
  loadPreviousDebt,
  createInvoiceForContract,
  currentPeriod,
  formatMoney,
  describeServiceType,
  getServiceUnitLabel,
  loadServiceConfigs,
  calculateProratedRoomFee,
  getRoomFeeProration,
} from '@/lib/rentalOps';

const period = currentPeriod();

const isValidIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { contract_id } = useLocalSearchParams<{ contract_id?: string }>();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(contract_id || null);
  const [contract, setContract] = useState<any | null>(null);

  const [form, setForm] = useState({
    electricOld: '0',
    electricNew: '0',
    waterOld: '0',
    waterNew: '0',
    dueDate: '',
    note: '',
    previousDebt: '0',
  });

  const [fees, setFees] = useState<Array<{ name: string; amount: string }>>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 1. Fetch contracts if no contract_id is specified
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const services = await loadServiceConfigs(false);
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
                onPress: () => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/settings' as any);
                  }
                },
                style: 'cancel',
              },
            ]
          );
          setLoading(false);
          return;
        }

        const data = await loadContracts();
        const active = data.filter((c: any) => c.status === 'active' || c.status === 'expiring_soon');
        setContracts(active);

        if (contract_id) {
          await fetchContractDetail(contract_id);
        } else if (active.length > 0) {
          // Pre-select first contract if none provided
          setSelectedContractId(active[0].id);
          await fetchContractDetail(active[0].id);
        } else {
          setLoading(false);
        }
      } catch (e: any) {
        showToast(e?.message || 'Không tải được danh sách hợp đồng.', 'error');
        setLoading(false);
      }
    }
    init();
  }, [contract_id]);

  // Fetch contract detail and latest meter readings
  const fetchContractDetail = async (id: string) => {
    try {
      setLoading(true);
      const c = await loadContract(id);
      if (!c) {
        throw new Error('Không tìm thấy hợp đồng.');
      }
      setContract(c);

      // Pre-populate due date
      const billingDay = Math.min(28, Math.max(1, Number(c.billing_day || 5)));
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(billingDay).padStart(2, '0');
      setForm((prev) => ({
        ...prev,
        dueDate: `${year}-${month}-${day}`,
      }));

      // Fetch meter readings
      const [readings, previousDebt] = await Promise.all([
        loadLatestMeterReadings(c.room_id),
        loadPreviousDebt(c.room_id, period.month, period.year),
      ]);
      const hasAC = Boolean(c.has_ac);
      const services = c.applied_services_snapshot || [];

      const elecMetered = services.some(
        (s: any) => s.category === 'electricity' && (s.type === 'meter' || s.type === 'metered')
      );
      const waterMetered = services.some(
        (s: any) => s.category === 'water' && (s.type === 'meter' || s.type === 'metered')
      );

      setForm((prev) => ({
        ...prev,
        electricOld: elecMetered ? String(readings.elec_old || c.electric_start || 0) : '0',
        electricNew: elecMetered ? String(readings.elec_old || c.electric_start || 0) : '0',
        waterOld: waterMetered ? String(readings.water_old || c.water_start || 0) : '0',
        waterNew: waterMetered ? String(readings.water_old || c.water_start || 0) : '0',
        previousDebt: String(previousDebt || 0),
      }));
    } catch (e: any) {
      showToast(e?.message || 'Lỗi tải chi tiết hợp đồng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Select services config
  const appliedServices = contract?.applied_services_snapshot || [];

  // Pricing comes only from the contract's service snapshot. A "typical" rate
  // fallback here silently billed tenants at a price the owner never set, so an
  // unconfigured utility now bills 0 and the screen says so explicitly.
  const electricityFromContract = appliedServices.find((s: any) => s.category === 'electricity');
  const waterFromContract = appliedServices.find((s: any) => s.category === 'water');

  const electricityConfigured = Boolean(electricityFromContract);
  const waterConfigured = Boolean(waterFromContract);

  const electricityService = electricityFromContract || {
    service_id: '0',
    name: 'Tiền điện',
    category: 'electricity',
    type: 'metered',
    applied_unit_price: 0,
    amount: null,
  };

  const waterService = waterFromContract || {
    service_id: '0',
    name: 'Tiền nước',
    category: 'water',
    type: 'metered',
    applied_unit_price: 0,
    amount: null,
  };

  const otherServices = appliedServices.filter(
    (s: any) => s.category !== 'electricity' && s.category !== 'water'
  );

  const electricityIsMetered = ['meter', 'metered'].includes(String(electricityService.type).toLowerCase());
  const waterIsMetered = ['meter', 'metered'].includes(String(waterService.type).toLowerCase());

  // Dynamic calculations
  const computed = useMemo(() => {
    if (!contract) return { electricUsed: 0, waterUsed: 0, electricAmount: 0, waterAmount: 0, serviceAmount: 0, otherAmount: 0, previousDebt: 0, rent: 0, total: 0 };

    const electricOldVal = Number(form.electricOld || 0);
    const electricNewVal = Number(form.electricNew || 0);
    const electricUsed = Math.max(0, electricNewVal - electricOldVal);

    const waterOldVal = Number(form.waterOld || 0);
    const waterNewVal = Number(form.waterNew || 0);
    const waterUsed = Math.max(0, waterNewVal - waterOldVal);

    const occupantCount = Number(contract.occupant_count || 1);

    const electricAmount = electricityService
      ? ['meter', 'metered'].includes(String(electricityService.type).toLowerCase())
        ? electricUsed * Number(electricityService.applied_unit_price || 0)
        : String(electricityService.type).toLowerCase() === 'per_person'
        ? occupantCount * Number(electricityService.applied_unit_price || 0)
        : Number(electricityService.amount || electricityService.applied_unit_price || 0)
      : 0;

    const waterAmount = waterService
      ? ['meter', 'metered'].includes(String(waterService.type).toLowerCase())
        ? waterUsed * Number(waterService.applied_unit_price || 0)
        : String(waterService.type).toLowerCase() === 'per_person'
        ? occupantCount * Number(waterService.applied_unit_price || 0)
        : Number(waterService.amount || waterService.applied_unit_price || 0)
      : 0;

    const serviceAmount = otherServices.reduce((sum: number, s: any) => {
      const type = String(s.type || '').toLowerCase();
      const amount = type === 'per_person'
        ? occupantCount * Number(s.applied_unit_price || 0)
        : Number(s.amount || s.applied_unit_price || 0);
      return sum + amount;
    }, 0);

    const otherAmount = fees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
    const previousDebt = Math.max(0, Number(form.previousDebt || 0));
    const rent = calculateProratedRoomFee(
      Number(contract.rent_amount || 0),
      contract.start_date,
      period.month,
      period.year,
    );

    return {
      electricUsed,
      waterUsed,
      electricAmount,
      waterAmount,
      serviceAmount,
      otherAmount,
      previousDebt,
      rent,
      total: rent + electricAmount + waterAmount + serviceAmount + otherAmount + previousDebt,
    };
  }, [contract, form.electricOld, form.electricNew, form.waterOld, form.waterNew, form.previousDebt, fees, electricityService, waterService, otherServices]);

  const handleSubmit = async () => {
    if (!contract) {
      Alert.alert('Lỗi', 'Vui lòng chọn một hợp đồng.');
      return;
    }

    if (electricityIsMetered && Number(form.electricNew) < Number(form.electricOld)) {
      Alert.alert('Chỉ số điện lỗi', 'Chỉ số điện mới không được nhỏ hơn chỉ số cũ.');
      return;
    }

    if (waterIsMetered && Number(form.waterNew) < Number(form.waterOld)) {
      Alert.alert('Chỉ số nước lỗi', 'Chỉ số nước mới không được nhỏ hơn chỉ số cũ.');
      return;
    }

    if (!isValidIsoDate(form.dueDate)) {
      Alert.alert('Ngày chưa hợp lệ', 'Hạn thanh toán cần có định dạng YYYY-MM-DD, ví dụ 2026-07-25.');
      return;
    }

    try {
      setSubmitting(true);
      const invoice = await createInvoiceForContract(contract, {
        month: period.month,
        year: period.year,
        roomFee: computed.rent,
        previousDebt: computed.previousDebt,
        electricOld: electricityIsMetered ? Number(form.electricOld || 0) : 0,
        electricNew: electricityIsMetered ? Number(form.electricNew || 0) : 0,
        waterOld: waterIsMetered ? Number(form.waterOld || 0) : 0,
        waterNew: waterIsMetered ? Number(form.waterNew || 0) : 0,
        dueDate: form.dueDate,
        note: form.note.trim() || undefined,
        items: fees.filter((f) => f.name.trim()).map((f) => ({ name: f.name.trim(), amount: Number(f.amount || 0) })),
      });

      showToast('Tạo hóa đơn thành công!', 'success');
      router.replace(`/invoice/${invoice.id}`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tạo được hóa đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const roomFeeProration = contract
    ? getRoomFeeProration(contract.start_date, period.month, period.year)
    : null;

  const handleContractChange = (id: string) => {
    setSelectedContractId(id);
    fetchContractDetail(id);
  };

  const addFeeField = () => {
    setFees([...fees, { name: '', amount: '' }]);
  };

  const removeFeeField = (index: number) => {
    setFees(fees.filter((_, i) => i !== index));
  };

  const updateFee = (index: number, key: 'name' | 'amount', val: string) => {
    setFees(
      fees.map((f, i) => (i === index ? { ...f, [key]: val } : f))
    );
  };

  if (loading && !contract) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết hợp đồng...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tạo hóa đơn',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {contract && (!electricityConfigured || !waterConfigured) && (
          <Card style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              Hợp đồng chưa áp dụng dịch vụ{' '}
              {!electricityConfigured && !waterConfigured
                ? 'điện và nước'
                : !electricityConfigured
                  ? 'điện'
                  : 'nước'}
            </Text>
            <Text style={styles.warningBody}>
              Đơn giá đang để 0 đ vì chưa có cấu hình — hệ thống không tự đặt giá thay bạn. Hãy tạo
              dịch vụ rồi cập nhật hợp đồng để hóa đơn tính đúng.
            </Text>
          </Card>
        )}

        {/* Contract Picker if none specified */}
        {contracts.length > 1 && !contract_id && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Chọn hợp đồng</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {contracts.map((c) => {
                const isSelected = selectedContractId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => handleContractChange(c.id)}
                  >
                    <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                      Phòng {c.room_name} · {c.tenant_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>
        )}

        {contract && (
          <>
            {/* Header info */}
            <Card style={styles.headerCard}>
              <View style={styles.headerInfo}>
                <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
                <View>
                  <Text style={styles.roomTitle}>Phòng {contract.room_name}</Text>
                  <Text style={styles.tenantSubtitle}>
                    Khách thuê: {contract.tenant_name} · T{period.month}/{period.year}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {roomFeeProration ? 'Tiền phòng tháng đầu' : 'Tiền phòng'}
                  </Text>
                  {roomFeeProration ? (
                    <Text style={styles.prorationHint}>
                      {roomFeeProration.billableDays}/{roomFeeProration.daysInMonth} ngày · từ {contract.start_date}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.infoValue}>{formatMoney(computed.rent)}</Text>
              </View>
            </Card>

            {/* Electricity Section */}
            {electricityService && (
              <Card style={styles.card}>
                <View style={styles.meterHeaderRow}>
                  <Text style={[styles.sectionHeader, styles.meterHeaderTitle]}>Điện</Text>
                  {electricityIsMetered ? (
                    <MeterOcrAction
                      meter="electricity"
                      previousValue={Number(form.electricOld || 0)}
                      onValueSuggested={(value) => setForm((current) => ({ ...current, electricNew: value }))}
                    />
                  ) : null}
                </View>
                {electricityIsMetered ? (
                  <View style={styles.meterContainer}>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Chỉ số đầu"
                          keyboardType="numeric"
                          value={form.electricOld}
                          onChangeText={(v) => setForm({ ...form, electricOld: v })}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Chỉ số cuối"
                          keyboardType="numeric"
                          value={form.electricNew}
                          onChangeText={(v) => setForm({ ...form, electricNew: v })}
                        />
                      </View>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcText}>
                        Số dùng: <Text style={styles.bold}>{computed.electricUsed} kWh</Text> ×{' '}
                        {formatMoney(electricityService.applied_unit_price)}/kWh
                      </Text>
                      <Text style={styles.calcAmount}>{formatMoney(computed.electricAmount)}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.flatRow}>
                    <View>
                      <Text style={styles.flatLabel}>{electricityService.name}</Text>
                      <Text style={styles.flatDesc}>
                        {describeServiceType(electricityService)} ·{' '}
                        {formatMoney(electricityService.applied_unit_price)}
                        {getServiceUnitLabel(electricityService)}
                      </Text>
                    </View>
                    <Text style={styles.flatAmount}>{formatMoney(computed.electricAmount)}</Text>
                  </View>
                )}
              </Card>
            )}

            {/* Water Section */}
            {waterService && (
              <Card style={styles.card}>
                <View style={styles.meterHeaderRow}>
                  <Text style={[styles.sectionHeader, styles.meterHeaderTitle]}>Nước</Text>
                  {waterIsMetered ? (
                    <MeterOcrAction
                      meter="water"
                      previousValue={Number(form.waterOld || 0)}
                      onValueSuggested={(value) => setForm((current) => ({ ...current, waterNew: value }))}
                    />
                  ) : null}
                </View>
                {waterIsMetered ? (
                  <View style={styles.meterContainer}>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Chỉ số đầu"
                          keyboardType="numeric"
                          value={form.waterOld}
                          onChangeText={(v) => setForm({ ...form, waterOld: v })}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Chỉ số cuối"
                          keyboardType="numeric"
                          value={form.waterNew}
                          onChangeText={(v) => setForm({ ...form, waterNew: v })}
                        />
                      </View>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcText}>
                        Số dùng: <Text style={styles.bold}>{computed.waterUsed} m³</Text> ×{' '}
                        {formatMoney(waterService.applied_unit_price)}/m³
                      </Text>
                      <Text style={styles.calcAmount}>{formatMoney(computed.waterAmount)}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.flatRow}>
                    <View>
                      <Text style={styles.flatLabel}>{waterService.name}</Text>
                      <Text style={styles.flatDesc}>
                        {describeServiceType(waterService)} ·{' '}
                        {formatMoney(waterService.applied_unit_price)}
                        {getServiceUnitLabel(waterService)}
                      </Text>
                    </View>
                    <Text style={styles.flatAmount}>{formatMoney(computed.waterAmount)}</Text>
                  </View>
                )}
              </Card>
            )}

            {/* Other Services Section */}
            {otherServices.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.sectionHeader}>Dịch vụ cố định</Text>
                <View style={styles.otherServicesList}>
                  {otherServices.map((s: any) => {
                    const isPerPerson = String(s.type).toLowerCase() === 'per_person';
                    const sPrice = Number(s.applied_unit_price || 0);
                    const sAmount = isPerPerson ? Number(contract.occupant_count || 1) * sPrice : Number(s.amount || sPrice);

                    return (
                      <View key={s.service_id} style={styles.serviceRow}>
                        <View>
                          <Text style={styles.serviceName}>{s.name}</Text>
                          <Text style={styles.serviceDesc}>
                            {isPerPerson
                              ? `${contract.occupant_count || 1} người × ${formatMoney(sPrice)}`
                              : `${formatMoney(sPrice)} / phòng`}
                          </Text>
                        </View>
                        <Text style={styles.serviceAmount}>{formatMoney(sAmount)}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Additional Fees */}
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>Chi phí khác</Text>
                <TouchableOpacity onPress={addFeeField} style={styles.addFeeButton} activeOpacity={0.7}>
                  <Ionicons name="add-circle" size={18} color={Colors.primary} />
                  <Text style={styles.addFeeText}>Thêm phí</Text>
                </TouchableOpacity>
              </View>

              {fees.length === 0 ? (
                <Text style={styles.emptyFeesText}>Không có chi phí phát sinh.</Text>
              ) : (
                <View style={styles.feesList}>
                  {fees.map((fee, index) => (
                    <View key={index} style={styles.feeFieldRow}>
                      <View style={{ flex: 1.5 }}>
                        <TextInput
                          placeholder="Tên chi phí"
                          value={fee.name}
                          onChangeText={(v) => updateFee(index, 'name', v)}
                          style={styles.feeInput}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          placeholder="Số tiền"
                          value={fee.amount}
                          onChangeText={(v) => updateFee(index, 'amount', v)}
                          keyboardType="numeric"
                          style={[styles.feeInput, styles.feeAmountInput]}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFeeField(index)}
                        style={styles.deleteFeeButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Bill Details & Settings */}
            <Card style={styles.card}>
              <Text style={styles.sectionHeader}>Thông tin hóa đơn</Text>
              {computed.previousDebt > 0 && (
                <View style={styles.previousDebtBox}>
                  <Text style={styles.previousDebtLabel}>Nợ kỳ trước</Text>
                  <Text style={styles.previousDebtValue}>{formatMoney(computed.previousDebt)}</Text>
                </View>
              )}
              <Input
                label="Hạn thanh toán (YYYY-MM-DD)"
                value={form.dueDate}
                onChangeText={(v) => setForm({ ...form, dueDate: v })}
                placeholder="Ví dụ: 2026-05-25"
              />
              <View style={{ height: 12 }} />
              <Input
                label="Ghi chú"
                value={form.note}
                onChangeText={(v) => setForm({ ...form, note: v })}
                placeholder="Ví dụ: Tiền điện nước tháng 5"
                multiline
                numberOfLines={3}
              />
            </Card>
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom Summary */}
      {contract && (
        <View style={styles.bottomBar}>
          <View style={styles.summaryContainer}>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>{formatMoney(computed.total)}</Text>
          </View>
          <Button
            title={submitting ? 'Đang tạo...' : 'Tạo hóa đơn'}
            variant="primary"
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
            icon={submitting ? <ActivityIndicator size="small" color="#fff" /> : undefined}
          />
        </View>
      )}

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
  scroll: { padding: 16, paddingBottom: 110, gap: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  card: { padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  cardTitle: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, marginBottom: 12 },
  warningCard: { padding: 16, backgroundColor: '#fffbeb', borderRadius: 16, borderWidth: 1, borderColor: '#fde68a' },
  warningTitle: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: '#78350f' },
  warningBody: { fontSize: 12, lineHeight: 18, fontFamily: Typography.fontFamily.regular, color: '#92400e', marginTop: 4 },
  headerCard: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.4 },
  tenantSubtitle: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e0f2fe', marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  prorationHint: { marginTop: 3, fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
  infoValue: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.primary },
  sectionHeader: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.3 },
  meterHeaderRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  meterHeaderTitle: { marginBottom: 0 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pickerRow: { flexDirection: 'row', gap: 8 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent', marginRight: 8 },
  pickerItemActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  pickerText: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  pickerTextActive: { color: Colors.primary },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  meterContainer: {},
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 10 },
  calcText: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  calcAmount: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  bold: { fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  flatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flatLabel: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  flatDesc: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  flatAmount: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  otherServicesList: { gap: 12 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.borderLight, paddingBottom: 10 },
  serviceName: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  serviceDesc: { fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  serviceAmount: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  addFeeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addFeeText: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
  emptyFeesText: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 8 },
  feesList: { gap: 10 },
  feeFieldRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  feeInput: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    backgroundColor: '#fff',
  },
  feeAmountInput: {
    fontFamily: Typography.fontFamily.semibold,
  },
  deleteFeeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previousDebtBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.status.maintenance.border,
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  previousDebtLabel: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  previousDebtValue: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.warning },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryContainer: { flex: 1 },
  totalLabel: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  totalValue: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.primary, marginTop: 2, letterSpacing: -0.5 },
  submitButton: { minWidth: 140 },
});
