/**
 * TrọCare Mobile — Public Marketplace Boarding House Detail Screen
 * Lists details and available public rooms of a specific facility.
 * Enables guests to submit lead contact forms and hold booking requests directly.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { apiGet, apiPost } from '@/lib/api';

export default function MarketplaceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const boardingHouseId = id as string;

  // Page States
  const [house, setHouse] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form Mode: 'lead' (Contact) or 'booking' (Reservation)
  const [formMode, setFormMode] = useState<'lead' | 'booking'>('lead');

  // Unified Form Inputs
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [message, setMessage] = useState('');
  const [desiredMoveIn, setDesiredMoveIn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Set default move-in date to today's date formatted as YYYY-MM-DD
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDesiredMoveIn(`${yyyy}-${mm}-${dd}`);
  }, []);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch single boarding house details
      const bhRes = await apiGet<any>(`/public/boarding-houses/${boardingHouseId}`);
      const bh = bhRes?.data ?? bhRes;
      setHouse(bh);

      // 2. Fetch public rooms in facility
      const roomsRes = await apiGet<any>(`/public/rooms?bhId=${boardingHouseId}`);
      const roomList = roomsRes?.data ?? roomsRes ?? [];
      setRooms(roomList);

      // Pre-select first room if available
      if (roomList.length > 0) {
        setSelectedRoomId(roomList[0].id);
      }
    } catch (e: any) {
      setError(e?.message || 'Không thể tải thông tin chi tiết dãy trọ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (boardingHouseId) {
      loadDetail();
    }
  }, [boardingHouseId]);

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  // Form Validation and Submission
  const handleSubmit = async () => {
    if (!guestName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }

    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      Alert.alert('Số điện thoại không hợp lệ', 'Số điện thoại liên hệ phải có đúng 10 chữ số.');
      return;
    }

    if (!selectedRoomId) {
      Alert.alert('Chưa chọn phòng', 'Vui lòng chọn một phòng trong danh sách trước khi gửi.');
      return;
    }

    setSubmitting(true);
    try {
      if (formMode === 'lead') {
        // Submit general inquiry lead
        await apiPost('/public/leads', {
          boardingHouseId,
          roomId: selectedRoomId,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          message: message.trim() || undefined,
        });

        showToast('Gửi liên hệ thành công! Chủ trọ sẽ liên lạc lại sớm.', 'success');
      } else {
        // Submit room booking hold request
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(desiredMoveIn)) {
          Alert.alert('Định dạng ngày sai', 'Ngày dọn vào phải có định dạng YYYY-MM-DD.');
          setSubmitting(false);
          return;
        }
        const moveInDate = new Date(`${desiredMoveIn}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(moveInDate.getTime()) || desiredMoveIn !== moveInDate.toISOString().split('T')[0]) {
          Alert.alert('Ngày không hợp lệ', 'Ngày dọn vào không tồn tại. Vui lòng kiểm tra lại.');
          setSubmitting(false);
          return;
        }
        if (moveInDate.getTime() < today.getTime()) {
          Alert.alert('Ngày không hợp lệ', 'Ngày dọn vào không được là ngày trong quá khứ.');
          setSubmitting(false);
          return;
        }

        await apiPost('/public/bookings', {
          boardingHouseId,
          roomId: selectedRoomId,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          desiredMoveIn: desiredMoveIn.trim(),
          message: message.trim() || undefined,
        });

        showToast('Yêu cầu giữ chỗ thành công! Đang chờ duyệt.', 'success');
      }

      // Reset form on success
      setGuestName('');
      setGuestPhone('');
      setMessage('');
    } catch (e: any) {
      Alert.alert('Gửi thất bại', e?.message || 'Có lỗi xảy ra trong quá trình xử lý yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return 'Liên hệ';
    return `${amount.toLocaleString('vi-VN')} đ/tháng`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết dãy trọ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !house) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorTitle}>Lỗi tải thông tin</Text>
          <Text style={styles.errorDesc}>{error || 'Không tìm thấy dãy trọ công khai này.'}</Text>
          <Button title="Quay lại" variant="primary" onPress={() => router.back()} style={styles.backBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: house.name || 'Chi tiết dãy trọ',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
          {/* Boarding House Info Header */}
          <Card style={styles.bhCard}>
            <View style={styles.bhBadgeRow}>
              <View style={styles.badgeActive}>
                <Text style={styles.badgeActiveText}>ĐANG MỞ</Text>
              </View>
              <Text style={styles.bhIdText}>MÃ: {house.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <Text style={styles.bhName}>{house.name}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.addressText}>{house.address}</Text>
            </View>
            {house.description && (
              <View style={styles.descSection}>
                <Text style={styles.sectionLabel}>Giới thiệu dãy trọ</Text>
                <Text style={styles.descText}>{house.description}</Text>
              </View>
            )}
          </Card>

          {/* Available Rooms Section */}
          <View style={styles.roomsHeader}>
            <Text style={styles.sectionTitle}>Phòng trọ đang trống</Text>
            <Text style={styles.roomsCount}>{rooms.length} phòng hiển thị</Text>
          </View>

          {rooms.length === 0 ? (
            <Card style={styles.emptyRoomsCard}>
              <Ionicons name="square-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyRoomsText}>Hiện tại chưa có phòng trống nào hiển thị.</Text>
            </Card>
          ) : (
            <View style={styles.roomsGrid}>
              {rooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                return (
                  <TouchableOpacity
                    key={room.id}
                    activeOpacity={0.7}
                    style={[styles.roomCard, isSelected && styles.roomCardSelected]}
                    onPress={() => setSelectedRoomId(room.id)}
                  >
                    <View style={styles.roomHeaderRow}>
                      <Text style={styles.roomName}>{room.name || room.number || 'Phòng'}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                      )}
                    </View>
                    <Text style={styles.roomPrice}>{formatMoney(room.price)}</Text>
                    <View style={styles.roomStatusRow}>
                      <View style={styles.roomStatusDot} />
                      <Text style={styles.roomStatusText}>{room.status || 'AVAILABLE'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Contact & Request Form Panel */}
          {selectedRoom && (
            <Card style={styles.formCard}>
              <View style={styles.formToggleRow}>
                <TouchableOpacity
                  style={[styles.formTab, formMode === 'lead' && styles.formTabActive]}
                  onPress={() => setFormMode('lead')}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color={formMode === 'lead' ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.formTabText, formMode === 'lead' && styles.formTabTextActive]}>
                    Gửi liên hệ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formTab, formMode === 'booking' && styles.formTabActive]}
                  onPress={() => setFormMode('booking')}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={formMode === 'booking' ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.formTabText, formMode === 'booking' && styles.formTabTextActive]}>
                    Yêu cầu giữ chỗ
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formContextRow}>
                <Text style={styles.formContextLabel}>Đang xem phòng:</Text>
                <Text style={styles.formContextValue}>
                  {selectedRoom.name || selectedRoom.number} ({formatMoney(selectedRoom.price)})
                </Text>
              </View>

              <View style={styles.formBody}>
                <Input
                  label="Họ tên của bạn *"
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Nhập họ và tên..."
                />

                <Input
                  label="Số điện thoại liên hệ *"
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  placeholder="Ví dụ: 0987654321"
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                {formMode === 'booking' && (
                  <Input
                    label="Ngày dự kiến dọn vào (YYYY-MM-DD) *"
                    value={desiredMoveIn}
                    onChangeText={setDesiredMoveIn}
                    placeholder="Định dạng: YYYY-MM-DD"
                  />
                )}

                <Input
                  label="Nội dung lời nhắn / yêu cầu thêm"
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Nhập nội dung cần trao đổi..."
                  multiline
                  numberOfLines={4}
                  containerStyle={{ marginBottom: 20 }}
                />

                <Button
                  title={
                    submitting
                      ? 'Đang gửi...'
                      : formMode === 'lead'
                      ? 'Gửi thông tin liên hệ'
                      : 'Gửi yêu cầu giữ chỗ'
                  }
                  variant="primary"
                  onPress={handleSubmit}
                  disabled={submitting}
                  icon={submitting ? <ActivityIndicator size="small" color="#fff" /> : undefined}
                />
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errorTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  errorDesc: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  backBtn: { width: 120, height: 38 },
  bhCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  bhBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badgeActive: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActiveText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#059669',
  },
  bhIdText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textMuted,
  },
  bhName: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  descSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  roomsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  roomsCount: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  emptyRoomsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: '#fff',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyRoomsText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomCard: {
    width: '48.4%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  roomCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  roomPrice: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  roomStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roomStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  roomStatusText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#059669',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 8,
  },
  formToggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 10,
    gap: 16,
  },
  formTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  formTabActive: {
    backgroundColor: Colors.primaryLight,
  },
  formTabText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  formTabTextActive: {
    color: Colors.primary,
  },
  formContextRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 4,
    gap: 6,
  },
  formContextLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  formContextValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  formBody: {
    marginTop: 14,
  },
});
