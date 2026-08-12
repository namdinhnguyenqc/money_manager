/**
 * TrọCare Mobile — Record Payment Screen
 * Payment form: amount, wallet selection, method, date, note.
 * Uses collect-payment endpoint matching web-admin's recordPayment flow.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiGet } from '@/lib/api';
import { recordPayment } from '@/lib/rentalOps';

const formatMoney = (v?: number | null) => `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(v || 0)))} ₫`;
const PAYMENT_METHODS = ['Tiền mặt', 'Chuyển khoản', 'Ví điện tử'];

export default function NewPaymentScreen() {
  const { invoice_id } = useLocalSearchParams<{ invoice_id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [method, setMethod] = useState('Tiền mặt');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [collector, setCollector] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setDataLoading(true);
    setLoadError('');
    Promise.all([
      invoice_id ? apiGet<any>(`/invoices/${invoice_id}`) : apiGet<any>('/invoices'),
      apiGet<any>('/wallets'),
    ]).then(([invRes, walRes]) => {
      const wals = walRes?.data ?? [];
      setWallets(wals);
      if (wals.length > 0) setWalletId(wals[0].id);

      if (invoice_id) {
        const inv = invRes?.data ?? invRes;
        if (inv) {
          const outstanding = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
          if (outstanding <= 0) {
            setInvoice(null);
            setLoadError('Hóa đơn này đã được thanh toán đủ, không cần thu thêm.');
          } else {
            setInvoice(inv);
            setAmount(String(outstanding));
          }
        } else {
          setLoadError('Không tìm thấy hóa đơn cần thu tiền.');
        }
      } else {
        const allInvoices = invRes?.data ?? [];
        const unpaid = allInvoices.filter((i: any) => {
          const total = Math.round(Number(i.total_amount || 0));
          const paid = Math.round(Number(i.paid_amount || 0));
          return total > paid;
        });
        setOutstandingInvoices(unpaid);
        if (unpaid.length === 0) {
          setLoadError('Tất cả hóa đơn đã được thanh toán xong! Không có hóa đơn nào cần thu tiền.');
        }
      }
    }).catch((error: any) => {
      setLoadError(error?.message || 'Không tải được thông tin thu tiền.');
    }).finally(() => setDataLoading(false));
  }, [invoice_id]);

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
    const activeInvoiceId = invoice_id || invoice?.id;
    if (!activeInvoiceId) {
      Alert.alert('Lỗi', 'Vui lòng chọn hóa đơn cần thu tiền.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    const outstanding = invoice
      ? Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)
      : 0;
    if (outstanding > 0 && Number(amount) > outstanding) {
      Alert.alert('Số tiền vượt quá', 'Số tiền thu không được lớn hơn số tiền còn lại của hóa đơn.');
      return;
    }
    if (!walletId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ví thanh toán.');
      return;
    }
    if (!invoice) {
      Alert.alert('Lỗi', 'Không tải được hóa đơn cần thu tiền.');
      return;
    }
    if (!parseIsoDate(date)) {
      Alert.alert('Ngày thu không hợp lệ', 'Ngày thu tiền phải có định dạng YYYY-MM-DD hợp lệ.');
      return;
    }
    if (!collector.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập người thu tiền.');
      return;
    }
    if ((method === 'Chuyển khoản' || method === 'Ví điện tử') && !transactionCode.trim() && !note.trim()) {
      Alert.alert('Thiếu mã giao dịch', 'Vui lòng nhập mã giao dịch hoặc ghi chú cho khoản thu không dùng tiền mặt.');
      return;
    }

    setLoading(true);
    try {
      await recordPayment(invoice, {
        amount: Number(amount),
        walletId,
        date,
        method,
        collector: collector.trim(),
        note: [transactionCode.trim() ? `Mã GD: ${transactionCode.trim()}` : '', note.trim()].filter(Boolean).join(' · ') || undefined,
      });
      Alert.alert('Thành công', 'Đã ghi nhận thanh toán.', [
        { text: 'Xem hóa đơn', onPress: () => router.replace(`/invoice/${activeInvoiceId}`) },
      ]);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể ghi nhận thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Thu tiền', headerBackTitle: 'Quay lại' }} />
      <SafeAreaView style={styles.container}>
        {dataLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.stateText}>Đang tải thông tin thu tiền...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.stateBox}>
            <Ionicons name="alert-circle-outline" size={42} color={Colors.danger} />
            <Text style={styles.stateTitle}>Không thể thu tiền</Text>
            <Text style={styles.stateText}>{loadError}</Text>
            <Button title="Thử lại" onPress={() => router.replace(`/payment/new?invoice_id=${invoice_id || ''}`)} variant="outline" size="md" />
          </View>
        ) : (
        <>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Outstanding Invoice Selector (General Collection Mode) */}
          {!invoice_id && outstandingInvoices.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.fieldLabel}>Chọn hóa đơn cần thu tiền</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.invoicePickerScroll}>
                {outstandingInvoices.map((inv) => {
                  const isSelected = invoice?.id === inv.id;
                  const total = Number(inv.total_amount || 0);
                  const paid = Number(inv.paid_amount || 0);
                  const balance = total - paid;
                  return (
                    <TouchableOpacity
                      key={inv.id}
                      style={[styles.invoicePickerChip, isSelected && styles.invoicePickerChipActive]}
                      onPress={() => {
                        setInvoice(inv);
                        setAmount(String(Math.max(0, balance)));
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.invoicePickerRoom, isSelected && styles.invoicePickerRoomActive]}>
                        {inv.room_name || 'Phòng'}
                      </Text>
                      <Text style={[styles.invoicePickerMeta, isSelected && styles.invoicePickerMetaActive]}>
                        T{inv.month}/{inv.year} · {inv.tenant_name}
                      </Text>
                      <Text style={[styles.invoicePickerBalance, isSelected && styles.invoicePickerBalanceActive]}>
                        Còn nợ: {formatMoney(balance)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {invoice && (
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{invoice.room_name || 'Phòng'}</Text>
              <Text style={styles.summaryMeta}>T{invoice.month}/{invoice.year} · {invoice.tenant_name}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng tiền:</Text>
                <Text style={styles.summaryValue}>{formatMoney(invoice.total_amount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Đã thu:</Text>
                <Text style={[styles.summaryValue, { color: Colors.successDark }]}>{formatMoney(invoice.paid_amount)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.outstandingRow]}>
                <Text style={styles.outstandingLabel}>Còn lại:</Text>
                <Text style={styles.outstandingValue}>
                  {formatMoney(Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0))}
                </Text>
              </View>
            </Card>
          )}

          <Input
            label="Số tiền thu"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            required
            icon={<Ionicons name="cash-outline" size={18} color={Colors.textMuted} />}
          />

          {/* Wallet selector */}
          <Text style={styles.fieldLabel}>Ví thanh toán</Text>
          <View style={styles.walletGrid}>
            {wallets.map((w: any) => (
              <Button
                key={w.id}
                title={w.name}
                variant={walletId === w.id ? 'primary' : 'outline'}
                size="sm"
                onPress={() => setWalletId(w.id)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Phương thức</Text>
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.methodChip, method === item && styles.methodChipActive]}
                onPress={() => setMethod(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item === 'Chuyển khoản' ? 'card-outline' : item === 'Ví điện tử' ? 'phone-portrait-outline' : 'cash-outline'}
                  size={16}
                  color={method === item ? Colors.primary : Colors.textMuted}
                />
                <Text style={[styles.methodText, method === item && styles.methodTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Ngày thu"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            required
            icon={<Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Người thu"
            value={collector}
            onChangeText={setCollector}
            placeholder="Tên người thu tiền"
            required
            icon={<Ionicons name="person-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Mã giao dịch"
            value={transactionCode}
            onChangeText={setTransactionCode}
            placeholder="Bắt buộc nếu chuyển khoản/ví điện tử"
            icon={<Ionicons name="receipt-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Ghi chú"
            value={note}
            onChangeText={setNote}
            placeholder="Ghi chú thêm..."
            multiline
          />

        </ScrollView>
        <View style={styles.stickyFooter}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>{invoice?.room_name || 'Hóa đơn'}</Text>
            <Text style={styles.footerAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {formatMoney(Number(amount || 0))}
            </Text>
          </View>
          <Button
            title="Xác nhận thu tiền"
            onPress={handleSubmit}
            variant="success"
            size="lg"
            loading={loading}
            icon={<Ionicons name="checkmark-circle-outline" size={18} color={Colors.textWhite} />}
            style={styles.footerButton}
          />
        </View>
        </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stickyFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 8 : 14, backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  footerSummary: { flex: 1, minWidth: 0 },
  footerLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  footerAmount: { marginTop: 2, fontSize: 19, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  footerButton: { minWidth: 170, paddingHorizontal: 14 },
  invoicePickerScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  invoicePickerChip: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 170,
    marginRight: 8,
    gap: 4,
  },
  invoicePickerChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  invoicePickerRoom: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  invoicePickerRoomActive: {
    color: Colors.primary,
  },
  invoicePickerMeta: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  invoicePickerMetaActive: {
    color: Colors.primary,
    opacity: 0.8,
  },
  invoicePickerBalance: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
    marginTop: 2,
  },
  invoicePickerBalanceActive: {
    color: Colors.primary,
  },
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateTitle: { fontSize: 17, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  stateText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  scroll: { padding: 20, paddingBottom: 40 },
  summaryCard: { padding: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, letterSpacing: -0.3 },
  summaryMeta: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  outstandingRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 10 },
  outstandingLabel: { fontSize: 15, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  outstandingValue: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.danger, letterSpacing: -0.5 },
  fieldLabel: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, marginBottom: 8 },
  walletGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  methodChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  methodText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  methodTextActive: { color: Colors.primary },
});
