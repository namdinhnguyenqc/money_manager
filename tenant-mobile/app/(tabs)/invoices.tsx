/**
 * TrọCare Tenant Mobile — Invoice List Tab
 * Shows full monthly invoice history with item breakdown
 */

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, LayoutAnimation
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { apiGet } from '@/lib/api';

export default function InvoiceListTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      console.log('[Invoices] Fetching /tenant/invoices...');
      const res = await apiGet<any>('/tenant/invoices');
      console.log('[Invoices] Response:', JSON.stringify(res)?.slice(0, 200));
      const data = res?.data ?? res ?? [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Invoices] Error fetching invoices:', err?.message, err?.status);
      setError(err?.message || 'Không thể tải hóa đơn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices(true);
  };

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace(/\s/g, '');
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === 'unpaid') return inv.status !== 'paid';
    if (activeTab === 'paid') return inv.status === 'paid';
    return true;
  });

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const renderInvoiceItem = ({ item }: { item: any }) => {
    const isUnpaid = item.status !== 'paid';
    const remaining = Math.max(0, Number(item.total_amount) - Number(item.paid_amount ?? 0));
    const isExpanded = expandedId === item.id;
    const items: any[] = item.invoice_items ?? [];
    const elecUsed = item.elec_new != null && item.elec_old != null ? item.elec_new - item.elec_old : null;
    const waterUsed = item.water_new != null && item.water_old != null ? item.water_new - item.water_old : null;

    return (
      <Card style={styles.invoiceCard}>
        {/* ── Header row */}
        <TouchableOpacity onPress={() => toggleExpand(item.id)} activeOpacity={0.75}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.invoiceMonth}>Tháng {item.month}/{item.year}</Text>
              <Text style={styles.roomName}>
                {item.rooms?.name || 'Phòng trọ'}
                {item.rooms?.boarding_houses?.name ? ` · ${item.rooms.boarding_houses.name}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <StatusBadge status={item.status} type="invoice" />
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Colors.textMuted}
              />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* ── Price summary */}
        <View style={styles.priceSection}>
          <View>
            <Text style={styles.priceLabel}>Tổng hóa đơn</Text>
            <Text style={styles.priceValue}>{formatMoney(item.total_amount)}</Text>
          </View>

          {isUnpaid ? (
            <View style={styles.unpaidBox}>
              <Text style={styles.unpaidLabel}>Còn thiếu</Text>
              <Text style={styles.unpaidValue}>{formatMoney(remaining)}</Text>
            </View>
          ) : (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.paidBadgeText}>Đã trả đủ</Text>
            </View>
          )}
        </View>

        {/* ── Expanded detail section */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            
            {/* Utility readings */}
            {(elecUsed !== null || waterUsed !== null) && (
              <View style={styles.utilityRow}>
                {elecUsed !== null && (
                  <View style={styles.utilityChip}>
                    <Ionicons name="flash-outline" size={13} color="#EAB308" />
                    <Text style={styles.utilityText}>{elecUsed} kWh</Text>
                    <Text style={styles.utilitySubtext}>({item.elec_old}→{item.elec_new})</Text>
                  </View>
                )}
                {waterUsed !== null && (
                  <View style={styles.utilityChip}>
                    <Ionicons name="water-outline" size={13} color="#0071e3" />
                    <Text style={styles.utilityText}>{waterUsed} m³</Text>
                    <Text style={styles.utilitySubtext}>({item.water_old}→{item.water_new})</Text>
                  </View>
                )}
              </View>
            )}

            {/* Invoice items breakdown */}
            <View style={styles.itemsSection}>
              <Text style={styles.itemsSectionTitle}>Chi tiết các khoản</Text>
              
              {/* Room Fee */}
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemName}>Tiền phòng</Text>
                </View>
                <Text style={styles.itemAmount}>{formatMoney(item.room_fee)}</Text>
              </View>

              {/* Other Items */}
              {items.map((it: any, idx: number) => (
                <View key={it.id || idx} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemName}>{it.name}</Text>
                  </View>
                  <Text style={styles.itemAmount}>{formatMoney(it.amount)}</Text>
                </View>
              ))}
              
              <View style={styles.itemsTotalRow}>
                <Text style={styles.itemsTotalLabel}>Tổng cộng</Text>
                <Text style={styles.itemsTotalValue}>{formatMoney(item.total_amount)}</Text>
              </View>
            </View>

            {/* Payment code */}
            {item.payment_code && (
              <View style={styles.paymentCodeRow}>
                <Ionicons name="barcode-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.paymentCodeLabel}>Mã thanh toán:</Text>
                <Text style={styles.paymentCodeValue}>{item.payment_code}</Text>
              </View>
            )}

            {isUnpaid && (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => router.push(`/invoice/${item.id}`)}
                activeOpacity={0.85}
              >
                <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                <Text style={styles.payBtnText}>Xem chi tiết & Thanh toán</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick action button for unpaid (collapsed) */}
        {!isExpanded && isUnpaid && (
          <View style={styles.payNowRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.payBtnSmall}
              onPress={() => router.push(`/invoice/${item.id}`)}
            >
              <Text style={styles.payBtnText}>Thanh toán ngay</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  // Summary stats
  const unpaidCount = invoices.filter(i => i.status !== 'paid').length;
  const unpaidTotal = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + Math.max(0, Number(i.total_amount) - Number(i.paid_amount ?? 0)), 0);

  return (
    <View style={styles.container}>

      {/* Summary banner */}
      {!loading && unpaidCount > 0 && (
        <View style={styles.summaryBanner}>
          <View style={styles.summaryLeft}>
            <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
            <Text style={styles.summaryText}>
              {unpaidCount} hóa đơn chưa thanh toán
            </Text>
          </View>
          <Text style={styles.summaryAmount}>{new Intl.NumberFormat('vi-VN').format(unpaidTotal)}đ</Text>
        </View>
      )}

      {/* Segmented Control Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'unpaid', 'paid'] as const).map((tab) => {
          const label = tab === 'all' ? 'Tất cả' : tab === 'unpaid' ? 'Chưa trả' : 'Đã trả';
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Đang tải hóa đơn...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
          <Text style={[styles.emptyText, { marginTop: 12, color: Colors.danger }]}>{error}</Text>
          <TouchableOpacity
            style={{ marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
            onPress={() => fetchInvoices()}
          >
            <Text style={{ color: '#fff', fontFamily: Typography.fontFamily.semibold, fontSize: 14 }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredInvoices.length > 0 ? (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoiceItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            {activeTab === 'unpaid' ? 'Không có hóa đơn chưa thanh toán.' :
             activeTab === 'paid' ? 'Chưa có hóa đơn nào đã thanh toán.' :
             'Bạn chưa có hóa đơn nào từ chủ trọ.'}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 12, padding: 10 }}
            onPress={() => fetchInvoices()}
          >
            <Text style={{ color: Colors.primary, fontFamily: Typography.fontFamily.medium, fontSize: 13 }}>↻ Làm mới</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  summaryAmount: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 3.5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tabLabel: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  activeTabLabel: {
    color: '#0F172A',
    fontFamily: Typography.fontFamily.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
  },
  invoiceCard: {
    marginBottom: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceMonth: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  roomName: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEF',
    marginVertical: 12,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#0F172A',
    marginTop: 2,
  },
  unpaidBox: {
    alignItems: 'flex-end',
  },
  unpaidLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.danger,
    textTransform: 'uppercase',
  },
  unpaidValue: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extrabold,
    color: Colors.danger,
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.success,
  },
  // ── Expanded Section
  expandedSection: {
    marginTop: 14,
    borderTopWidth: 0.8,
    borderTopColor: '#EAEAEF',
    paddingTop: 12,
    gap: 10,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  utilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  utilityText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },
  utilitySubtext: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
  },
  itemsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  itemsSectionTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    opacity: 0.5,
  },
  itemName: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#334155',
    flex: 1,
  },
  itemAmount: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  itemsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.8,
    borderTopColor: '#E2E8F0',
  },
  itemsTotalLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    textTransform: 'uppercase',
  },
  itemsTotalValue: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.extrabold,
    color: Colors.primary,
  },
  paymentCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  paymentCodeLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  paymentCodeValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
    flex: 1,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.8,
    borderTopColor: '#EAEAEF',
  },
  payBtnSmall: {
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
});
