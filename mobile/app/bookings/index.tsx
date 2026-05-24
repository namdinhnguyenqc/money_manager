/**
 * TrọCare Mobile — Booking Requests Screen
 * Displays booking reservations submitted by guests from the marketplace.
 * Provides owner actions to confirm or reject hold requests.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import { apiGet, apiPost } from '@/lib/api';

type BookingStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED';

export default function BookingsScreen() {
  // State
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<BookingStatus>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Confirmation dialog state
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'confirm' | 'reject' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchBookings = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);

      const res = await apiGet<any>('/owner/bookings');
      const list = res?.data ?? res ?? [];
      setBookings(list);
    } catch (e: any) {
      showToast(e?.message || 'Không thể tải danh sách đặt phòng.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAction = async () => {
    if (!confirmTarget) return;

    setActionLoading(true);
    const { id, action } = confirmTarget;

    try {
      const endpoint = `/owner/bookings/${id}/${action}`;
      await apiPost(endpoint, {});

      showToast(
        action === 'confirm'
          ? 'Đã duyệt yêu cầu giữ chỗ thành công!'
          : 'Đã từ chối yêu cầu giữ chỗ.',
        'success'
      );
      setConfirmTarget(null);
      fetchBookings();
    } catch (e: any) {
      showToast(e?.message || 'Thực hiện thao tác thất bại.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Bookings by status tab
  const filteredBookings = useMemo(() => {
    if (activeTab === 'ALL') return bookings;
    return bookings.filter((b) => b.status === activeTab);
  }, [bookings, activeTab]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Chưa có';
    try {
      const date = new Date(dateStr);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#fef3c7', text: '#d97706', label: 'Chờ duyệt' };
      case 'CONFIRMED':
        return { bg: '#d1fae5', text: '#059669', label: 'Đã duyệt' };
      case 'REJECTED':
        return { bg: '#fee2e2', text: '#dc2626', label: 'Đã từ chối' };
      default:
        return { bg: '#e2e8f0', text: '#475569', label: status };
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Yêu cầu giữ chỗ',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />

      <View style={styles.container}>
        {/* Navigation Tabs */}
        <View style={styles.tabsContainer}>
          {(['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'] as BookingStatus[]).map((tab) => {
            const isActive = activeTab === tab;
            const labels: Record<BookingStatus, string> = {
              ALL: 'Tất cả',
              PENDING: 'Chờ duyệt',
              CONFIRMED: 'Đã duyệt',
              REJECTED: 'Đã từ chối',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải yêu cầu giữ chỗ...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={() => fetchBookings(true)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                title="Chưa có yêu cầu nào"
                description={
                  activeTab === 'ALL'
                    ? 'Hiện tại hệ thống chưa nhận được yêu cầu giữ chỗ nào.'
                    : `Không tìm thấy yêu cầu giữ chỗ nào ở trạng thái này.`
                }
                icon="calendar-outline"
              />
            }
            renderItem={({ item }) => {
              const statusMeta = getStatusStyle(item.status);
              return (
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.roomInfo}>
                      <Ionicons name="home-outline" size={16} color={Colors.primary} />
                      <Text style={styles.roomName}>{item.roomName || 'Phòng trọ'}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusMeta.bg }]}>
                      <Text style={[styles.badgeText, { color: statusMeta.text }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.details}>
                    <View style={styles.detailRow}>
                      <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailLabel}>Người gửi:</Text>
                      <Text style={styles.detailValue}>{item.guestName || 'Khách vãng lai'}</Text>
                    </View>

                    {item.guestPhone ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.detailLabel}>Số điện thoại:</Text>
                        <Text style={styles.detailValue}>{item.guestPhone}</Text>
                      </View>
                    ) : null}

                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailLabel}>Ngày dọn vào:</Text>
                      <Text style={styles.detailValue}>{formatDate(item.desiredMoveIn)}</Text>
                    </View>

                    {item.message ? (
                      <View style={styles.messageBox}>
                        <Text style={styles.messageLabel}>Lời nhắn:</Text>
                        <Text style={styles.messageText}>{item.message}</Text>
                      </View>
                    ) : null}

                    {item.expiresAt ? (
                      <Text style={styles.expiryText}>
                        Hết hạn giữ chỗ: {formatDate(item.expiresAt)}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions for Pending state */}
                  {item.status === 'PENDING' && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => setConfirmTarget({ id: item.id, action: 'reject' })}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                        <Text style={styles.rejectBtnText}>Từ chối</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.confirmBtn]}
                        onPress={() => setConfirmTarget({ id: item.id, action: 'confirm' })}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Duyệt giữ chỗ</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            }}
          />
        )}
      </View>

      {/* Confirmation Modal */}
      {confirmTarget && (
        <ConfirmDialog
          visible={!!confirmTarget}
          title={confirmTarget.action === 'confirm' ? 'Duyệt giữ chỗ' : 'Từ chối giữ chỗ'}
          message={
            confirmTarget.action === 'confirm'
              ? 'Xác nhận duyệt yêu cầu giữ chỗ này? Phòng trọ tương ứng sẽ được đánh dấu giữ chỗ.'
              : 'Bạn có chắc muốn từ chối yêu cầu giữ chỗ này không?'
          }
          confirmLabel={confirmTarget.action === 'confirm' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
          cancelLabel="Hủy bỏ"
          variant={confirmTarget.action === 'confirm' ? 'primary' : 'danger'}
          loading={actionLoading}
          onConfirm={handleAction}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    width: 90,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  messageBox: {
    marginTop: 4,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 2,
  },
  messageLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  expiryText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 6,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: '#fff',
  },
  rejectBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
  },
  confirmBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
});
