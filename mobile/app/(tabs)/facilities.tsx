/**
 * TrọCare Mobile — Facilities List Screen (Senior PO Redesign)
 * Lists boarding houses with room count summaries, search, quick filter tabs,
 * an onboarding checklist roadmap for new users, and quick operation buttons in cards.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useFacilityStore } from '@/store/facilityStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Facility {
  id: string;
  name: string;
  address?: string;
  status?: string;
  isPublic?: boolean;
  room_count?: number;
  vacant_count?: number;
  occupied_count?: number;
  maintenance_count?: number;
}

type FilterStatus = 'all' | 'vacant' | 'full' | 'maintenance';

export default function FacilitiesScreen() {
  const router = useRouter();
  const { facilities, fetchFacilities } = useFacilityStore();
  const [loading, setLoading] = useState(facilities.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // PO Features: Search, Filters, and Onboarding Checklist
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showRoadmap, setShowRoadmap] = useState(true);

  const fetchData = useCallback(async (force = false) => {
    try {
      await fetchFacilities(force);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchFacilities]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);
  useFocusEffect(useCallback(() => { fetchData(true); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // Toggle onboarding checklist collapse
  const toggleRoadmap = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRoadmap(!showRoadmap);
  };

  // PO Filtering: Search query & Status Filter
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      // 1. Search Query filter (matches Name or Address)
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.address || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Status Segment filter
      if (statusFilter === 'all') return true;
      if (statusFilter === 'vacant') return (f.vacant_count ?? 0) > 0;
      if (statusFilter === 'full') return (f.occupied_count ?? 0) === (f.room_count ?? 0) && (f.room_count ?? 0) > 0;
      if (statusFilter === 'maintenance') return (f.maintenance_count ?? 0) > 0;

      return true;
    });
  }, [facilities, searchQuery, statusFilter]);

  // Compute overall totals for filter badges
  const statsCounts = useMemo(() => {
    let vacant = 0;
    let full = 0;
    let maint = 0;

    facilities.forEach((f) => {
      if ((f.vacant_count ?? 0) > 0) vacant++;
      if ((f.occupied_count ?? 0) === (f.room_count ?? 0) && (f.room_count ?? 0) > 0) full++;
      if ((f.maintenance_count ?? 0) > 0) maint++;
    });

    return { all: facilities.length, vacant, full, maint };
  }, [facilities]);

  // Checklist completion calculation
  const roadmapProgress = useMemo(() => {
    let completedSteps = 0;
    if (facilities.length > 0) completedSteps++; // Step 1: Created building
    
    // Check if any facility has rooms
    const hasRooms = facilities.some((f) => (f.room_count ?? 0) > 0);
    if (hasRooms) completedSteps++; // Step 2: Created rooms
    
    // Check if any facility has tenants/occupied rooms
    const hasOccupants = facilities.some((f) => (f.occupied_count ?? 0) > 0);
    if (hasOccupants) {
      completedSteps += 2; // Step 3 & 4: Registered tenants and created contracts
    }

    return completedSteps;
  }, [facilities]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonList}>
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  // Header Component (Search, Filters, and Roadmap)
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Input */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Tìm tên dãy trọ, địa chỉ..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor={Colors.textMuted}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Segment Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'all' && styles.filterPillActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterText, statusFilter === 'all' && styles.filterTextActive]}>
              Tất cả ({statsCounts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'vacant' && styles.filterPillActive]}
            onPress={() => setStatusFilter('vacant')}
          >
            <View style={[styles.statusDot, { backgroundColor: Colors.successDark }]} />
            <Text style={[styles.filterText, statusFilter === 'vacant' && styles.filterTextActive]}>
              Trống phòng ({statsCounts.vacant})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'full' && styles.filterPillActive]}
            onPress={() => setStatusFilter('full')}
          >
            <View style={[styles.statusDot, { backgroundColor: Colors.appleBlue }]} />
            <Text style={[styles.filterText, statusFilter === 'full' && styles.filterTextActive]}>
              Kín phòng ({statsCounts.full})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'maintenance' && styles.filterPillActive]}
            onPress={() => setStatusFilter('maintenance')}
          >
            <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
            <Text style={[styles.filterText, statusFilter === 'maintenance' && styles.filterTextActive]}>
              Bảo trì ({statsCounts.maint})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Onboarding Roadmap Banner */}
      <Card style={styles.roadmapCard}>
        <TouchableOpacity style={styles.roadmapHeader} onPress={toggleRoadmap} activeOpacity={0.7}>
          <View style={styles.roadmapTitleContainer}>
            <Ionicons name="map-outline" size={18} color={Colors.primary} />
            <Text style={styles.roadmapTitle}>Lộ Trình Thiết Lập Vận Hành</Text>
          </View>
          <View style={styles.roadmapHeaderRight}>
            <Text style={styles.roadmapProgressText}>{roadmapProgress}/4 hoàn thành</Text>
            <Ionicons name={showRoadmap ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>

        {showRoadmap && (
          <View style={styles.roadmapBody}>
            <Text style={styles.roadmapSubtitle}>
              Thực hiện các bước thiết lập cơ bản để ứng dụng bắt đầu tự động tính toán tài chính & lập hóa đơn cho bạn.
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(roadmapProgress / 4) * 100}%` }]} />
            </View>

            <View style={styles.roadmapSteps}>
              {/* Step 1: Created Boarding House */}
              <View style={styles.stepItem}>
                <Ionicons
                  name={facilities.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={facilities.length > 0 ? Colors.successDark : Colors.textMuted}
                />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepText, facilities.length > 0 && styles.stepCompleted]}>
                    Bước 1: Đăng ký dãy trọ
                  </Text>
                  <Text style={styles.stepSubText}>Thiết lập tên tòa nhà và địa chỉ liên kết.</Text>
                </View>
              </View>

              {/* Step 2: Create Rooms */}
              <TouchableOpacity
                style={styles.stepItem}
                onPress={() => {
                  if (facilities.length > 0) {
                    router.push({ pathname: '/room/new', params: { facility_id: facilities[0].id } });
                  } else {
                    router.push('/facility/new');
                  }
                }}
              >
                <Ionicons
                  name={roadmapProgress >= 2 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={roadmapProgress >= 2 ? Colors.successDark : Colors.textMuted}
                />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepText, roadmapProgress >= 2 && styles.stepCompleted]}>
                    Bước 2: Tạo sơ đồ phòng trọ ➔
                  </Text>
                  <Text style={styles.stepSubText}>Thiết lập phòng, kích thước & giá thuê định kỳ.</Text>
                </View>
              </TouchableOpacity>

              {/* Step 3: Register Tenants */}
              <TouchableOpacity style={styles.stepItem} onPress={() => router.push('/tenants')}>
                <Ionicons
                  name={roadmapProgress >= 3 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={roadmapProgress >= 3 ? Colors.successDark : Colors.textMuted}
                />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepText, roadmapProgress >= 3 && styles.stepCompleted]}>
                    Bước 3: Nhập thông tin khách thuê ➔
                  </Text>
                  <Text style={styles.stepSubText}>Lưu số điện thoại, lý lịch cư dân để liên lạc.</Text>
                </View>
              </TouchableOpacity>

              {/* Step 4: Create Contract */}
              <TouchableOpacity
                style={styles.stepItem}
                onPress={() => {
                  if (facilities.length > 0) {
                    router.push({ pathname: '/contract/new', params: { facility_id: facilities[0].id } });
                  } else {
                    router.push('/facility/new');
                  }
                }}
              >
                <Ionicons
                  name={roadmapProgress >= 4 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={roadmapProgress >= 4 ? Colors.successDark : Colors.textMuted}
                />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepText, roadmapProgress >= 4 && styles.stepCompleted]}>
                    Bước 4: Thiết lập hợp đồng ➔
                  </Text>
                  <Text style={styles.stepSubText}>Ký kết ngày bắt đầu ở để tự động hóa đơn hàng tháng.</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredFacilities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          searchQuery.length > 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
              <Text style={styles.emptyDesc}>Không tìm thấy dãy trọ nào phù hợp với từ khóa "{searchQuery}".</Text>
            </Card>
          ) : (
            <EmptyState
              icon="business-outline"
              title="Chưa có dãy trọ nào"
              description="Thêm dãy trọ đầu tiên của bạn để bắt đầu khởi tạo phòng, khách thuê và lập hóa đơn tự động."
              actionLabel="Đăng ký dãy trọ ngay"
              onAction={() => router.push('/facility/new')}
            />
          )
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/facility/${item.id}`)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="business" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.address && (
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color={Colors.textMuted} /> {item.address}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>

            {/* Room stats chips */}
            <View style={styles.statsRow}>
              <StatChip label="Tổng số" value={item.room_count ?? 0} color={Colors.textSecondary} />
              <StatChip label="Còn trống" value={item.vacant_count ?? 0} color={Colors.successDark} />
              <StatChip label="Đã thuê" value={item.occupied_count ?? 0} color={Colors.appleBlue} />
              <StatChip label="Bảo trì" value={item.maintenance_count ?? 0} color={Colors.warning} />
            </View>

            {/* Quick Operations Line & Actions */}
            <View style={styles.divider} />
            
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push({ pathname: '/room/new', params: { facility_id: item.id } })}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={15} color={Colors.primary} />
                <Text style={styles.quickActionText}>+ Phòng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push('/tenants')}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={15} color={Colors.primary} />
                <Text style={styles.quickActionText}>+ Khách</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push({ pathname: '/contract/new', params: { facility_id: item.id } })}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={15} color={Colors.primary} />
                <Text style={styles.quickActionText}>+ Ký HĐ</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      {/* Primary Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/facility/new')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.textWhite} />
      </TouchableOpacity>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  skeletonList: { padding: 16, gap: 12 },
  
  headerContainer: {
    gap: 12,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    padding: 0,
  },

  filterContainer: {
    marginHorizontal: -16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  roadmapCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    padding: 14,
  },
  roadmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roadmapTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roadmapTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  roadmapHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roadmapProgressText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  roadmapBody: {
    marginTop: 10,
  },
  roadmapSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  roadmapSteps: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 10,
  },
  stepContent: {
    flex: 1,
    marginTop: -2,
  },
  stepText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  stepCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  stepSubText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 1,
  },

  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16, fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary, letterSpacing: -0.3,
  },
  cardAddress: {
    fontSize: 12, fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted, marginTop: 2,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: '#f8fafc', paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: 16, fontFamily: Typography.fontFamily.bold, letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9, fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted, marginTop: 1, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickActionText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
