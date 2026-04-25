import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SHADOW } from '../theme';
import { stripToDigits, calculateProratedRent, getCurrentMonthYear, formatCurrency } from '../utils/format';
import {
  getContractServices,
  getLatestMeterReadings,
  getPreviousDebt,
  createInvoice,
  updateInvoice,
  getInvoiceDetails,
} from '../database/queries';

const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const hasAnyKeyword = (value, keywords) => {
  const normalized = normalizeText(value);
  return keywords.some((keyword) => normalized.includes(keyword));
};

export default function CreateInvoiceSheet({ visible, room, editingInvoice = null, onClose, onSaveSuccessful }) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [meterInputs, setMeterInputs] = useState({});
  const [checkoutDate, setCheckoutDate] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  const { month, year } = getCurrentMonthYear();

  useEffect(() => {
    if (visible && room?.contract_id) {
      loadContractData();
    }
  }, [visible, room]);

  const loadContractData = async () => {
    setLoading(true);
    try {
      const svcs = await getContractServices(room.contract_id);
      setServices(svcs);

      const prev = await getLatestMeterReadings(room.id);
      const initialInputs = {};
      const metered = svcs.filter(
        (service) => service.type === 'metered' || service.type === 'meter'
      );
      
      if (editingInvoice) {
        metered.forEach((service) => {
          const isElec = hasAnyKeyword(service.name, ['dien', 'electric']);
          const isWater = hasAnyKeyword(service.name, ['nuoc', 'water']);
          if (isElec) {
            initialInputs[`${service.id}_old`] = String(editingInvoice.elec_old || 0);
            initialInputs[`${service.id}_new`] = String(editingInvoice.elec_new || 0);
          } else if (isWater) {
            initialInputs[`${service.id}_old`] = String(editingInvoice.water_old || 0);
            initialInputs[`${service.id}_new`] = String(editingInvoice.water_new || 0);
          }
        });
        setInvoiceNote(editingInvoice.invoice_note || '');
      } else if (prev) {
        metered.forEach((service) => {
          const isElec = hasAnyKeyword(service.name, ['dien', 'electric']);
          const isWater = hasAnyKeyword(service.name, ['nuoc', 'water']);
          if (isElec) {
            initialInputs[`${service.id}_old`] = String(prev.elec_new || prev.elec_old || 0);
          } else if (isWater) {
            initialInputs[`${service.id}_old`] = String(prev.water_new || prev.water_old || 0);
          }
        });
      }
      setMeterInputs(initialInputs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const items = [];
      let elecOld = 0;
      let elecNew = 0;
      let waterOld = 0;
      let waterNew = 0;

      for (const service of services) {
        const serviceNameNorm = normalizeText(service.name);
        const isElectricity = hasAnyKeyword(serviceNameNorm, ['dien', 'electric']);
        const isWater = hasAnyKeyword(serviceNameNorm, ['nuoc', 'water']);

        if (isWater && service.type !== 'metered' && service.type !== 'meter') {
          const peopleCount = room.num_people || 1;
          items.push({
            name: service.name,
            detail: `Tính cho ${peopleCount} người`,
            amount: service.unit_price * peopleCount,
            serviceId: service.id,
          });
          continue;
        }

        if (service.type === 'fixed') {
          items.push({
            name: service.name,
            detail: 'Cố định',
            amount: service.unit_price,
            serviceId: service.id,
          });
          continue;
        }

        if (service.type === 'per_person') {
          const amount = service.unit_price * (room.num_people || 1);
          items.push({
            name: service.name,
            detail: `x${room.num_people || 1} người`,
            amount,
            serviceId: service.id,
          });
          continue;
        }

        if (service.type === 'metered' || service.type === 'meter') {
          const oldValue = parseInt(stripToDigits(meterInputs[`${service.id}_old`] || '0'), 10) || 0;
          const newValue = parseInt(stripToDigits(meterInputs[`${service.id}_new`] || '0'), 10) || 0;

          if (isElectricity) {
            elecOld = oldValue;
            elecNew = newValue;
          } else if (isWater) {
            waterOld = oldValue;
            waterNew = newValue;
          }

          if (newValue > 0 && newValue < oldValue) {
            Alert.alert('Lỗi chỉ số công tơ', `${service.name}: chỉ số mới không được nhỏ hơn chỉ số cũ.`);
            setLoading(false);
            return;
          }

          if (newValue > 0) {
            const used = newValue - oldValue;
            const unitPrice = room.has_ac && service.unit_price_ac > 0 ? service.unit_price_ac : service.unit_price;
            items.push({
              name: service.name,
              detail: `${oldValue} -> ${newValue} = ${used}${service.unit || ''}`,
              amount: used * unitPrice,
              serviceId: service.id,
            });
          }
        }
      }

      const proration = calculateProratedRent(
        room.price,
        month,
        year,
        room.contract_start_date,
        checkoutDate || null,
      );
      const debt = await getPreviousDebt(room.id, month, year);

      const payload = {
        roomId: room.id,
        contractId: room.contract_id,
        month: editingInvoice ? editingInvoice.month : month,
        year: editingInvoice ? editingInvoice.year : year,
        roomFee: proration.amount,
        items,
        previousDebt: debt,
        elecOld,
        elecNew,
        waterOld,
        waterNew,
        invoiceNote,
      };

      let invoiceId;
      if (editingInvoice) {
        invoiceId = await updateInvoice(editingInvoice.id, payload);
      } else {
        invoiceId = await createInvoice(payload);
      }

      const detail = await getInvoiceDetails(invoiceId);
      onSaveSuccessful(detail);
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', `Không thể tạo hóa đơn: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === 'web';
  const sheetWidth = width >= 1180 ? 620 : width >= 768 ? 560 : Math.min(width - 24, 520);
  const meteredServices = services.filter((service) => {
    return service.type === 'metered' || service.type === 'meter';
  });

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView style={[styles.sheetContainer, isWeb && styles.sheetContainerWeb]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, isWeb && styles.sheetWeb, { width: sheetWidth }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{editingInvoice ? `Sửa hóa đơn tháng ${editingInvoice.month}` : `Tạo hóa đơn tháng ${month}`}</Text>
                <Text style={styles.subtitle}>Phòng {room?.name} · {room?.tenant_name}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {loading && !services.length ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
              ) : (
                <View style={[styles.layoutGrid, isWeb && styles.layoutGridWeb]}>
                  <View style={styles.formColumn}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="speedometer-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.sectionTitle}>Chỉ số công tơ tháng này</Text>
                    </View>

                    {meteredServices.length === 0 ? (
                      <View style={styles.emptyMeterCard}>
                        <Text style={styles.emptyMeterText}>Hợp đồng này chưa có dịch vụ tính theo đồng hồ.</Text>
                      </View>
                    ) : meteredServices.map((service) => (
                      <View key={service.id} style={styles.meterCard}>
                        <View style={styles.meterTop}>
                          <Text style={styles.meterIcon}>{service.icon}</Text>
                          <Text style={styles.meterName}>{service.name}</Text>
                        </View>

                        <View style={styles.meterInputs}>
                          <View style={styles.meterBox}>
                            <Text style={styles.meterLabel}>Chỉ số cũ</Text>
                            <TextInput
                              style={styles.meterInput}
                              keyboardType="number-pad"
                              value={meterInputs[`${service.id}_old`]}
                              onChangeText={(value) => setMeterInputs((prev) => ({ ...prev, [`${service.id}_old`]: stripToDigits(value) }))}
                            />
                          </View>
                          <View style={styles.meterDivider} />
                          <View style={styles.meterBox}>
                            <Text style={styles.meterLabel}>Chỉ số mới</Text>
                            <TextInput
                              style={[styles.meterInput, { color: COLORS.primary }]}
                              keyboardType="number-pad"
                              placeholder="..."
                              autoFocus={hasAnyKeyword(service.name, ['dien', 'electric'])}
                              value={meterInputs[`${service.id}_new`]}
                              onChangeText={(value) => setMeterInputs((prev) => ({ ...prev, [`${service.id}_new`]: stripToDigits(value) }))}
                            />
                          </View>
                        </View>
                      </View>
                    ))}

                    <View style={styles.group}>
                      <Text style={styles.label}>Ngày trả phòng (tùy chọn)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={checkoutDate}
                        onChangeText={setCheckoutDate}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>

                    <View style={styles.group}>
                      <Text style={styles.label}>Ghi chú hóa đơn (tùy chọn)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ví dụ: Anh bớt 200k tiền trọ"
                        value={invoiceNote}
                        onChangeText={setInvoiceNote}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.summaryColumn}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryEyebrow}>TÓM TẮT HÓA ĐƠN</Text>
                      <Text style={styles.summaryRoom}>Phòng {room?.name || 'N/A'}</Text>
                      <Text style={styles.summaryText}>Người thuê: {room?.tenant_name || 'Không có dữ liệu'}</Text>
                      <Text style={styles.summaryText}>Tiền phòng: {formatCurrency(room?.price || 0)}</Text>
                      <Text style={styles.summaryText}>Công thức: tiền phòng + điện theo đồng hồ + nước theo đầu người + wifi/rác/dịch vụ cố định.</Text>
                      <Text style={styles.summaryText}>Số người ở hiện tại: {room?.num_people || 1}</Text>
                    </View>

                    <TouchableOpacity style={[styles.confirmBtn, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.confirmText}>{editingInvoice ? 'Cập nhật hóa đơn' : 'Xác nhận tạo hóa đơn'}</Text>
                          <Ionicons name="chevron-forward-circle" size={20} color="#fff" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  overlayWeb: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetContainer: { width: '100%', flex: 1, maxHeight: '88%', justifyContent: 'flex-end' },
  sheetContainerWeb: { maxHeight: '100%', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: COLORS.surfaceLowest,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    minHeight: 0,
    flexShrink: 1,
    ...SHADOW.lg,
  },
  sheetWeb: {
    maxHeight: '90%',
    borderRadius: 30,
  },
  scrollArea: { flexGrow: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { color: COLORS.textPrimary, fontSize: 20, ...FONTS.bold },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLow },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, ...FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.4 },
  layoutGrid: { gap: 16 },
  layoutGridWeb: { flexDirection: 'row', alignItems: 'flex-start' },
  formColumn: { flex: 1.1 },
  summaryColumn: { flex: 0.85, gap: 14 },
  meterCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    padding: 12,
    marginBottom: 10,
  },
  emptyMeterCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLow,
    padding: 14,
    marginBottom: 10,
  },
  emptyMeterText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, ...FONTS.medium },
  meterTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  meterIcon: { fontSize: 16 },
  meterName: { color: COLORS.textPrimary, ...FONTS.semibold, fontSize: 14 },
  meterInputs: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderSoft },
  meterBox: { flex: 1, alignItems: 'center' },
  meterLabel: { marginTop: 8, color: COLORS.textMuted, fontSize: 10, ...FONTS.semibold },
  meterInput: { width: '100%', textAlign: 'center', color: COLORS.textPrimary, ...FONTS.bold, fontSize: 20, paddingVertical: 8 },
  meterDivider: { width: 1, height: 34, backgroundColor: COLORS.border },
  group: { marginTop: 6, marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold, marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    ...FONTS.semibold,
  },
  summaryCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLow,
    padding: 16,
  },
  summaryEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  summaryRoom: { marginTop: 8, color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold },
  summaryText: { marginTop: 6, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  confirmBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  confirmText: { color: '#fff', ...FONTS.semibold, fontSize: 15 },
});
