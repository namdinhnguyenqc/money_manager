import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet } from '@/lib/api';

type FeedbackReport = {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'suggestion' | 'support';
  category: 'ui' | 'function' | 'data' | 'payment' | 'invoice' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'in_progress' | 'resolved' | 'reopened' | 'closed';
  created_at: string;
  comments_count: number;
};

const statusMap = {
  new: { label: 'Mới gửi', color: '#0071e3', bg: 'rgba(0, 113, 227, 0.08)' },
  in_progress: { label: 'Đang xử lý', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.08)' },
  resolved: { label: 'Đã xử lý xong', color: '#0D9488', bg: 'rgba(13, 148, 136, 0.08)' },
  reopened: { label: 'Yêu cầu lại', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)' },
  closed: { label: 'Đã đóng', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)' },
};

const typeLabels = {
  bug: 'Báo lỗi',
  suggestion: 'Góp ý',
  support: 'Hỗ trợ',
};

export default function FeedbackListScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'resolved'>('all');

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiGet<{ data: FeedbackReport[] }>('/owner/feedback');
      setReports(res?.data || []);
    } catch (err: any) {
      console.warn('Failed to load feedback reports on mobile:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const filteredReports = reports.filter((r) => {
    if (activeTab === 'active') return ['new', 'in_progress', 'reopened'].includes(r.status);
    if (activeTab === 'resolved') return ['resolved', 'closed'].includes(r.status);
    return true;
  });

  const renderItem = ({ item }: { item: FeedbackReport }) => {
    const config = statusMap[item.status] || { label: item.status, color: Colors.textMuted, bg: Colors.border };
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.72}
        onPress={() => router.push(`/feedback/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{typeLabels[item.type] || item.type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.meta}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
          </View>
          <View style={styles.commentsBadge}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={Colors.primary} />
            <Text style={styles.commentsText}>{item.comments_count} phản hồi</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo lỗi & Góp ý</Text>
        <TouchableOpacity
          style={styles.addButton}
          hitSlop={12}
          onPress={() => router.push('/feedback/new' as any)}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TabButton label="Tất cả" active={activeTab === 'all'} onPress={() => setActiveTab('all')} />
        <TabButton label="Đang xử lý" active={activeTab === 'active'} onPress={() => setActiveTab('active')} />
        <TabButton label="Lịch sử" active={activeTab === 'resolved'} onPress={() => setActiveTab('resolved')} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải phản hồi...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có báo cáo nào</Text>
          <Text style={styles.emptyText}>Bấm nút (+) để gửi góp ý hoặc báo lỗi.</Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => router.push('/feedback/new' as any)}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={18} color={Colors.textWhite} />
            <Text style={styles.emptyActionText}>Tạo báo cáo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}

      {!loading && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/feedback/new' as any)}
          activeOpacity={0.82}
        >
          <Ionicons name="add" size={28} color={Colors.textWhite} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryAlpha20,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  list: {
    padding: 16,
    paddingBottom: 104,
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  typeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
  },
  title: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
    paddingTop: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  commentsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentsText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: Colors.primary,
  },
  emptyActionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
  },
});
