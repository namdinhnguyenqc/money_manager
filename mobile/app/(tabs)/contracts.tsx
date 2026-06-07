/**
 * TrọCare Mobile — Contracts List Screen
 * Lists lease contracts with filter tabs and status badges.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { ListItemSkeleton } from '@/components/ui/Skeleton';
import { apiGet } from '@/lib/api';

const formatMoney = (value?: number | null) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} ₫`;

type FilterTab = 'Tất cả' | 'Đang thuê' | 'Sắp hết HĐ' | 'Đã kết thúc';
const TABS: FilterTab[] = ['Tất cả', 'Đang thuê', 'Sắp hết HĐ', 'Đã kết thúc'];

function getContractStatus(contract: any): string {
  if (contract.status === 'terminated' || contract.status === 'ended') return 'ended';
  if (contract.is_expired) return 'expired';
  if (contract.end_date) {
    const end = new Date(contract.end_date).getTime();
    const now = Date.now();
    if (end >= now && end - now <= 30 * 24 * 60 * 60 * 1000) return 'expiring_soon';
  }
  return 'active';
}

function matchesFilter(contract: any, filter: FilterTab): boolean {
  if (filter === 'Tất cả') return true;
  const status = getContractStatus(contract);
  if (filter === 'Đang thuê') return status === 'active';
  if (filter === 'Sắp hết HĐ') return status === 'expiring_soon';
  if (filter === 'Đã kết thúc') return status === 'ended' || status === 'expired';
  return false;
}

export default function ContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('Tất cả');

  const fetchData = useCallback(async () => {
    try {
      const res = await apiGet<any>('/rental/contracts');
      setContracts(res?.data ?? []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = useMemo(() => contracts.filter((c) => matchesFilter(c, activeTab)), [contracts, activeTab]);

  if (loading) {
    return <View style={styles.container}>{[1,2,3,4].map(i => <ListItemSkeleton key={i} />)}</View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="document-text-outline" title="Không có hợp đồng" description="Chưa có hợp đồng nào." actionLabel="Tạo hợp đồng" onAction={() => router.push('/contract/new')} />
        }
        renderItem={({ item }) => {
          const status = getContractStatus(item);
          return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/contract/${item.id}`)} activeOpacity={0.7}>
              <View style={styles.rowIcon}>
                <Ionicons name="document-text" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tenantName}>{item.tenant_name || 'Khách thuê'}</Text>
                <Text style={styles.meta}>
                  {item.room_name || 'Phòng'} · {formatMoney(item.rent_amount)}
                </Text>
                {item.end_date && (
                  <Text style={styles.meta}>
                    Hết hạn: {new Date(item.end_date).toLocaleDateString('vi-VN')}
                  </Text>
                )}
              </View>
              <StatusBadge status={status} type="contract" />
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/contract/new')} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={Colors.textWhite} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabScroll: { maxHeight: 50, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center', paddingVertical: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, gap: 12,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  tenantName: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, letterSpacing: -0.2 },
  meta: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
});
