import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet, apiPost } from '@/lib/api';
import { useAppToast } from '@/components/ui/ToastProvider';

type Attachment = {
  id: string;
  file_url: string;
};

type FeedbackReport = {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'suggestion' | 'support';
  category: 'ui' | 'function' | 'data' | 'payment' | 'invoice' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'in_progress' | 'resolved' | 'reopened' | 'closed';
  created_at: string;
  attachments?: Attachment[];
};

type Comment = {
  id: string;
  userId: string;
  role: 'owner' | 'admin';
  message: string;
  createdAt: string;
  senderName: string;
  senderAvatar: string | null;
};

const statusMap = {
  new: { label: 'Mới gửi', color: Colors.primary, bg: Colors.primaryLight },
  in_progress: { label: 'Đang xử lý', color: Colors.warning, bg: Colors.warningLight },
  resolved: { label: 'Đã xử lý xong', color: Colors.successDark, bg: Colors.successLight },
  reopened: { label: 'Yêu cầu lại', color: Colors.danger, bg: Colors.dangerLight },
  closed: { label: 'Đã đóng', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)' },
};

const typeLabels = {
  bug: 'Báo lỗi',
  suggestion: 'Góp ý',
  support: 'Hỗ trợ',
};

const priorityLabels = {
  low: 'Thấp',
  medium: 'Vừa',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

export default function FeedbackDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showSuccess } = useAppToast();
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const [reopenText, setReopenText] = useState('');
  const [showReopenInput, setShowReopenInput] = useState(false);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadDetails = async () => {
    try {
      const res = await apiGet<{ report: FeedbackReport; comments: Comment[] }>(
        `/owner/feedback/${id}`
      );
      setReport(res.report);
      setComments(res.comments || []);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải chi tiết phản hồi.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      await apiPost(`/owner/feedback/${id}/comments`, {
        message: commentText.trim(),
      });
      setCommentText('');
      await loadDetails();
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Gửi phản hồi lỗi.');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    Alert.alert('Đóng báo cáo', 'Bạn xác nhận sự cố này đã được sửa thành công và muốn đóng báo cáo?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý đóng',
        onPress: async () => {
          try {
            setLoading(true);
            await apiPost(`/owner/feedback/${id}/close`, {});
            showSuccess('Báo cáo đã được đóng.');
            router.back();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message);
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleReopenTicket = async () => {
    if (!reopenText.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập rõ lý do sự cố chưa được xử lý đúng.');
      return;
    }

    try {
      setLoading(true);
      await apiPost(`/owner/feedback/${id}/reopen`, {
        message: reopenText.trim(),
      });
      showSuccess('Yêu cầu xử lý lại đã được gửi.');
      setShowReopenInput(false);
      setReopenText('');
      await loadDetails();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !report) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!report) return null;

  const config = statusMap[report.status] || { label: report.status, color: Colors.textMuted, bg: Colors.border };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
      >
        {/* Header bar */}
        <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Chi tiết báo cáo
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Ticket main info card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.badges}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{typeLabels[report.type] || report.type}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>
            <Text style={styles.date}>{new Date(report.created_at).toLocaleString('vi-VN')}</Text>
          </View>

          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.desc}>{report.description}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Lĩnh vực: <Text style={styles.metaValue}>{report.category}</Text></Text>
            <Text style={styles.metaLabel}>Mức độ: <Text style={styles.metaValue}>{priorityLabels[report.priority] || report.priority}</Text></Text>
          </View>

          {/* Attachments preview */}
          {report.attachments && report.attachments.length > 0 && (
            <View style={styles.attachmentsRow}>
              <Text style={styles.attachmentsTitle}>Ảnh đính kèm:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {report.attachments.map((att) => (
                  <TouchableOpacity
                    key={att.id}
                    style={styles.thumbnailWrapper}
                    activeOpacity={0.8}
                    onPress={() => setSelectedImageUrl(att.file_url)}
                  >
                    <Image source={{ uri: att.file_url }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* WORKFLOW BUTTONS FOR RESOLVED */}
        {report.status === 'resolved' && !showReopenInput && (
          <View style={styles.resolvedActionBox}>
            <Text style={styles.resolvedTitle}>Admin đã hoàn tất sửa lỗi!</Text>
            <Text style={styles.resolvedText}>Vui lòng bấm nút xác nhận kết quả kiểm tra lại của bạn.</Text>
            <View style={styles.resolvedRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleCloseTicket} activeOpacity={0.72}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.textWhite} />
                <Text style={styles.closeBtnText}>Đã ổn, đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reopenBtn} onPress={() => setShowReopenInput(true)} activeOpacity={0.72}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                <Text style={styles.reopenBtnText}>Chưa đúng</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* REOPEN INPUT FORM */}
        {showReopenInput && (
          <View style={styles.reopenBox}>
            <Text style={styles.reopenTitle}>Mô tả vấn đề chưa đúng</Text>
            <TextInput
              style={styles.reopenInput}
              placeholder="Nhập lý do sự cố vẫn chưa được khắc phục triệt để..."
              value={reopenText}
              onChangeText={setReopenText}
              multiline
            />
            <View style={styles.reopenRow}>
              <TouchableOpacity style={styles.reopenCancel} onPress={() => setShowReopenInput(false)}>
                <Text style={styles.reopenCancelText}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reopenSubmit} onPress={handleReopenTicket}>
                <Text style={styles.reopenSubmitText}>Gửi yêu cầu lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Comment Thread */}
        <View style={styles.commentContainer}>
          <Text style={styles.sectionTitle}>Lịch sử trao đổi</Text>
          {comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>Chưa có phản hồi nào. Đội ngũ hỗ trợ sẽ trả lời tại đây.</Text>
            </View>
          ) : (
            comments.map((cmt) => {
              const isAdmin = cmt.role === 'admin';
              return (
                <View key={cmt.id} style={[styles.cmtRow, isAdmin ? styles.cmtAdminRow : styles.cmtOwnerRow]}>
                  <View style={[styles.bubble, isAdmin ? styles.adminBubble : styles.ownerBubble]}>
                    <View style={styles.bubbleHeader}>
                      <Text style={[styles.senderName, isAdmin && { color: Colors.primary }]}>
                        {cmt.senderName} {isAdmin && '🛡️'}
                      </Text>
                      <Text style={styles.bubbleTime}>
                        {new Date(cmt.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[styles.bubbleText, !isAdmin && { color: Colors.textWhite }]}>{cmt.message}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Input reply form bar */}
      {report.status !== 'closed' && (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.barInput}
            placeholder="Nhập phản hồi..."
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!commentText.trim() || sending) && styles.sendButtonDisabled]}
            disabled={!commentText.trim() || sending}
            onPress={handleSendComment}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.textWhite} />
            ) : (
              <Ionicons name="send" size={16} color={Colors.textWhite} />
            )}
          </TouchableOpacity>
        </View>
      )}
      </KeyboardAvoidingView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={selectedImageUrl !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity
            style={styles.modalCloseOverlay}
            activeOpacity={1}
            onPress={() => setSelectedImageUrl(null)}
          />
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedImageUrl(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={Colors.textWhite} />
            </TouchableOpacity>
            {selectedImageUrl && (
              <Image
                source={{ uri: selectedImageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
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
  date: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  desc: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
    paddingTop: 8,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textMuted,
  },
  metaValue: {
    color: Colors.textSecondary,
  },
  attachmentsRow: {
    gap: 6,
    marginTop: 8,
  },
  attachmentsTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resolvedActionBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  resolvedTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  resolvedText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  resolvedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  closeBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  closeBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },
  reopenBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reopenBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
  reopenBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  reopenTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  reopenInput: {
    height: 62,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  reopenRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  reopenCancel: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenCancelText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  reopenSubmit: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenSubmitText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },
  commentContainer: {
    gap: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyComments: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  cmtRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cmtOwnerRow: {
    justifyContent: 'flex-end',
  },
  cmtAdminRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ownerBubble: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
    borderTopRightRadius: 2,
  },
  adminBubble: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderTopLeftRadius: 2,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bubbleTime: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  bubbleText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  inputBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  barInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '95%',
    height: '80%',
  },
});
