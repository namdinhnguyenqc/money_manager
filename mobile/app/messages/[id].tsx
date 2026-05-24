/**
 * TrọCare Mobile — Owner Chat Timeline Screen
 * Displays a messaging timeline between the owner and a guest lead.
 * Allows sending instant replies.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet, apiPost } from '@/lib/api';

export default function ChatTimelineScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = id as string;

  // States
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState('Hội thoại');

  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async (isSilent = false) => {
    try {
      if (!isSilent && messages.length === 0) setLoading(true);
      const res = await apiGet<any>(`/owner/conversations/${conversationId}/messages`);
      const list = res?.data ?? res ?? [];
      setMessages(list);

      // Fetch topic from conversation object to show in header
      const convListRes = await apiGet<any>('/owner/conversations');
      const convs = convListRes?.data ?? convListRes ?? [];
      const currentConv = convs.find((c: any) => c.id === conversationId);
      if (currentConv?.topic) {
        setTopic(currentConv.topic);
      }
    } catch {
      // Fail silently for background polls or silent refetches
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      // Start a subtle periodic poll every 5 seconds to give a near-realtime chat experience
      const interval = setInterval(() => {
        fetchMessages(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [conversationId]);

  const handleSend = async () => {
    if (!replyBody.trim()) return;

    const messageText = replyBody.trim();
    setReplyBody('');
    setSending(true);

    try {
      // Optimistic Update
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        conversationId,
        senderRole: 'OWNER',
        senderName: 'Chủ trọ',
        body: messageText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Call API
      const res = await apiPost<any>(`/owner/conversations/${conversationId}/messages`, {
        body: messageText,
      });

      // Update optimistic message with real API response
      const savedMsg = res?.data ?? res;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? savedMsg : msg))
      );

      // Auto scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch {
      // Rollback on fail and show alert
      fetchMessages();
      setReplyBody(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: topic,
          headerBackTitle: 'Hộp thư',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardContainer}
      >
        <View style={styles.container}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              refreshing={refreshing}
              onRefresh={() => fetchMessages(true)}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Chưa có lời nhắn nào được gửi.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isOwner = item.senderRole === 'OWNER';
                return (
                  <View
                    style={[
                      styles.messageRow,
                      isOwner ? styles.messageRowOwner : styles.messageRowGuest,
                    ]}
                  >
                    {!isOwner && (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>K</Text>
                      </View>
                    )}
                    <View style={styles.messageBubbleContainer}>
                      {!isOwner && <Text style={styles.senderName}>{item.senderName || 'Khách thuê'}</Text>}
                      <View
                        style={[
                          styles.bubble,
                          isOwner ? styles.bubbleOwner : styles.bubbleGuest,
                        ]}
                      >
                        <Text style={[styles.bodyText, isOwner ? styles.bodyTextOwner : styles.bodyTextGuest]}>
                          {item.body}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.timestamp,
                          isOwner ? styles.timestampOwner : styles.timestampGuest,
                        ]}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Chat Reply Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              placeholder="Nhập tin nhắn phản hồi..."
              placeholderTextColor={Colors.textMuted}
              value={replyBody}
              onChangeText={setReplyBody}
              style={styles.input}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !replyBody.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!replyBody.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  keyboardContainer: { flex: 1 },
  container: { flex: 1, justifyContent: 'space-between' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, paddingBottom: 24, gap: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyText: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  messageRowOwner: {
    alignSelf: 'flex-end',
  },
  messageRowGuest: {
    alignSelf: 'flex-start',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
  },
  messageBubbleContainer: {
    gap: 2,
  },
  senderName: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textMuted,
    marginLeft: 4,
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwner: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleGuest: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 19,
  },
  bodyTextOwner: {
    color: '#fff',
  },
  bodyTextGuest: {
    color: Colors.textPrimary,
  },
  timestamp: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    marginTop: 2,
  },
  timestampOwner: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  timestampGuest: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
});
