/**
 * TrọCare Tenant Mobile — Invoice Details & Payment QR Screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { apiGet } from '@/lib/api';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);

  const fetchInvoiceDetails = async () => {
    try {
      const res = await apiGet<any>(`/tenant/invoices/${id}`);
      setInvoice(res?.data ?? res);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lấy thông tin chi tiết hóa đơn.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchInvoiceDetails();
  }, [id]);

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace(/\s/g, '');
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Đã sao chép 📋', `Đã sao chép ${label} vào bộ nhớ tạm.`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!invoice) return null;

  const room = invoice.rooms;
  const channel = invoice.paymentChannel;
  const items = invoice.items || [];
  const isUnpaid = invoice.status !== 'paid';
  const remainingAmount = Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount));

  // VietQR generation parameters
  const vietQrUrl = channel
    ? `https://img.vietqr.io/image/${channel.bank_id || channel.bankId || 'vietcombank'}-${channel.account_no || channel.accountNo || ''}-compact2.png?amount=${remainingAmount}&addInfo=${invoice.payment_code || ''}&accountName=${encodeURIComponent(channel.account_name || channel.accountName || '')}`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết hóa đơn</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Invoice Overview */}
      <Card style={styles.overviewCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.invoiceMonth}>Hóa đơn tháng {invoice.month}/{invoice.year}</Text>
          <StatusBadge status={invoice.status} type="invoice" />
        </View>
        <Text style={styles.roomLabel}>Phòng: {room?.name || 'Phòng trọ'}</Text>
        <Text style={styles.houseLabel}>{room?.boarding_houses?.name || 'Nhà trọ'}</Text>
      </Card>

      {/* Invoice Items Table */}
      <Card style={styles.itemsCard}>
        <Text style={styles.cardTitle}>Chi tiết các khoản mục</Text>

        {/* Room Fee Row */}
        <View style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <Ionicons name="home-outline" size={16} color="#64748B" />
            <Text style={styles.itemName}>Tiền phòng</Text>
          </View>
          <Text style={styles.itemPrice}>{formatMoney(invoice.room_fee)}</Text>
        </View>

        {/* Dynamic Items */}
        {items.map((item: any) => {
          const detailIcon = item.name.toLowerCase().includes('dien')
            ? 'flash-outline'
            : item.name.toLowerCase().includes('nuoc')
            ? 'water-outline'
            : item.name.toLowerCase().includes('wifi') || item.name.toLowerCase().includes('internet')
            ? 'wifi-outline'
            : 'cube-outline';

          return (
            <View key={item.id}>
              <View style={styles.itemDivider} />
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemLeft}>
                    <Ionicons name={detailIcon} size={16} color="#64748B" />
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  {item.detail && <Text style={styles.itemDetail}>{item.detail}</Text>}
                </View>
                <Text style={styles.itemPrice}>{formatMoney(item.amount)}</Text>
              </View>
            </View>
          );
        })}

        {/* Total details */}
        <View style={[styles.itemDivider, { backgroundColor: '#CBD5E1', height: 1.5 }]} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalPrice}>{formatMoney(invoice.total_amount)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.paidLabel}>Đã thanh toán</Text>
          <Text style={styles.paidPrice}>{formatMoney(invoice.paid_amount)}</Text>
        </View>

        {isUnpaid && (
          <View style={[styles.totalRow, { marginTop: 4 }]}>
            <Text style={styles.dueLabel}>Còn thiếu</Text>
            <Text style={styles.duePrice}>{formatMoney(remainingAmount)}</Text>
          </View>
        )}
      </Card>

      {/* 💳 VietQR Payment Section */}
      {isUnpaid && channel && vietQrUrl && (
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>Quét mã QR để chuyển khoản</Text>
          
          <Card style={styles.qrCard}>
            <Image
              source={{ uri: vietQrUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            
            <View style={styles.qrInfoContainer}>
              <Text style={styles.qrWarning}>Chuyển khoản chính xác số tiền và nội dung dưới đây để hệ thống tự động kích hoạt xác nhận ngay lập tức.</Text>

              <View style={styles.qrFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldTitle}>Ngân hàng</Text>
                  <Text style={styles.fieldVal}>{channel.display_name || channel.bank_id.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.qrFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldTitle}>Số tài khoản</Text>
                  <Text style={styles.fieldVal}>{channel.account_no}</Text>
                </View>
                <TouchableOpacity
                  style={styles.btnCopy}
                  onPress={() => copyToClipboard(channel.account_no, 'số tài khoản')}
                >
                  <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                  <Text style={styles.btnCopyText}>Copy</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.qrFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldTitle}>Tên tài khoản</Text>
                  <Text style={styles.fieldVal}>{channel.account_name}</Text>
                </View>
              </View>

              <View style={styles.qrFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldTitle}>Số tiền chuyển</Text>
                  <Text style={[styles.fieldVal, { color: Colors.danger, fontFamily: Typography.fontFamily.bold }]}>
                    {formatMoney(remainingAmount)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnCopy}
                  onPress={() => copyToClipboard(remainingAmount.toString(), 'số tiền')}
                >
                  <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                  <Text style={styles.btnCopyText}>Copy</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.qrFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldTitle}>Nội dung chuyển khoản (Bắt buộc)</Text>
                  <Text style={[styles.fieldVal, { color: Colors.primary, fontFamily: Typography.fontFamily.extrabold }]}>
                    {invoice.payment_code}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnCopy}
                  onPress={() => copyToClipboard(invoice.payment_code, 'nội dung chuyển khoản')}
                >
                  <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                  <Text style={styles.btnCopyText}>Copy</Text>
                </TouchableOpacity>
              </View>

            </View>
          </Card>
        </View>
      )}

      {isUnpaid && !channel && (
        <Card style={styles.noPaymentChannelCard}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.warning} />
          <Text style={styles.noPaymentText}>Chủ trọ hiện chưa thiết lập kênh thanh toán ngân hàng tự động cho hóa đơn này. Vui lòng liên hệ trực tiếp chủ trọ để thanh toán.</Text>
        </Card>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  btnBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  headerTitle: {
    fontSize: 16.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  overviewCard: {
    padding: 16,
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceMonth: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  roomLabel: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    marginTop: 8,
  },
  houseLabel: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  itemsCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },
  itemDetail: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 2,
    paddingLeft: 24,
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  itemDivider: {
    height: 0.8,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  totalPrice: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#0F172A',
  },
  paidLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.success,
  },
  paidPrice: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.success,
  },
  dueLabel: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
  duePrice: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.extrabold,
    color: Colors.danger,
  },
  qrSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 12,
    paddingLeft: 4,
  },
  qrCard: {
    padding: 20,
    alignItems: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEF',
    borderRadius: 12,
  },
  qrInfoContainer: {
    width: '100%',
    gap: 12,
  },
  qrWarning: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.danger,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  qrFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 0.8,
    borderBottomColor: '#EAEAEF',
  },
  fieldTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  fieldVal: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  btnCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 113, 227, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnCopyText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  noPaymentChannelCard: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  noPaymentText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
