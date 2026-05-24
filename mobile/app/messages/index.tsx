/**
 * TrọCare Mobile — Owner Inbox Screen
 * Displays a list of all chat conversations with guest leads.
 * Includes search/filter and direct link to chat timeline.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';
import { apiGet } from '@/lib/api';

export default function MessagesInboxScreen() {
  const router = useRouter();

  // State
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchConversations = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);

      const res = await apiGet<any>('/owner/conversations');
      const list = res?.data ?? res ?? [];
      setConversations(list);
    } catch (e: any) {
      showToast(e?.message || 'Không thể tải danh sách hội thoại.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Filter conversations
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((c) => {
      const topic = (c.topic || '').toLowerCase();
      const guest = (c.guestName || '').toLowerCase();
      const room = (c.roomName || '').toLowerCase();
      return topic.includes(query) || guest.includes(query) || room.includes(query);
    });
  }, [conversations, searchQuery]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tin nhắn liên hệ',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm theo chủ đề, tên khách, phòng..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải hội thoại...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={() => fetchConversations(true)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                title={searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có tin nhắn'}
                description={
                  searchQuery
                    ? 'Thử thay đổi từ khóa tìm kiếm của bạn.'
                    : 'Các hội thoại từ biểu mẫu liên hệ của khách hàng sẽ xuất hiện tại đây.'
                }
                icon="chatbubbles-outline"
              />
            }
            renderItem={({ item }) => {
              const guestInitial = (item.topic || 'G').charAt(0).toUpperCase();
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push(`/messages/${item.id}`)}
                >
                  <Card style={styles.chatCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{guestInitial}</Text>
                      {item.status === 'OPEN' && <View style={styles.activeDot} />}
                    </View>

                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeader}>
                        <Text style={styles.chatTopic} numberOfLines={1}>
                          {item.topic || 'Yêu cầu tư vấn'}
                        </Text>
                        <Text style={styles.chatTime}>
                          {formatDate(item.updatedAt || item.createdAt)}
                        </Text>
                      </View>

                      <Text style={styles.lastMsg} numberOfLines={1}>
                        {item.lastMessage || 'Bấm để xem chi tiết tin nhắn và phản hồi...'}
                      </Text>

                      <View style={styles.chatFooter}>
                        <View style={styles.badge}>
                          <Ionicons name="business-outline" size={12} color={Colors.primary} />
                          <Text style={styles.badgeText}>Dãy trọ: {item.boardingHouseId?.slice(0, 8).toUpperCase()}</Text>
                        </View>
                        {item.roomId && (
                          <View style={[styles.badge, styles.roomBadge]}>
                            <Ionicons name="home-outline" size={12} color="#059669" />
                            <Text style={[styles.badgeText, { color: '#059669' }]}>
                              Phòng: {item.roomId.slice(0, 6).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.chevron} />
                  </Card>
                </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  searchIcon: { position: 'absolute', left: 28, zIndex: 1 },
  searchInput: {
    flex: 1,
    paddingLeft: 38,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderColor: 'transparent',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  clearBtn: { position: 'absolute', right: 28, padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, gap: 12 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#fff',
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTopic: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  chatTime: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  lastMsg: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  chatFooter: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  roomBadge: {
    backgroundColor: '#ecfdf5',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  chevron: {
    marginLeft: 8,
  },
});
