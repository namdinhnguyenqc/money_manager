import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SHADOW } from '../theme';
import { toISODate, formatCurrency } from '../utils/format';
import { getServices, getContractServices } from '../database/queries';

export default function AddTenantContractSheet({ visible, room, onClose, onSave, editingContract }) {
  const { width } = useWindowDimensions();
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [deposit, setDeposit] = useState('');
  const [allServices, setAllServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    loadData();
  }, [visible]);

  const loadData = async () => {
    try {
      setLoading(true);
      const svcs = await getServices();
      setAllServices(svcs);

      if (editingContract) {
        setTenantName(editingContract.tenant_name || '');
        setPhone(editingContract.tenant_phone || '');
        setIdCard(editingContract.tenant_id_card || '');
        setAddress(editingContract.tenant_address || '');
        setStartDate(editingContract.start_date);
        setDeposit(String(editingContract.deposit || '0'));

        const mySvcs = await getContractServices(editingContract.contract_id);
        setSelectedServices(mySvcs.map((service) => service.id));
      } else {
        setTenantName('');
        setPhone('');
        setIdCard('');
        setAddress('');
        setStartDate(toISODate(new Date()));
        setDeposit('');
        setSelectedServices(svcs.map((service) => service.id));
      }
    } catch (e) {
      console.error('Load contract data error:', e);
      Alert.alert('Lỗi', `Không thể tải thông tin dịch vụ: ${e.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (id) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = () => {
    if (!tenantName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên người thuê');
      return;
    }
    const dep = parseFloat(deposit.replace(/[^0-9]/g, '') || '0');
    onSave({
      roomId: room?.id,
      tenantName: tenantName.trim(),
      phone,
      idCard,
      address,
      startDate,
      deposit: dep,
      serviceIds: selectedServices,
    });
  };

  const isWeb = Platform.OS === 'web';
  const dialogWidth = width >= 1320 ? 1120 : width >= 1024 ? 960 : Math.min(width - 24, 760);

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView style={[styles.sheetContainer, isWeb && styles.sheetContainerWeb]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, isWeb && styles.sheetWeb, { width: isWeb ? dialogWidth : '100%' }]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{editingContract ? 'Cập nhật hợp đồng' : 'Tạo hợp đồng mới'}</Text>
                <Text style={styles.subtitle}>
                  Phòng {String(room?.name || '')} · {formatCurrency(room?.price)}/tháng
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
              {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : null}

              <View style={[styles.layoutGrid, isWeb && styles.layoutGridWeb]}>
                <View style={styles.formColumn}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person-circle-outline" size={16} color={COLORS.secondary} />
                    <Text style={styles.sectionTitle}>Thông tin người thuê</Text>
                  </View>

                  <View style={styles.group}>
                    <Text style={styles.label}>Họ và tên *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VD: Nguyễn Văn A"
                      value={tenantName}
                      onChangeText={setTenantName}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.group, { flex: 1 }]}>
                      <Text style={styles.label}>Số điện thoại</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="phone-pad"
                        placeholder="09..."
                        value={phone}
                        onChangeText={setPhone}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                    <View style={[styles.group, { flex: 1 }]}>
                      <Text style={styles.label}>CMND/CCCD</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="..."
                        value={idCard}
                        onChangeText={setIdCard}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.group}>
                    <Text style={styles.label}>Địa chỉ thường trú</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Phường/xã, quận/huyện, tỉnh/thành"
                      value={address}
                      onChangeText={setAddress}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                    <Ionicons name="briefcase-outline" size={16} color={COLORS.warning} />
                    <Text style={styles.sectionTitle}>Điều khoản tài chính</Text>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.group, { flex: 1 }]}>
                      <Text style={styles.label}>Ngày vào ở</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={startDate}
                        onChangeText={setStartDate}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                    <View style={[styles.group, { flex: 1 }]}>
                      <Text style={styles.label}>Tiền cọc</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                        value={deposit}
                        onChangeText={setDeposit}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.serviceColumn}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryEyebrow}>PHÒNG ĐANG CHỌN</Text>
                    <Text style={styles.summaryRoom}>Phòng {String(room?.name || '')}</Text>
                    <Text style={styles.summaryPrice}>{formatCurrency(room?.price)}/tháng</Text>
                    <Text style={styles.summaryText}>Chọn các dịch vụ áp dụng cho hợp đồng này. Quy trình tính toán giữ nguyên, giao diện được tối ưu cho website.</Text>
                  </View>

                  <Text style={[styles.label, { marginBottom: 10 }]}>Dịch vụ áp dụng theo tháng</Text>
                  <View style={styles.serviceList}>
                    {allServices.map((service) => {
                      const active = selectedServices.includes(service.id);
                      return (
                        <TouchableOpacity
                          key={service.id}
                          style={[styles.serviceItem, active && styles.serviceItemActive]}
                          onPress={() => toggleService(service.id)}
                        >
                          <View style={[styles.serviceIconBox, active && styles.serviceIconBoxActive]}>
                            <Text style={{ fontSize: 16 }}>{service.icon}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.serviceName, active && styles.serviceNameActive]}>{service.name}</Text>
                            <Text style={styles.servicePrice}>{formatCurrency(service.unit_price)}</Text>
                          </View>
                          {active ? <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>{editingContract ? 'Cập nhật hợp đồng' : 'Xác nhận ký'}</Text>
                <Ionicons name="chevron-forward-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayWeb: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetContainer: { width: '100%', flex: 1, maxHeight: '88%', justifyContent: 'flex-end' },
  sheetContainerWeb: { maxHeight: '100%', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: COLORS.surfaceLowest,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 30,
    minHeight: 0,
    flexShrink: 1,
    ...SHADOW.lg,
  },
  sheetWeb: { maxHeight: '92%', borderRadius: 30 },
  scrollArea: { flexGrow: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { color: COLORS.textPrimary, fontSize: 20, ...FONTS.bold },
  subtitle: { marginTop: 4, color: COLORS.textMuted, fontSize: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  layoutGrid: { gap: 18 },
  layoutGridWeb: { flexDirection: 'row', alignItems: 'flex-start' },
  formColumn: { flex: 1.05 },
  serviceColumn: { flex: 0.95 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 2 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, ...FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.4 },
  group: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
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
    marginBottom: 16,
  },
  summaryEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  summaryRoom: { marginTop: 8, color: COLORS.textPrimary, fontSize: 19, ...FONTS.bold },
  summaryPrice: { marginTop: 4, color: COLORS.primary, fontSize: 15, ...FONTS.semibold },
  summaryText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  serviceList: { gap: 8, marginBottom: 18 },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.lg,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  serviceItemActive: { borderColor: COLORS.secondary, backgroundColor: '#e8fff4' },
  serviceIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  serviceIconBoxActive: { backgroundColor: '#c8f7df' },
  serviceName: { color: COLORS.textPrimary, ...FONTS.semibold, fontSize: 13 },
  serviceNameActive: { color: COLORS.secondary },
  servicePrice: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  saveBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { color: '#fff', ...FONTS.semibold, fontSize: 15 },
});
