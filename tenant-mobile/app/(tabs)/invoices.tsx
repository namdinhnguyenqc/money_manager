/**
 * TrọCare Tenant Mobile — Invoice List Tab
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid'>('all');

  const fetchInvoices = async () => {
    try {
      const res = await apiGet<any>('/tenant/invoices');
      setInvoices(res?.data ?? res ?? []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
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

  const renderInvoiceItem = ({ item }: { item: any }) => {
    const isUnpaid = item.status !== 'paid';
    const remaining = Math.max(0, Number(item.total_amount) - Number(item.paid_amount));

    return (
      <Card style={styles.invoiceCard}>
        <TouchableOpacity
          onPress={() => router.push(`/invoice/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.invoiceMonth}>Tháng {item.month}/{item.year}</Text>
              <Text style={styles.roomName}>Phòng: {item.rooms?.name || 'Phòng trọ'}</Text>
            </View>
            <StatusBadge status={item.status} type="invoice" />
          </View>

          <View style={styles.divider} />

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

          {isUnpaid && (
            <View style={styles.payNowRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => router.push(`/invoice/${item.id}`)}
              >
                <Text style={styles.payBtnText}>Thanh toán ngay</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      
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
          <Text style={styles.emptyText}>Không tìm thấy hóa đơn nào.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6', // Matte Snow White
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
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
    paddingTop: 16,
    paddingBottom: 90, // Safe bottom tabs dock padding
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
  payNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.8,
    borderTopColor: '#EAEAEF',
  },
  payBtn: {
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
