import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiPost } from '@/lib/api';

type AttachmentPayload = {
  fileUrl: string;
  fileName: string;
  fileType: string;
};

export default function NewFeedbackScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'bug' | 'suggestion' | 'support'>('bug');
  const [category, setCategory] = useState<'ui' | 'function' | 'data' | 'payment' | 'invoice' | 'other'>('ui');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [relatedScreen, setRelatedScreen] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = async () => {
    if (attachments.length >= 5) {
      Alert.alert('Giới hạn', 'Bạn chỉ có thể chọn tối đa 5 ảnh đính kèm.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền truy cập thư viện ảnh để đính kèm minh chứng.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - attachments.length,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets) return;

      const newAttachments: AttachmentPayload[] = result.assets.map((asset) => {
        const fileType = asset.mimeType || 'image/jpeg';
        const fileName = asset.fileName || `attachment_${Date.now()}.jpg`;
        const fileUrl = `data:${fileType};base64,${asset.base64}`;
        return { fileUrl, fileName, fileType };
      });

      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err: any) {
      console.warn('Image picking error:', err.message);
    }
  };

  const handleRemoveImage = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề ngắn gọn.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng mô tả chi tiết lỗi phát sinh.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/owner/feedback', {
        title: title.trim(),
        description: description.trim(),
        type,
        category,
        priority,
        relatedScreen: relatedScreen.trim() || undefined,
        attachments,
      });

      Alert.alert('Thành công', 'Báo cáo lỗi/góp ý của bạn đã được gửi thành công!', [
        { text: 'Xác nhận', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi báo cáo lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo báo cáo lỗi mới</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Tiêu đề */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tiêu đề lỗi / góp ý *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập tiêu đề ngắn gọn (Ví dụ: Lỗi lưu hóa đơn)"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Loại & Lĩnh vực */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Phân loại</Text>
            <View style={styles.selectorContainer}>
              <TouchableOpacity 
                style={[styles.selectorButton, type === 'bug' && styles.selectorActive]} 
                onPress={() => setType('bug')}
              >
                <Text style={[styles.selectorLabel, type === 'bug' && styles.selectorLabelActive]}>Báo lỗi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.selectorButton, type === 'suggestion' && styles.selectorActive]} 
                onPress={() => setType('suggestion')}
              >
                <Text style={[styles.selectorLabel, type === 'suggestion' && styles.selectorLabelActive]}>Góp ý</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Lĩnh vực phát sinh */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lĩnh vực liên quan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {Object.entries({
              ui: 'Giao diện (UI)',
              function: 'Tính năng',
              data: 'Dữ liệu',
              payment: 'Thanh toán',
              invoice: 'Hóa đơn',
              other: 'Khác',
            }).map(([key, value]) => {
              const active = category === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(key as any)}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Độ ưu tiên */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mức độ cấp thiết</Text>
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
              const active = priority === p;
              const labels = { low: 'Thấp', medium: 'Vừa', high: 'Cao', urgent: 'Khẩn' };
              const colors = { low: '#94A3B8', medium: '#0071e3', high: '#EAB308', urgent: '#F43F5E' };
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, active && { borderColor: colors[p], backgroundColor: `${colors[p]}12` }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityText, active && { color: colors[p], fontFamily: Typography.fontFamily.bold }]}>
                    {labels[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mô tả chi tiết */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mô tả chi tiết sự cố *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Mô tả cụ thể sự cố, hành động phát sinh lỗi, kết quả mong đợi..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Ảnh đính kèm */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hình ảnh minh chứng ({attachments.length}/5)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
            {attachments.map((att, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri: att.fileUrl }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => handleRemoveImage(idx)}>
                  <Ionicons name="close" size={14} color={Colors.textWhite} />
                </TouchableOpacity>
              </View>
            ))}

            {attachments.length < 5 && (
              <TouchableOpacity style={styles.pickImageBtn} onPress={handlePickImage} activeOpacity={0.72}>
                <Ionicons name="camera-outline" size={24} color={Colors.textMuted} />
                <Text style={styles.pickImageText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Nút gửi */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitText}>Gửi báo cáo lỗi</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    paddingBottom: 48,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 110,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  selectorContainer: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 3,
    gap: 4,
  },
  selectorButton: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorActive: {
    backgroundColor: Colors.primaryAlpha20,
  },
  selectorLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textMuted,
  },
  selectorLabelActive: {
    color: Colors.primary,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryAlpha20,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  chipLabelActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semibold,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  imageScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  imageWrapper: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(244, 63, 94, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickImageBtn: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
  },
  pickImageText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textMuted,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  submitText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },
});
