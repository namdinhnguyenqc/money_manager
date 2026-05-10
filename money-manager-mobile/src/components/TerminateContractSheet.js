import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { formatCurrency } from '../utils/format';

// ─── Helpers ──────────────────────────────────────────────
function calculateProratedRent(rentAmount, today) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const stayedDays = today.getDate();
  const dailyRent = rentAmount / daysInMonth;
  const totalAmount = Math.round(dailyRent * stayedDays);
  return { daysInMonth, stayedDays, dailyRent: Math.round(dailyRent), totalAmount };
}

function normalizeInvoiceStatus(inv) {
  if (!inv) return 'unpaid';
  const s = String(inv.status || '').toLowerCase();
  if (s === 'paid' || (inv.paid_amount && Number(inv.paid_amount) >= Number(inv.total_amount || 0))) return 'paid';
  return s;
}

// ─── WalletPicker ──────────────────────────────────────────
function WalletPicker({ label, wallets, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = wallets.find((w) => w.id === selectedId);
  return (
    <View style={pk.wrap}>
      <Text style={pk.label}>{label}</Text>
      <TouchableOpacity style={pk.btn} onPress={() => setOpen(true)}>
        <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
        <Text style={pk.btnText} numberOfLines={1}>
          {selected ? `${selected.name} (${formatCurrency(selected.balance || 0)})` : 'Chọn ví...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={pk.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={pk.dropdown}>
            <Text style={pk.dropdownTitle}>{label}</Text>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[pk.option, w.id === selectedId && pk.optionActive]}
                onPress={() => { onSelect(w.id); setOpen(false); }}
              >
                <Ionicons name="wallet" size={16} color={w.id === selectedId ? COLORS.primary : COLORS.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[pk.optionText, w.id === selectedId && { color: COLORS.primary }]}>{w.name}</Text>
                  <Text style={pk.optionBalance}>{formatCurrency(w.balance || 0)}</Text>
                </View>
                {w.id === selectedId && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const pk = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.semibold },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.borderSoft,
    borderRadius: RADIUS.md, padding: 12,
    backgroundColor: COLORS.surfaceLowest,
  },
  btnText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, ...FONTS.semibold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dropdown: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16,
    gap: 4, ...SHADOW.lg,
  },
  dropdownTitle: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: RADIUS.md,
  },
  optionActive: { backgroundColor: COLORS.primaryLight },
  optionText: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.semibold },
  optionBalance: { fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
});

