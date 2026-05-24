/**
 * TrọCare Mobile — Audit Logs Screen
 * View system activity logs (actors, actions, resources, timestamps).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { loadAuditLogs, type AuditLog } from '@/lib/rentalOps';

export default function AuditLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const data = await loadAuditLogs();
      setLogs(data);
    } catch {
      // gracefully fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredLogs = logs.filter((log) => {
    const term = search.toLowerCase();
    return (
      log.actor?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      (log.resourceType || '').toLowerCase().includes(term)
    );
  });

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add') || act.includes('tạo')) {
      return { name: 'add-circle-outline' as const, color: Colors.successDark, bg: Colors.successLight };
    }
    if (act.includes('delete') || act.includes('remove') || act.includes('xóa')) {
      return { name: 'trash-outline' as const, color: Colors.danger, bg: Colors.dangerLight };
    }
    if (act.includes('update') || act.includes('edit') || act.includes('sửa')) {
      return { name: 'create-outline' as const, color: Colors.primary, bg: Colors.primaryLight };
    }
    if (act.includes('login')) {
      return { name: 'log-in-outline' as const, color: '#8b5cf6', bg: '#ede9fe' };
    }
    return { name: 'document-text-outline' as const, color: Colors.textSecondary, bg: Colors.borderLight };
  };

  const formatLogDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhật ký thao tác</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo người thực hiện, thao tác..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {loading ? (
          <View style={{ gap: 10 }}>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : filteredLogs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Không tìm thấy hoạt động nào</Text>
            <Text style={styles.emptySubtext}>Kéo xuống để tải lại trang</Text>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const iconConfig = getActionIcon(log.action);
            return (
              <Card key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={[styles.actionIconContainer, { backgroundColor: iconConfig.bg }]}>
                    <Ionicons name={iconConfig.name} size={16} color={iconConfig.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actorName}>{log.actor}</Text>
                    <Text style={styles.actionText}>{log.action}</Text>
                  </View>
                  <Text style={styles.logTime}>{formatLogDate(log.createdAt || (log as any).created_at)}</Text>
                </View>

                {log.resourceType && (
                  <View style={styles.resourceRow}>
                    <Ionicons name="cube-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.resourceText}>
                      Đối tượng: <Text style={styles.resourceHighlight}>{log.resourceType}</Text>
                      {log.resourceId ? ` (${log.resourceId.slice(0, 8)})` : ''}
                    </Text>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 10,
  },
  logCard: {
    padding: 12,
    gap: 10,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorName: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  actionText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  logTime: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resourceText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  resourceHighlight: {
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
});
