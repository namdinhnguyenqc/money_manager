import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import DataErrorState from '@/components/ui/DataErrorState';
import { useFacilityStore } from '@/store/facilityStore';
import { logPerfEvent } from '@/lib/telemetry/appPerformance';

interface Facility {
  id: string;
  name: string;
  address?: string;
  room_count?: number;
  roomCount?: number;
  vacant_count?: number;
  vacantCount?: number;
  occupied_count?: number;
  occupiedCount?: number;
  maintenance_count?: number;
  maintenanceCount?: number;
}

type FilterStatus = 'all' | 'needsRooms' | 'hasVacancy' | 'occupied';

const filters: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'needsRooms', label: 'Chưa có phòng' },
  { value: 'hasVacancy', label: 'Còn trống' },
  { value: 'occupied', label: 'Đang cho thuê' },
];

export default function FacilitiesScreen() {
  const router = useRouter();
  const { facilities, fetchFacilities } = useFacilityStore();
  const [loading, setLoading] = useState(facilities.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const fetchData = useCallback(async (force = false) => {
    const tab = "facilities";
    logPerfEvent("SECONDARY_DATA_START", { tab, forceRefresh: force });
    try {
      setLoadError('');
      await fetchFacilities(force);
      logPerfEvent("TAB_DATA_READY_FACILITIES", { success: true, itemCount: useFacilityStore.getState().facilities.length });
      logPerfEvent("SECONDARY_DATA_READY", { tab, success: true });
    } catch (error: any) {
      setLoadError(error?.message || 'Không thể tải danh sách dãy trọ.');
      logPerfEvent("TAB_DATA_READY_FACILITIES", { success: false, message: String(error?.message || error) });
      logPerfEvent("SECONDARY_DATA_READY", { tab, success: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchFacilities]);

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const totals = useMemo(() => {
    return facilities.reduce(
      (acc, item) => {
        acc.facilities += 1;
        acc.rooms += Number(item.room_count ?? item.roomCount ?? 0);
        acc.vacant += Number(item.vacant_count ?? item.vacantCount ?? 0);
        acc.occupied += Number(item.occupied_count ?? item.occupiedCount ?? 0);
        return acc;
      },
      { facilities: 0, rooms: 0, vacant: 0, occupied: 0 }
    );
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return facilities.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query) || (item.address || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (statusFilter === 'needsRooms') return Number(item.room_count ?? item.roomCount ?? 0) === 0;
      if (statusFilter === 'hasVacancy') return Number(item.vacant_count ?? item.vacantCount ?? 0) > 0;
      if (statusFilter === 'occupied') return Number(item.occupied_count ?? item.occupiedCount ?? 0) > 0;
      return true;
    });
  }, [facilities, searchQuery, statusFilter]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonList}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </View>
    );
  }

  if (loadError && facilities.length === 0) {
    return <DataErrorState message={loadError} onRetry={() => { setLoading(true); fetchData(true); }} />;
  }

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.statsGrid} accessibilityLabel={`${totals.facilities} dãy, ${totals.rooms} phòng, ${totals.vacant} phòng trống, ${totals.occupied} phòng đã thuê`}>
        <StatBox label="Cơ sở" value={totals.facilities} />
        <StatBox label="Phòng" value={totals.rooms} />
        <StatBox label="Trống" value={totals.vacant} tone="success" />
        <StatBox label="Đã thuê" value={totals.occupied} tone="info" />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          placeholder="Tìm cơ sở hoặc địa chỉ"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor={Colors.textMuted}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {filters.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.filterChip, statusFilter === item.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(item.value)}
            activeOpacity={0.72}
          >
            <Text style={[styles.filterText, statusFilter === item.value && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredFacilities}
        keyExtractor={(item) => item.id}
        initialNumToRender={8}
        windowSize={7}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        ListHeaderComponent={renderHeader}
        onContentSizeChange={() => logPerfEvent("LIST_RENDER_DONE", { screen: "facilities", itemCount: filteredFacilities.length })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyPanel}>
            <Ionicons name="business-outline" size={42} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{searchQuery ? 'Không tìm thấy cơ sở' : 'Bắt đầu bằng một cơ sở'}</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Tạo cơ sở trước, sau đó thêm phòng để bắt đầu quản lý khách thuê.'}
            </Text>
            {!searchQuery ? <Button title="Tạo cơ sở" size="sm" onPress={() => router.push('/facility/new' as any)} style={{ marginTop: 14 }} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.facilityCard} onPress={() => router.push(`/facility/${item.id}` as any)} activeOpacity={0.74}>
            <View style={styles.cardHeader}>
              <View style={styles.facilityIcon}>
                <Ionicons name="business-outline" size={19} color={Colors.primary} />
              </View>
              <View style={styles.facilityInfo}>
                <Text style={styles.facilityName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.facilityAddress} numberOfLines={1}>{item.address || 'Chưa cập nhật địa chỉ'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
            </View>
            <View style={styles.roomSummary}>
              <RoomCount label="Tổng" value={item.room_count ?? item.roomCount ?? 0} />
              <RoomCount label="Trống" value={item.vacant_count ?? item.vacantCount ?? 0} tone="success" />
              <RoomCount label="Đã thuê" value={item.occupied_count ?? item.occupiedCount ?? 0} tone="info" />
              <RoomCount label="Bảo trì" value={item.maintenance_count ?? item.maintenanceCount ?? 0} tone="warning" />
            </View>
          </TouchableOpacity>
        )}
      />

    </View>
  );
}