// ─── Main Component ────────────────────────────────────────
export default function TerminateContractSheet({
  visible,
  room,
  invoices = [],
  wallets = [],
  onClose,
  onConfirm, // async (data) => void
}) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Kiểm tra hóa đơn tháng này đã đóng chưa
  const paidInvoice = invoices.find((inv) => {
    const isPaid = normalizeInvoiceStatus(inv) === 'paid';
    const isCurrentMonth = Number(inv.month) === currentMonth && Number(inv.year) === currentYear;
    const isEarlyMonth = today.getDate() <= 5;
    const isLastMonth = isEarlyMonth && (
      currentMonth === 1
        ? (Number(inv.month) === 12 && Number(inv.year) === currentYear - 1)
        : (Number(inv.month) === currentMonth - 1 && Number(inv.year) === currentYear)
    );
    return isPaid && (isCurrentMonth || isLastMonth);
  });
  const isAlreadyPaid = Boolean(paidInvoice);

  const settlementResult = calculateProratedRent(room?.price || 0, today);
  const actualSettlementAmount = isAlreadyPaid ? 0 : settlementResult.totalAmount;
  const originalDeposit = Number(room?.deposit || 0);
  const suggestedRefund = Math.max(0, originalDeposit - actualSettlementAmount);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState(String(suggestedRefund));
  const [refundDate, setRefundDate] = useState(today.toISOString().split('T')[0]);
  const [refundMethod, setRefundMethod] = useState('Tiền mặt');
  const [note, setNote] = useState('');
  const [settlementWalletId, setSettlementWalletId] = useState('');
  const [refundWalletId, setRefundWalletId] = useState('');

  // Reset khi mở sheet mới
  useEffect(() => {
    if (visible) {
      setIsConfirmed(false);
      setRefundAmount(String(suggestedRefund));
      setRefundDate(today.toISOString().split('T')[0]);
      setRefundMethod('Tiền mặt');
      setNote('');
      if (wallets.length > 0) {
        setSettlementWalletId(wallets[0].id);
        setRefundWalletId(wallets[0].id);
      }
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    if (!isConfirmed) {
      Alert.alert('Xác nhận', 'Vui lòng tick xác nhận đã thanh toán xong trước khi hoàn tất.');
      return;
    }
    const refundNum = Number(String(refundAmount).replace(/[^0-9]/g, '')) || 0;
    if (refundNum > 0 && !refundWalletId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ví để hoàn trả cọc.');
      return;
    }
    if (actualSettlementAmount > 0 && !settlementWalletId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ví để thu tiền thanh lý.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm({
        refundAmount: refundNum,
        settlementAmount: actualSettlementAmount,
        refundDate,
        refundMethod,
        note,
        walletId: refundWalletId || null,
        settlementWalletId: settlementWalletId || null,
        settlementStatus: 'paid',
      });
    } catch (e) {
      Alert.alert('Lỗi', e?.message || 'Không thể xử lý trả phòng.');
    } finally {
      setLoading(false);
    }
  }, [isConfirmed, refundAmount, refundWalletId, settlementWalletId, actualSettlementAmount, refundDate, refundMethod, note, onConfirm]);

  if (!room) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 600, alignSelf: 'center' }}>
          <View style={s.sheet}>
            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.headerTitle}>Thanh lý & Trả phòng</Text>
                <Text style={s.headerSub}>Phòng {room.name} · {room.tenant_name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

              {/* Bảng tính thanh lý */}
              {isAlreadyPaid ? (
                <View style={s.paidBanner}>
                  <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.paidTitle}>Tháng này đã thanh toán xong</Text>
                    <Text style={s.paidSub}>
                      Hóa đơn T{currentMonth}/{currentYear} đã đóng. Hệ thống sẽ không khấu trừ thêm tiền phòng.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={s.calcBox}>
                  <Text style={s.calcTitle}>Bảng tính tiền phòng tháng cuối</Text>
                  <View style={s.calcRow}>
                    <Text style={s.calcLabel}>Số ngày trong tháng</Text>
                    <Text style={s.calcValue}>{settlementResult.daysInMonth} ngày</Text>
                  </View>
                  <View style={s.calcRow}>
                    <Text style={s.calcLabel}>Tiền phòng/ngày</Text>
                    <Text style={s.calcValue}>{formatCurrency(settlementResult.dailyRent)}</Text>
                  </View>
                  <View style={s.calcRow}>
                    <Text style={s.calcLabel}>Số ngày ở (01/{today.getMonth()+1} → {today.getDate()}/{today.getMonth()+1})</Text>
                    <Text style={s.calcValue}>{settlementResult.stayedDays} ngày</Text>
                  </View>
                  <View style={[s.calcRow, s.calcRowTotal]}>
                    <Text style={s.calcLabelBold}>Tiền trọ cuối kỳ</Text>
                    <Text style={s.calcValueRed}>{formatCurrency(settlementResult.totalAmount)}</Text>
                  </View>
                </View>
              )}

              {/* Tóm tắt cọc */}
              <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Tiền cọc ban đầu</Text>
                  <Text style={s.summaryValue}>{formatCurrency(originalDeposit)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Tiền trọ khấu trừ</Text>
                  <Text style={[s.summaryValue, { color: COLORS.error }]}>-{formatCurrency(actualSettlementAmount)}</Text>
                </View>
                <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: COLORS.borderSoft, paddingTop: 10, marginTop: 4 }]}>
                  <Text style={s.summaryLabelBold}>Gợi ý hoàn cọc</Text>
                  <Text style={[s.summaryValue, { color: COLORS.success, fontSize: 16, ...FONTS.bold }]}>{formatCurrency(suggestedRefund)}</Text>
                </View>
              </View>

              {/* Wallets */}
              {wallets.length > 0 && (
                <View style={s.section}>
                  {actualSettlementAmount > 0 && (
                    <WalletPicker
                      label={`Ví thu tiền thanh lý (${formatCurrency(actualSettlementAmount)})`}
                      wallets={wallets}
                      selectedId={settlementWalletId}
                      onSelect={setSettlementWalletId}
                    />
                  )}
                  <WalletPicker
                    label="Ví thực hiện hoàn cọc"
                    wallets={wallets}
                    selectedId={refundWalletId}
                    onSelect={setRefundWalletId}
                  />
                </View>
              )}

              {/* Form inputs */}
              <View style={s.section}>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Thực tế hoàn trả cọc (₫)</Text>
                  <TextInput
                    style={s.input}
                    value={refundAmount}
                    onChangeText={setRefundAmount}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Ngày thanh lý</Text>
                  <TextInput
                    style={s.input}
                    value={refundDate}
                    onChangeText={setRefundDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Phương thức</Text>
                  <View style={s.methodRow}>
                    {['Tiền mặt', 'Chuyển khoản'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[s.methodBtn, refundMethod === m && s.methodBtnActive]}
                        onPress={() => setRefundMethod(m)}
                      >
                        <Text style={[s.methodBtnText, refundMethod === m && s.methodBtnTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Ghi chú thanh lý</Text>
                  <TextInput
                    style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Ghi chú thêm..."
                    multiline
                  />
                </View>
              </View>

              {/* Confirmation checkbox */}
              <TouchableOpacity style={s.confirmRow} onPress={() => setIsConfirmed((v) => !v)} activeOpacity={0.8}>
                <View style={[s.checkbox, isConfirmed && s.checkboxChecked]}>
                  {isConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={s.confirmText}>
                  Tôi xác nhận khách đã thanh toán xong tiền nhà/điện/nước và các khoản thanh lý.
                </Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={s.actions}>
                <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                  <Text style={s.cancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, !isConfirmed && s.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading || !isConfirmed}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={s.submitText}>Hoàn tất Trả phòng</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', padding: Platform.OS === 'web' ? 24 : 0,
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Platform.OS === 'web' ? RADIUS.xl : 24,
    borderTopRightRadius: Platform.OS === 'web' ? RADIUS.xl : 24,
    borderRadius: Platform.OS === 'web' ? RADIUS.xl : undefined,
    maxHeight: '92%',
    ...SHADOW.lg,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft,
  },
  headerTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.medium, marginTop: 2 },
  closeBtn: { padding: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceHigh },
  body: { padding: 20, gap: 16, paddingBottom: 40 },

  // Paid banner
  paidBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#e8f5e9', borderRadius: RADIUS.md,
    padding: 14, borderWidth: 1, borderColor: '#a5d6a7',
  },
  paidTitle: { fontSize: 14, color: '#2e7d32', ...FONTS.bold },
  paidSub: { fontSize: 12, color: '#388e3c', ...FONTS.medium, marginTop: 2 },

  // Calc box
  calcBox: {
    backgroundColor: '#e3f2fd', borderRadius: RADIUS.md,
    padding: 14, borderWidth: 1, borderColor: '#90caf9', gap: 8,
  },
  calcTitle: { fontSize: 13, color: '#1565c0', ...FONTS.bold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcRowTotal: { borderTopWidth: 1, borderTopColor: '#90caf9', paddingTop: 8, marginTop: 4 },
  calcLabel: { fontSize: 13, color: '#1976d2', ...FONTS.medium, flex: 1 },
  calcLabelBold: { fontSize: 14, color: '#0d47a1', ...FONTS.bold },
  calcValue: { fontSize: 13, color: '#1565c0', ...FONTS.semibold },
  calcValueRed: { fontSize: 15, color: '#c62828', ...FONTS.bold },

  // Summary box
  summaryBox: {
    backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.md,
    padding: 14, borderWidth: 1, borderColor: COLORS.borderSoft, gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.medium },
  summaryLabelBold: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.bold },
  summaryValue: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.semibold },

  // Section
  section: { gap: 12 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.semibold },
  input: {
    borderWidth: 1, borderColor: COLORS.borderSoft, borderRadius: RADIUS.md,
    padding: 12, fontSize: 15, color: COLORS.textPrimary, ...FONTS.semibold,
    backgroundColor: COLORS.surfaceLowest,
  },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.surfaceLowest,
  },
  methodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  methodBtnText: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.semibold },
  methodBtnTextActive: { color: '#fff' },

  // Checkbox
  confirmRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff8e1', borderRadius: RADIUS.md,
    padding: 14, borderWidth: 1, borderColor: '#ffe082',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.borderStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#e65100', borderColor: '#e65100' },
  confirmText: { flex: 1, fontSize: 13, color: '#5d4037', ...FONTS.semibold, lineHeight: 20 },

  // Actions
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 16, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 15, color: COLORS.textSecondary, ...FONTS.semibold },
  submitBtn: {
    flex: 2, padding: 16, borderRadius: RADIUS.md,
    backgroundColor: '#c62828', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, ...SHADOW.sm,
  },
  submitBtnDisabled: { backgroundColor: COLORS.borderStrong },
  submitText: { fontSize: 15, color: '#fff', ...FONTS.bold },
});
