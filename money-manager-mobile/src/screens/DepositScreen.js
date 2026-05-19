import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { formatCurrency } from '../utils/format';
import apiClient from '../services/apiClient';
import { getWallets } from '../database/queries';

// ─── API helpers ─────────────────────────────────────────────────────────────
const loadDepositsApi = async () => {
  const res = await apiClient.get('/rental/deposits');
  return res?.data || [];
};
const loadRoomsApi = async () => {
  const res = await apiClient.get('/rental/rooms');
  return (res?.data || []).filter(r => r.status === 'vacant');
};
const createDepositApi = async (payload) => {
  const res = await apiClient.post('/rental/deposits', payload);
  return res?.data;
};
const cancelDepositApi = async (id, reason) => {
  await apiClient.patch(`/rental/deposits/${id}`, { status: 'cancelled', note: reason });
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META = {
  holding:     { label: 'Đang giữ cọc', color: '#F59E0B', bg: '#FFFBEB' },
  contract:    { label: 'Đã vào HĐ',    color: '#6366F1', bg: '#EEF2FF' },
  refunded:    { label: 'Đã hoàn cọc',  color: '#10B981', bg: '#ECFDF5' },
  cancelled:   { label: 'Đã hủy',       color: '#EF4444', bg: '#FEF2F2' },
};
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, iconColor, iconBg }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Deposit Row ──────────────────────────────────────────────────────────────
function DepositRow({ item, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Ionicons name="home-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowRoom}>{item.room_name || '—'}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.rowTenant}>{item.tenant_name}{item.tenant_phone ? ` · ${item.tenant_phone}` : ''}</Text>
        <View style={styles.rowBottom}>
          <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.rowDate}>{item.deposit_date || item.recorded_at || ''}</Text>
        </View>
      </View>
      {item.status === 'holding' && (
        <View style={styles.rowActions}>
          {!confirming ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirming(true)}>
              <Text style={styles.cancelBtnText}>Hủy cọc</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 4 }}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => { onCancel(item.id); setConfirming(false); }}>
                <Text style={styles.confirmCancelText}>Xác nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirming(false)}>
                <Text style={[styles.cancelBtnText, { color: COLORS.textMuted }]}>Hủy</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── New Deposit Modal ─────────────────────────────────────────────────────────