function StatBox({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'info' }) {
  const color = tone === 'success' ? Colors.success : tone === 'info' ? Colors.primary : Colors.textPrimary;
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RoomCount({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'info' | 'warning' }) {
  const color = tone === 'success' ? Colors.success : tone === 'info' ? Colors.primary : tone === 'warning' ? Colors.warning : Colors.textPrimary;
  return (
    <View style={styles.roomCount}>
      <Text style={[styles.roomValue, { color }]}>{value}</Text>
      <Text style={styles.roomLabel}>{label}</Text>
    </View>
  );
}

function MiniAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.miniAction} onPress={onPress} activeOpacity={0.72}>
      <Ionicons name={icon} size={15} color={Colors.primary} />
      <Text style={styles.miniActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  skeletonList: { padding: 16, gap: 12 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 104, gap: 14 },
  headerContent: { gap: 12, marginBottom: 4 },
  statsGrid: { flexDirection: 'row', paddingVertical: 13, borderRadius: 16, backgroundColor: Colors.surface },
  statBox: { flex: 1, minWidth: 0, paddingHorizontal: 10, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#E2E8F0' },
  statValue: { fontSize: 18, lineHeight: 24, fontFamily: Typography.fontFamily.bold },
  statLabel: { marginTop: 1, fontSize: 10.5, lineHeight: 15, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12 },
  searchInput: { flex: 1, padding: 0, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textPrimary },
  filterScroll: { gap: 8 },
  filterChip: { height: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryAlpha50 },
  filterText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary },
  emptyPanel: { alignItems: 'center', paddingVertical: 54, paddingHorizontal: 28 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  emptyDesc: { marginTop: 5, fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
  facilityCard: { gap: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#E2E8F0', padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  facilityIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  facilityInfo: { flex: 1, minWidth: 0 },
  facilityName: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  facilityAddress: { marginTop: 3, fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
  roomStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  roomStatusDot: { width: 6, height: 6, borderRadius: 3 },
  roomStatusText: { fontSize: 10.5, fontFamily: Typography.fontFamily.semibold },
  roomMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  roomMetaItem: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomMetaText: { flex: 1, fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  roomPrice: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  roomSummary: { flexDirection: 'row', gap: 8 },
  roomCount: { flex: 1, minWidth: 0, paddingVertical: 7, alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#E2E8F0' },
  roomValue: { fontSize: 15, fontFamily: Typography.fontFamily.bold },
  roomLabel: { marginTop: 2, fontSize: 10, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  actionRow: { flexDirection: 'row', gap: 8 },
  miniAction: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  miniActionText: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
});
