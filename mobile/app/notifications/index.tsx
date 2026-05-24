/**
 * TrọCare Mobile — Owner Notifications Screen
 * Lists all system notifications for the owner.
 * Highlights unread items and categorizes them with dynamic icons.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';
import { apiGet, apiPost } from '@/lib/api';

export default function NotificationsScreen() {
  const router = useRouter();

  // State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchNotifications = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);

      const res = await apiGet<any>('/owner/notifications');
      const list = res?.data ?? res ?? [];
      setNotifications(list);
    } catch (e: any) {
      showToast(e?.message || 'Không thể tải thông báo.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationPress = async (item: any) => {
    // 1. Mark notification as read (if it's not already read)
    if (!item.readAt) {
      try {
        // Optimistically update UI
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        await apiPost(`/owner/notifications/${item.id}/read`, {});
      } catch (e: any) {
        console.warn('Failed to mark notification as read:', e);
      }
    }

    // 2. Route based on notification type and payload
    const { eventType, payload } = item;

    if (eventType === 'BOOKING_CREATED' || eventType === 'BOOKING_CONFIRMED') {
      router.push('/bookings');
    } else if (eventType === 'CONTRACT_SIGNED' || eventType === 'CONTRACT_TERMINATED') {
      if (payload?.contractId) {
        router.push(`/contract/${payload.contractId}`);
      } else {
        router.push('/(tabs)/contracts');
      }
    } else if (eventType === 'INVOICE_PAID') {
      if (payload?.invoiceId) {
        router.push(`/invoice/${payload.invoiceId}`);
      } else {
        router.push('/(tabs)/invoices');
      }
    } else if (payload?.conversationId) {
      router.push(`/messages/${payload.conversationId}`);
    } else if (payload?.roomId) {
      router.push(`/room/${payload.roomId}`);
    } else if (payload?.facilityId) {
      router.push(`/facility/${payload.facilityId}`);
    }
  };

  const getNotificationIcon = (eventType?: string) => {
    switch (eventType) {
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
        return { name: 'calendar-outline', color: '#d97706', bg: '#fef3c7' };
      case 'CONTRACT_SIGNED':
      case 'CONTRACT_TERMINATED':
        return { name: 'document-text-outline', color: Colors.primary, bg: Colors.primaryLight };
      case 'MEMBER_CHECKIN':
      case 'MEMBER_CHECKOUT':
        return { name: 'people-outline', color: '#059669', bg: '#d1fae5' };
      case 'INVOICE_PAID':
        return { name: 'cash-outline', color: '#10b981', bg: '#ecfdf5' };
      default:
        return { name: 'notifications-outline', color: Colors.textSecondary, bg: '#f1f5f9' };
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 600);

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${Math.floor(diffMins / 60)} giờ trước`;
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Thông báo hệ thống',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />

      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={() => fetchNotifications(true)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                title="Không có thông báo nào"
                description="Hệ thống sẽ gửi thông báo đến bạn khi có giao dịch, hợp đồng hoặc yêu cầu đặt phòng mới."
                icon="notifications-outline"
              />
            }
            renderItem={({ item }) => {
              const iconMeta = getNotificationIcon(item.eventType);
              const isUnread = !item.readAt;

              return (
                <Card
                  onPress={() => handleNotificationPress(item)}
                  style={StyleSheet.flatten([styles.card, isUnread && styles.cardUnread])}
                >
                  <View style={[styles.iconContainer, { backgroundColor: iconMeta.bg }]}>
                    <Ionicons name={iconMeta.name as any} size={20} color={iconMeta.color} />
                  </View>

                  <View style={styles.content}>
                    <View style={styles.headerRow}>
                      <Text style={styles.title} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={styles.body}>{item.body}</Text>
                    <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                  </View>
                </Card>
              );
            }}
          />
        )}
      </View>

      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    borderColor: Colors.primaryLight,
    backgroundColor: '#f8fafc',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.15,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  body: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