function NewDepositModal({ visible, onClose, onCreated }) {
  const [rooms, setRooms] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    roomId: '',
    tenantName: '',
    tenantPhone: '',
    amount: '',
    depositDate: new Date().toISOString().split('T')[0],
    walletId: '',
    note: '',
  });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      const [r, w] = await Promise.all([loadRoomsApi().catch(() => []), getWallets().catch(() => [])]);
      setRooms(r);
      setWallets(w);
      if (w.length) setForm(f => ({ ...f, walletId: w[0].id }));
      setLoading(false);
    })();
  }, [visible]);

  const handleSubmit = async () => {
    if (!form.roomId) return setError('Vui lòng chọn phòng.');
    if (!form.tenantName.trim()) return setError('Vui lòng nhập tên khách đặt cọc.');
    if (!form.amount || Number(form.amount) <= 0) return setError('Vui lòng nhập số tiền hợp lệ.');

    setSaving(true);
    setError('');
    try {
      await createDepositApi({
        roomId: form.roomId,
        tenantName: form.tenantName.trim(),
        tenantPhone: form.tenantPhone,
        amount: Number(form.amount),
        depositDate: form.depositDate,
        walletId: form.walletId || null,
        note: form.note,
      });
      onCreated();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Lỗi khi ghi nhận cọc.');
    } finally {
      setSaving(false);
    }
  };

  const selectedRoom = rooms.find(r => r.id === form.roomId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Ghi nhận cọc mới</Text>
              <Text style={styles.modalSubtitle}>Lập phiếu giữ chỗ và cập nhật trạng thái phòng</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Room picker */}
            <Text style={styles.fieldLabel}>Chọn phòng trống *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {rooms.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roomChip, form.roomId === r.id && styles.roomChipActive]}
                  onPress={() => setForm(f => ({ ...f, roomId: r.id }))}
                >
                  <Text style={[styles.roomChipText, form.roomId === r.id && styles.roomChipTextActive]}>
                    {r.name} — {formatCurrency(r.price)}
                  </Text>
                </TouchableOpacity>
              ))}
              {rooms.length === 0 && !loading && (
                <Text style={styles.noRoomText}>Không có phòng trống</Text>
              )}
            </ScrollView>

            {/* Tenant info */}
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Họ tên khách *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Nguyễn Văn A"
                  value={form.tenantName}
                  onChangeText={v => setForm(f => ({ ...f, tenantName: v }))}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09..."
                  keyboardType="phone-pad"
                  value={form.tenantPhone}
                  onChangeText={v => setForm(f => ({ ...f, tenantPhone: v }))}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* Amount & Date */}
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Số tiền cọc (₫) *</Text>
                <TextInput
                  style={[styles.input, { color: '#EA580C', fontWeight: 'bold' }]}
                  placeholder="500000"
                  keyboardType="numeric"
                  value={form.amount}
                  onChangeText={v => setForm(f => ({ ...f, amount: v.replace(/[^0-9]/g, '') }))}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Ngày ghi nhận</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={form.depositDate}
                  onChangeText={v => setForm(f => ({ ...f, depositDate: v }))}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* Wallet */}
            <Text style={styles.fieldLabel}>Ví thu tiền cọc</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {wallets.map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.walletChip, form.walletId === w.id && styles.walletChipActive]}
                  onPress={() => setForm(f => ({ ...f, walletId: w.id }))}
                >
                  <Text style={[styles.walletChipText, form.walletId === w.id && styles.walletChipTextActive]}>
                    {w.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Transaction summary */}
            {form.amount > 0 && form.roomId && (
              <View style={styles.summaryPreview}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                  <Text style={styles.summaryPreviewTitle}>Tóm tắt giao dịch</Text>
                </View>
                <View style={styles.summaryPreviewRow}>
                  <Text style={styles.summaryPreviewKey}>Phòng:</Text>
                  <Text style={styles.summaryPreviewVal}>{selectedRoom?.name || '—'}</Text>
                </View>
                <View style={styles.summaryPreviewRow}>
                  <Text style={styles.summaryPreviewKey}>Số tiền:</Text>
                  <Text style={[styles.summaryPreviewVal, { color: '#EA580C', fontWeight: 'bold', fontSize: 16 }]}>
                    {formatCurrency(Number(form.amount) || 0)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, saving && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={saving}
              >
                <Text style={styles.modalConfirmBtnText}>{saving ? 'Đang xử lý...' : 'Xác nhận cọc'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DepositScreen() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadDepositsApi();
      setDeposits(data);
    } catch (e) {
      Alert.alert('Lỗi', 'Không tải được dữ liệu cọc.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCancel = async (id) => {
    try {
      await cancelDepositApi(id, 'Hủy bởi chủ nhà');
      loadData();
    } catch (e) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không hủy được.');
    }
  };

  const filtered = search.trim()
    ? deposits.filter(d =>
        d.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.room_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.tenant_phone?.includes(search)
      )
    : deposits;

  const totalHolding = deposits
    .filter(d => d.status === 'holding')
    .reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalAll = deposits
    .filter(d => d.status !== 'cancelled')
    .reduce((s, d) => s + Number(d.amount || 0), 0);
  const holdingCount = deposits.filter(d => d.status === 'holding').length;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <SummaryCard
          label="Cọc đang giữ"
          value={formatCurrency(totalHolding)}
          icon="wallet-outline"
          iconColor="#6366F1"
          iconBg="#EEF2FF"
        />
        <SummaryCard
          label="Tổng tiền cọc"
          value={formatCurrency(totalAll)}
          icon="shield-checkmark-outline"
          iconColor="#10B981"
          iconBg="#ECFDF5"
        />
        <SummaryCard
          label="Phòng đang cọc"
          value={String(holdingCount)}
          icon="home-outline"
          iconColor="#F59E0B"
          iconBg="#FFFBEB"
        />
      </View>

      {/* Search + Add */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, phòng, SĐT..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.textMuted}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ghi nhận cọc</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <DepositRow item={item} onCancel={handleCancel} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Không có dữ liệu tiền cọc</Text>
              <Text style={styles.emptyText}>Mọi khoản cọc được ghi nhận sẽ xuất hiện tại đây.</Text>
            </View>
          }
        />
      )}

      <NewDepositModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); loadData(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfacePage },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
    ...SHADOW.sm,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryValue: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },

  // Search
  searchBarRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, ...FONTS.medium, fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: RADIUS.lg,
    ...SHADOW.sm,
  },
  addBtnText: { color: '#fff', ...FONTS.bold, fontSize: 13 },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    ...SHADOW.sm,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowRoom: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  rowTenant: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.medium },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rowAmount: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  rowDate: { fontSize: 12, color: COLORS.textMuted },
  rowActions: { alignItems: 'flex-end', justifyContent: 'center' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText: { fontSize: 11, ...FONTS.bold },

  cancelBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#FCA5A5' },
  cancelBtnText: { fontSize: 12, color: '#EF4444', ...FONTS.bold },
  confirmCancelBtn: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  confirmCancelText: { fontSize: 12, color: '#fff', ...FONTS.bold },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, color: COLORS.textPrimary, ...FONTS.bold },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    maxHeight: '90%',
    ...SHADOW.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 22, color: COLORS.textPrimary, ...FONTS.bold },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  input: {
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    ...FONTS.semibold,
  },

  roomChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
  },
  roomChipActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  roomChipText: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.semibold },
  roomChipTextActive: { color: COLORS.primary },
  noRoomText: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 10 },

  walletChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
  },
  walletChipActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  walletChipText: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.semibold },
  walletChipTextActive: { color: COLORS.primary },

  summaryPreview: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 16,
    marginBottom: 16,
  },
  summaryPreviewTitle: { fontSize: 13, color: COLORS.primary, ...FONTS.bold },
  summaryPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  summaryPreviewKey: { fontSize: 13, color: '#4338CA', ...FONTS.semibold },
  summaryPreviewVal: { fontSize: 13, color: COLORS.textPrimary, ...FONTS.semibold },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444', ...FONTS.semibold },

  modalActions: { flexDirection: 'row', gap: 10, paddingTop: 8 },
  modalCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: { color: COLORS.textSecondary, ...FONTS.bold },
  modalConfirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },
  modalConfirmBtnText: { color: '#fff', ...FONTS.bold, fontSize: 15 },
});
