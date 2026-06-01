/**
 * TrọCare Mobile — Contract Detail Screen
 * Shows:
 * - Lease Summary (dates, rent, deposit)
 * - Tenant Dossier (phone, CCCD, address)
 * - Applied utility services
 * - Invoice history
 * - Terminate contract modal (settlement refund / collections)
 * - Delete contract action
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import {
  loadContract,
  loadInvoicesByContract,
  loadWallets,
  terminateContract,
  deleteContract,
  formatMoney,
  normalizeInvoiceStatus,
  getServiceUnitLabel,
} from '@/lib/rentalOps';

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Business Data
  const [contract, setContract] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  // Terminate Modal States
  const [terminateVisible, setTerminateVisible] = useState(false);
  const [refundForm, setRefundForm] = useState({
    refundAmount: '',
    refundDate: '',
    refundMethod: 'cash',
    settlementAmount: '0',
    settlementStatus: 'collected',
    note: '',
  });
  const [selectedWalletId, setSelectedWalletId] = useState('');
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [cData, invData, walletsData] = await Promise.all([
        loadContract(id),
        loadInvoicesByContract(id),
        loadWallets().catch(() => []),
      ]);

      setContract(cData);
      setInvoices(invData);
      setWallets(walletsData);

      if (walletsData.length > 0) {
        setSelectedWalletId(walletsData[0].id);
      }

      // Pre-fill default dates for refund
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setRefundForm((prev) => ({
        ...prev,
        refundAmount: String(cData?.deposit_amount || '0'),
        refundDate: `${y}-${m}-${d}`,
      }));

    } catch (e: any) {
      showToast(e?.message || 'Không thể tải chi tiết hợp đồng.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa hợp đồng',
      'Hành động này sẽ xóa hợp đồng vĩnh viễn và đưa phòng trở lại trạng thái trống. Bạn có chắc chắn?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteContract(id!);
              showToast('Đã xóa hợp đồng thành công.', 'success');
              setTimeout(() => router.back(), 1000);
            } catch (e: any) {
              Alert.alert('Lỗi', e?.message || 'Không thể xóa hợp đồng.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTerminateSubmit = async () => {
    try {
      setActionLoading(true);
      await terminateContract(contract, {
        refundAmount: Number(refundForm.refundAmount || 0),
        refundDate: refundForm.refundDate,
        refundMethod: refundForm.refundMethod,
        note: refundForm.note || 'Thanh lý hợp đồng',
        walletId: selectedWalletId || undefined,
        settlementAmount: Number(refundForm.settlementAmount || 0),
        settlementWalletId: selectedWalletId || undefined,
        settlementStatus: refundForm.settlementStatus,
      });

      showToast('Thanh lý hợp đồng thành công!', 'success');
      setTerminateVisible(false);
      fetchData();
    } catch (e: any) {
      Alert.alert('Lỗi thanh lý', e?.message || 'Thanh lý hợp đồng thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !contract) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết hợp đồng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Không tìm thấy hợp đồng hoặc hợp đồng đã bị xóa.</Text>
          <Button title="Quay lại" variant="outline" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isActive = contract.status === 'active' || contract.status === 'expiring_soon';

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HĐ Phòng {contract.room_name}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.headerRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="document-text" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roomName}>Phòng {contract.room_name}</Text>
              <Text style={styles.tenantName}>Khách: {contract.tenant_name}</Text>
            </View>
            <StatusBadge status={contract.status} type="contract" />
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Giá thuê</Text>
              <Text style={styles.metaVal}>{formatMoney(contract.rent_amount)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Tiền cọc</Text>
              <Text style={styles.metaVal}>{formatMoney(contract.deposit_amount)}</Text>
            </View>
          </View>

          <View style={[styles.metaGrid, { marginTop: 12 }]}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Bắt đầu</Text>
              <Text style={styles.metaVal}>
                {contract.start_date ? new Date(contract.start_date).toLocaleDateString('vi-VN') : '—'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Hết hạn</Text>
              <Text style={styles.metaVal}>
                {contract.end_date ? new Date(contract.end_date).toLocaleDateString('vi-VN') : '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Tenant Dossier */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Thông tin khách thuê</Text>
          <View style={styles.detailRow}>
            <Ionicons name="phone-portrait-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.detailLabel}>Số điện thoại:</Text>
            <Text style={styles.detailValue}>{contract.tenant_phone || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.detailLabel}>Số CCCD/ID:</Text>
            <Text style={styles.detailValue}>{contract.tenant_id_card || '—'}</Text>
          </View>
          {contract.tenant_email ? (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{contract.tenant_email}</Text>
            </View>
          ) : null}
          {contract.tenant_address ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.detailLabel}>Quê quán:</Text>
              <Text style={styles.detailValue}>{contract.tenant_address}</Text>
            </View>
          ) : null}
        </Card>

        {/* Applied Services */}
        {contract.applied_services_snapshot && contract.applied_services_snapshot.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionHeader}>Dịch vụ tiện ích áp dụng</Text>
            {contract.applied_services_snapshot.map((s: any) => (
              <View key={s.service_id} style={styles.serviceRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.servicePrice}>
                  {formatMoney(s.applied_unit_price || s.unit_price)}
                  {getServiceUnitLabel(s)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Invoice History */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Lịch sử hóa đơn ({invoices.length})</Text>
          {invoices.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có hóa đơn nào được tạo.</Text>
          ) : (
            <View style={styles.invoicesList}>
              {invoices.map((inv) => {
                const status = normalizeInvoiceStatus(inv);
                return (
                  <TouchableOpacity
                    key={inv.id}
                    style={styles.invoiceItem}
                    onPress={() => router.push(`/invoice/${inv.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceLabel}>
                        Hóa đơn T{inv.month}/{inv.year}
                      </Text>
                      <Text style={styles.invoiceMeta}>Tổng: {formatMoney(inv.total_amount)}</Text>
                    </View>
                    <StatusBadge status={status} type="invoice" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* Operational buttons */}
        <View style={styles.actionsContainer}>
          {isActive && (
            <Button
              title="Tạo hóa đơn"
              variant="primary"
              onPress={() => router.push(`/invoice/new?contract_id=${contract.id}`)}
              icon={<Ionicons name="add" size={16} color={Colors.textWhite} />}
              style={styles.actionBtn}
            />
          )}

          {isActive && (
            <Button
              title="Thanh lý hợp đồng"
              variant="success"
              onPress={() => setTerminateVisible(true)}
              icon={<Ionicons name="document-attach-outline" size={16} color={Colors.textWhite} />}
              style={styles.actionBtn}
            />
          )}

          <Button
            title="Xem / In hợp đồng"
            variant="outline"
            onPress={() => router.push(`/contract/${contract.id}/print`)}
            icon={<Ionicons name="print-outline" size={16} color={Colors.primary} />}
            style={styles.actionBtn}
          />

          <Button
            title="Xóa hợp đồng"
            variant="danger"
            onPress={handleDelete}
            icon={<Ionicons name="trash-outline" size={16} color={Colors.textWhite} />}
            style={styles.actionBtn}
            disabled={actionLoading}
          />
        </View>
      </ScrollView>

      {/* Terminate Modal */}
      <Modal visible={terminateVisible} animationType="slide" transparent onRequestClose={() => setTerminateVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh lý hợp đồng</Text>
              <TouchableOpacity onPress={() => setTerminateVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
              <Text style={styles.modalIntro}>
                Thiết lập thông tin hoàn cọc và thu các khoản nợ của phòng {contract.room_name}.
              </Text>

              <Input
                label="Số tiền cọc hoàn lại (₫)"
                keyboardType="numeric"
                value={refundForm.refundAmount}
                onChangeText={(v) => setRefundForm({ ...refundForm, refundAmount: v })}
              />

              <Input
                label="Ngày hoàn cọc / thanh lý"
                value={refundForm.refundDate}
                onChangeText={(v) => setRefundForm({ ...refundForm, refundDate: v })}
              />

              <Input
                label="Khoản thu bổ sung nếu có (đã chốt số điện nước...) (₫)"
                keyboardType="numeric"
                value={refundForm.settlementAmount}
                onChangeText={(v) => setRefundForm({ ...refundForm, settlementAmount: v })}
              />

              {wallets.length > 0 && (
                <View>
                  <Text style={styles.pickerLabel}>Ví xử lý tài chính</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                    {wallets.map((w) => {
                      const isSelected = selectedWalletId === w.id;
                      return (
                        <TouchableOpacity
                          key={w.id}
                          style={[styles.walletItem, isSelected && styles.walletItemActive]}
                          onPress={() => setSelectedWalletId(w.id)}
                        >
                          <Text style={[styles.walletText, isSelected && styles.walletTextActive]}>
                            {w.name} ({formatMoney(w.balance)})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Input
                label="Ghi chú thanh lý"
                value={refundForm.note}
                onChangeText={(v) => setRefundForm({ ...refundForm, note: v })}
                placeholder="Ví dụ: Hoàn cọc 100% trừ đi 200k tiền điện thừa..."
                multiline
                numberOfLines={3}
              />

              <Button
                title={actionLoading ? 'Đang thực hiện...' : 'Xác nhận thanh lý'}
                variant="success"
                onPress={handleTerminateSubmit}
                disabled={actionLoading}
                style={{ marginTop: 10, paddingVertical: 12 }}
              />
            </ScrollView>
          </SafeAreaView>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.danger, textAlign: 'center' },
  card: { padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  summaryCard: { padding: 18, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  roomName: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.4 },
  tenantName: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#bbf7d0', marginVertical: 14 },
  metaGrid: { flexDirection: 'row', gap: 16 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  metaVal: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginTop: 2 },
  sectionHeader: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 12, letterSpacing: -0.3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailLabel: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, width: 90 },
  detailValue: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  serviceName: { flex: 1, fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  servicePrice: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  emptyText: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  invoicesList: { gap: 10 },
  invoiceItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.borderLight },
  invoiceLabel: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  invoiceMeta: { fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  actionsContainer: { gap: 10, marginTop: 14 },
  actionBtn: { paddingVertical: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  modalIntro: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, lineHeight: 18, marginBottom: 12 },
  pickerLabel: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, marginBottom: 8 },
  pickerRow: { flexDirection: 'row', gap: 8 },
  walletItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent', marginRight: 8 },
  walletItemActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  walletText: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  walletTextActive: { color: Colors.primary },
});
