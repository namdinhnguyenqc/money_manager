/**
 * TrọCare Tenant Mobile — Notifications Tab
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

export default function NotificationsTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await apiGet<any>('/tenant/notifications');
      setNotifications(res?.data ?? res ?? []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleReadAll = async () => {
    try {
      await apiPost('/tenant/notifications/read-all', {});
      // Optimistically update local state
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể đánh dấu đọc tất cả.');
    }
  };

  const handleNotificationClick = async (item: any) => {
    // If unread, mark as read on server
    if (!item.is_read) {
      try {
        await apiPatch(`/tenant/notifications/${item.id}/read`, {});
        // Optimistically update local state
        setNotifications(
          notifications.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Direct redirection based on notification payload type
    const data = item.data || {};
    if (item.type === 'invoice_created' || item.type === 'payment_success' || item.type === 'payment_reminder') {
      if (data.invoice_id) {
        router.push(`/invoice/${data.invoice_id}`);
      } else {
        router.push('/(tabs)/invoices');
      }
    } else if (item.type === 'contract_update' || item.type === 'contract_expiring') {
      router.push('/(tabs)/profile');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return { name: 'receipt-outline', color: Colors.primary, bg: 'rgba(0, 113, 227, 0.08)' };
      case 'payment_success':
        return { name: 'checkmark-circle-outline', color: Colors.success, bg: 'rgba(13, 148, 136, 0.08)' };
      case 'payment_reminder':
        return { name: 'alarm-outline', color: Colors.warning, bg: 'rgba(234, 179, 8, 0.08)' };
      case 'contract_update':
      case 'contract_expiring':
        return { name: 'document-text-outline', color: Colors.primary, bg: 'rgba(0, 113, 227, 0.08)' };
      default:
        return { name: 'notifications-outline', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon = getNotificationIcon(item.type);
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationClick(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.titleText, isUnread && styles.unreadTitleText]}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadIndicator} />}
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.timeText}>
            {new Date(item.created_at || item.sent_at).toLocaleString('vi-VN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View style={styles.container}>
      
      {/* Notifications Header controller */}
      <View style={styles.headerControl}>
        <Text style={styles.infoLabel}>
          {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleReadAll}>
            <Text style={styles.readAllBtn}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Chưa có thông báo nào gửi đến bạn.</Text>
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
  headerControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  infoLabel: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  readAllBtn: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  listContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    overflow: 'hidden',
    marginBottom: 90,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  unreadItem: {
    backgroundColor: 'rgba(0, 113, 227, 0.02)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.semibold,
    color: '#334155',
    flex: 1,
  },
  unreadTitleText: {
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  bodyText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#EAEAEF',
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
});
