/**
 * TrọCare Mobile — Invoice Detail Screen
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { apiGet, apiDelete } from '@/lib/api';
import { buildInvoiceQrUrl } from '@/lib/rentalOps';

const formatMoney = (v?: number | null) => `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(v || 0)))} ₫`;
const BANK_LABELS: Record<string, string> = {
  '970416': 'ACB',
  'ACB': 'ACB',
  '970436': 'Vietcombank',
  '970418': 'BIDV',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970415': 'VietinBank',
  '970423': 'TPBank',
};

const getBankLabel = (bankId?: string) => BANK_LABELS[String(bankId || '').trim()] || bankId || '';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const invoiceCardRef = useRef<View>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharingInvoice, setSharingInvoice] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGet<any>(`/invoices/${id}`),
      apiGet<any>('/bank-config').catch(() => null),
    ])
      .then(([invoiceRes, bankRes]) => {
        setInvoice(invoiceRes?.data ?? invoiceRes);
        setBankConfig(bankRes?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Xóa hóa đơn', 'Bạn có chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await apiDelete(`/invoices/${id}`); router.back(); }
        catch (e: any) { Alert.alert('Lỗi', e?.message || 'Không thể xóa.'); }
      }},
    ]);
  };

  if (loading) return (<><Stack.Screen options={{ headerShown: true, title: 'Hóa đơn' }} /><View style={styles.container}><CardSkeleton /><CardSkeleton /></View></>);

  if (!invoice) return (<><Stack.Screen options={{ headerShown: true, title: 'Hóa đơn' }} /><View style={styles.container}><Text>Không tìm thấy hóa đơn.</Text></View></>);

  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const outstanding = Math.max(0, total - paid);
  const status = paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'sent';
  const items = invoice.items || [];
  const paymentCode = invoice.payment_code || invoice.paymentCode || '';
  const channel = invoice.payment_channel;
  const bankId = channel?.bank_id || channel?.bankId || bankConfig?.bank_id || '';
  const bankLabel = getBankLabel(bankId);
  const accountNo = channel?.account_no || channel?.accountNo || bankConfig?.account_no || '';
  const accountName = channel?.account_name || channel?.accountName || bankConfig?.account_name || '';
  const qrUrl = buildInvoiceQrUrl(invoice, { bankId, accountNo }) || bankConfig?.qr_uri || '';
  const paymentProvider = channel?.provider === 'sepay' ? 'SePay tự động' : 'Chuyển khoản';
  const previousDebt = Number(invoice.previous_debt || invoice.previousDebt || 0);
  const currentPayable = Math.max(0, total - previousDebt);
  const depositReturn = 0;
  const invoiceRows = [
    {
      name: 'Phòng',
      detail: '',
      amount: Number(invoice.room_fee || invoice.roomFee || 0),
    },
    ...items.map((item: any) => ({
      name: item.name || 'Khoản phí',
      detail: item.detail || '',
      amount: Number(item.amount || 0),
    })),
  ];

  const sharePaymentValue = async (label: string, value: string) => {
    if (!value) return;
    try {
      await Share.share({ message: value, title: label });
    } catch {
      Alert.alert(label, value);
    }
  };

  const shareInvoiceImage = async () => {
    try {
      if (!invoiceCardRef.current) return;
      setSharingInvoice(true);
      const uri = await captureRef(invoiceCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Không thể chia sẻ ảnh', 'Thiết bị chưa hỗ trợ chia sẻ file ảnh.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Hóa đơn phòng ${invoice.room_name || ''} T${invoice.month}/${invoice.year}`,
      });
    } catch {
      Alert.alert('Không thể chia sẻ ảnh', 'Vui lòng thử lại sau khi hóa đơn hiển thị đầy đủ.');
    } finally {
      setSharingInvoice(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: `Hóa đơn T${invoice.month}/${invoice.year}`, headerBackTitle: 'Quay lại' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <View ref={invoiceCardRef} collapsable={false}>
          <Card style={styles.paperCard}>
            <Text style={styles.noticeTitle}>THÔNG BÁO TIỀN PHÒNG TRỌ T{invoice.month}</Text>

            <View style={styles.recipientGrid}>
              <View style={styles.recipientCell}>
                <Text style={styles.recipientLabel}>Kính gửi:</Text>
                <Text style={styles.recipientValue}>{invoice.tenant_name || 'Khách thuê'}</Text>
              </View>
              <View style={styles.recipientCell}>
                <Text style={styles.recipientLabel}>Số điện thoại:</Text>
                <Text style={styles.recipientMuted}>{invoice.tenant_phone || '-'}</Text>
              </View>
              <View style={styles.recipientCell}>
                <Text style={styles.recipientLabel}>Ở phòng số:</Text>
                <View style={styles.roomChip}>
                  <Text style={styles.roomChipText}>{invoice.room_name || 'Phòng'}</Text>
                  <Ionicons name="chevron-down" size={12} color="#166534" />
                </View>
              </View>
              <View style={styles.recipientCell}>
                <Text style={styles.recipientLabel}>Trạng thái:</Text>
                <Text style={[styles.statusText, status === 'paid' && styles.statusPaid]}>
                  {status === 'paid' ? 'Đã thanh toán' : status === 'partial' ? 'Còn thiếu' : 'Chưa thanh toán'}
                </Text>
              </View>
            </View>

            <View style={styles.invoiceTable}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.thText, styles.sttCell]}>STT</Text>
                <Text style={[styles.thText, styles.itemCell]}>Khoản</Text>
                <Text style={[styles.thText, styles.detailCell]}>Chi tiết</Text>
                <Text style={[styles.thText, styles.amountCell]}>Thành Tiền</Text>
              </View>
              {invoiceRows.map((row, index) => (
                <View key={`${row.name}-${index}`} style={styles.tableRow}>
                  <Text style={[styles.tdText, styles.sttCell]}>{index + 1}</Text>
                  <Text style={[styles.tdText, styles.itemCell]}>{row.name}</Text>
                  <Text style={[styles.tdText, styles.detailCell]} numberOfLines={2}>{row.detail || ''}</Text>
                  <Text style={[styles.tdText, styles.amountCell]}>{formatMoney(row.amount)}</Text>
                </View>
              ))}
              <View style={[styles.tableRow, styles.totalTableRow]}>
                <Text style={[styles.tdText, styles.sttCell]}>{invoiceRows.length + 1}</Text>
                <Text style={[styles.tdText, styles.itemCell]} />
                <Text style={[styles.totalText, styles.detailCell]}>Cộng:</Text>
                <Text style={[styles.totalText, styles.amountCell]}>{formatMoney(total)}</Text>
              </View>
            </View>

            <View style={styles.paymentSection}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentTitle}>Phần Thanh toán:</Text>
                <PaymentLine label="Số tiền còn nợ tháng trước:" value={formatMoney(previousDebt)} />
                <PaymentLine label="Phải trả tháng này:" value={formatMoney(currentPayable)} />
                <PaymentLine label="Trả cọc:" value={formatMoney(depositReturn)} />
                <View style={styles.payableLine}>
                  <Text style={styles.payableLabel}>Thành tiền phải trả:</Text>
                  <Text style={styles.payableValue}>{formatMoney(outstanding)}</Text>
                </View>

                <View style={styles.bankLines}>
                  <TouchableOpacity onPress={() => sharePaymentValue('Nội dung chuyển khoản', paymentCode)}>
                    <Text style={styles.bankText}>Mã QR Code: <Text style={styles.bankStrong}>{paymentCode || '-'}</Text></Text>
                  </TouchableOpacity>
                  <Text style={styles.bankText}>Ngân hàng: <Text style={styles.bankStrong}>{bankLabel || '-'}</Text></Text>
                  <TouchableOpacity onPress={() => sharePaymentValue('Số tài khoản', accountNo)}>
                    <Text style={styles.bankText}>Số tài khoản: <Text style={styles.bankStrong}>{accountNo || '-'}</Text></Text>
                  </TouchableOpacity>
                  <Text style={styles.bankText}>Người thụ hưởng: <Text style={styles.bankStrong}>{accountName || '-'}</Text></Text>
                </View>
              </View>

              <View style={styles.qrReceiptBox}>
                {qrUrl ? (
                  <Image source={{ uri: qrUrl }} style={styles.receiptQr} resizeMode="contain" />
                ) : (
                  <View style={styles.receiptQrPlaceholder}>
                    <Ionicons name="qr-code-outline" size={30} color={Colors.textMuted} />
                    <Text style={styles.qrPlaceholderText}>Chưa có QR</Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Chia sẻ Zalo / Messenger"
            variant="outline"
            size="lg"
            fullWidth
            onPress={shareInvoiceImage}
            loading={sharingInvoice}
            disabled={sharingInvoice}
            icon={<Ionicons name="share-social-outline" size={18} color={Colors.textPrimary} />}
          />
          {total > 0 && paid < total && outstanding > 0 && (
            <Button
              title="Thu tiền"
              variant="success"
              size="lg"
              fullWidth
              onPress={() => router.push(`/payment/new?invoice_id=${id}`)}
              icon={<Ionicons name="cash-outline" size={18} color={Colors.textWhite} />}
            />
          )}
          <Button title="Xóa hóa đơn" variant="danger" size="md" fullWidth onPress={handleDelete} />
        </View>
      </ScrollView>
    </>
  );
}

function PaymentLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.paymentLine}>
      <Text style={styles.paymentLineLabel}>- {label}</Text>
      <Text style={styles.paymentLineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 12, paddingBottom: 40, gap: 12 },
  paperCard: { padding: 14, borderRadius: 8, backgroundColor: '#FFFEFB' },
  noticeTitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  recipientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  recipientCell: { width: '48%', minHeight: 38 },
  recipientLabel: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: '#111827' },
  recipientValue: { marginTop: 3, fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#111827' },
  recipientMuted: { marginTop: 3, fontSize: 12, fontFamily: Typography.fontFamily.medium, color: '#374151' },
  roomChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    borderRadius: 2,
    backgroundColor: '#BBF7D0',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  roomChipText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#166534' },
  statusText: { marginTop: 3, fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#B45309' },
  statusPaid: { color: Colors.success },
  invoiceTable: { borderWidth: 1, borderColor: '#111827', marginBottom: 18 },
  tableRow: { flexDirection: 'row', minHeight: 28, borderBottomWidth: 1, borderBottomColor: '#111827' },
  tableHead: { backgroundColor: '#F8FAFC' },
  totalTableRow: { borderBottomWidth: 0, backgroundColor: '#FFFEFB' },
  sttCell: { width: 34, borderRightWidth: 1, borderRightColor: '#111827' },
  itemCell: { width: 64, borderRightWidth: 1, borderRightColor: '#111827' },
  detailCell: { flex: 1, borderRightWidth: 1, borderRightColor: '#111827' },
  amountCell: { width: 86 },
  thText: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#111827',
  },
  tdText: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#111827',
  },
  totalText: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    textAlign: 'right',
    fontSize: 10,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#111827',
  },
  paymentSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  paymentLeft: { flex: 1, minWidth: 0 },
  paymentTitle: { fontSize: 12, fontFamily: Typography.fontFamily.extrabold, color: '#111827', textDecorationLine: 'underline', marginBottom: 5 },
  paymentLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  paymentLineLabel: { flex: 1, fontSize: 10, lineHeight: 14, fontFamily: Typography.fontFamily.medium, color: '#111827' },
  paymentLineValue: { minWidth: 70, textAlign: 'right', fontSize: 10, lineHeight: 14, fontFamily: Typography.fontFamily.medium, color: '#111827' },
  payableLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 3, marginBottom: 12 },
  payableLabel: { flex: 1, fontSize: 10, lineHeight: 14, fontFamily: Typography.fontFamily.extrabold, color: '#111827' },
  payableValue: { minWidth: 78, textAlign: 'right', fontSize: 11, lineHeight: 14, fontFamily: Typography.fontFamily.extrabold, color: '#111827' },
  bankLines: { gap: 6, marginTop: 4 },
  bankText: { fontSize: 10, lineHeight: 14, fontFamily: Typography.fontFamily.medium, color: '#111827' },
  bankStrong: { fontFamily: Typography.fontFamily.bold },
  qrReceiptBox: { width: 132, alignItems: 'center', justifyContent: 'center' },
  receiptQr: { width: 126, height: 126, backgroundColor: '#fff' },
  receiptQrPlaceholder: {
    width: 126,
    height: 126,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  qrPlaceholderText: { textAlign: 'center', fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  actions: { gap: 10, marginTop: 4 },
});
