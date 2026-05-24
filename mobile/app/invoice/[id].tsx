/**
 * TrọCare Mobile — Invoice Detail Screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { apiGet, apiDelete } from '@/lib/api';

const formatMoney = (v?: number | null) => `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(v || 0)))} ₫`;

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<any>(`/invoices/${id}`)
      .then((res) => setInvoice(res?.data ?? res))
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
  const outstanding = total - paid;
  const status = paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'sent';
  const items = invoice.items || [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: `Hóa đơn T${invoice.month}/${invoice.year}`, headerBackTitle: 'Quay lại' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.roomName}>{invoice.room_name || 'Phòng'}</Text>
              <Text style={styles.tenant}>{invoice.tenant_name || 'Khách thuê'}</Text>
            </View>
            <StatusBadge status={status} type="invoice" />
          </View>
          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Tổng tiền</Text>
              <Text style={styles.amountValue}>{formatMoney(total)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Đã thanh toán</Text>
              <Text style={[styles.amountValue, { color: Colors.successDark }]}>{formatMoney(paid)}</Text>
            </View>
            {outstanding > 0 && (
              <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 6 }]}>
                <Text style={styles.outstandingLabel}>Còn lại</Text>
                <Text style={styles.outstandingValue}>{formatMoney(outstanding)}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Items */}
        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Chi tiết</Text>
          {items.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.detail && <Text style={styles.itemDetail}>{item.detail}</Text>}
              </View>
              <Text style={styles.itemAmount}>{formatMoney(item.amount)}</Text>
            </View>
          ))}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          {outstanding > 0 && (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  headerCard: { padding: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  roomName: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.3 },
  tenant: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  amountSection: { gap: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  amountValue: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  outstandingLabel: { fontSize: 15, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  outstandingValue: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.danger, letterSpacing: -0.5 },
  itemsCard: { padding: 18 },
  sectionTitle: { fontSize: 15, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, marginBottom: 12, letterSpacing: -0.2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemName: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textPrimary },
  itemDetail: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 1 },
  itemAmount: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  actions: { gap: 10, marginTop: 4 },
});
