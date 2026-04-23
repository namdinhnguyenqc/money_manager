import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  Alert, Switch, KeyboardAvoidingView, Platform, ScrollView, Pressable, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SHADOW } from '../theme';
import { confirmDialog } from '../utils/dialogs';

export default function AddRoomBottomSheet({ visible, onClose, onSave, room, deleteRoom }) {
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [hasAc, setHasAc] = useState(false);
  const [numPeople, setNumPeople] = useState('1');

  useEffect(() => {
    if (room && visible) {
      setName(room.name);
      setPrice(room.price?.toString() || '0');
      setHasAc(room.has_ac === 1);
      setNumPeople(room.num_people?.toString() || '1');
      return;
    }
    if (visible) {
      setName('');
      setPrice('');
      setHasAc(false);
      setNumPeople('1');
    }
  }, [room, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên phòng');
      return;
    }
    const parsedPrice = parseInt(price.replace(/[^0-9]/g, ''), 10);
    if (!parsedPrice || parsedPrice < 1000) {
      Alert.alert('Lỗi', 'Giá phòng tối thiểu là 1.000 VND');
      return;
    }
    const people = parseInt(numPeople, 10) || 1;
    onSave(room?.id, name.trim(), parsedPrice, hasAc, people);
  };

  const handleDelete = () => {
    if (!room) return;
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xóa phòng',
        message: `Bạn có chắc muốn xóa phòng ${room.name}?`,
        confirmText: 'Xóa',
      });
      if (!confirmed) return;

      try {
        await deleteRoom(room.id);
        onClose();
        onSave();
      } catch (e) {
        console.error(e);
        Alert.alert('Lỗi', 'Chỉ có thể xóa phòng trống và không có hợp đồng.');
      }
    })();
  };

  const isWeb = Platform.OS === 'web';
  const dialogWidth = width >= 1180 ? 760 : width >= 900 ? 680 : Math.min(width - 24, 560);

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView style={[styles.keyboardWrap, isWeb && styles.keyboardWrapWeb]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, isWeb && styles.sheetWeb, { width: isWeb ? dialogWidth : '100%' }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{room ? 'Sửa thông tin phòng' : 'Thêm phòng mới'}</Text>
              {room ? <Text style={styles.subTitle}>Mã phòng: {room.name}</Text> : null}
            </View>
            {room ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.formGrid, isWeb && styles.formGridWeb]}>
              <View style={styles.formCol}>
                <View style={styles.group}>
                  <Text style={styles.label}>Tên phòng *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: P101, Phòng 1"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.group}>
                  <Text style={styles.label}>Giá phòng (VND/tháng) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="2200000"
                    value={price}
                    onChangeText={setPrice}
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.group}>
                  <Text style={styles.label}>Số người tối đa</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="1"
                    value={numPeople}
                    onChangeText={setNumPeople}
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              <View style={styles.sideCol}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoEyebrow}>THIẾT LẬP PHÒNG</Text>
                  <Text style={styles.infoTitle}>Thông tin vận hành</Text>
                  <Text style={styles.infoText}>Thiết lập thông tin cơ bản để phòng hiển thị đúng trong luồng quản lý và hợp đồng.</Text>
                </View>

                <View style={styles.switchBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Phòng có máy lạnh</Text>
                    <Text style={styles.switchSub}>Áp dụng đúng đơn giá điện.</Text>
                  </View>
                  <Switch
                    value={hasAc}
                    onValueChange={setHasAc}
                    trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                    thumbColor={hasAc ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Bỏ qua</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>{room ? 'Cập nhật' : 'Thêm phòng'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  overlayWeb: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  keyboardWrap: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  keyboardWrapWeb: { alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: COLORS.surfaceLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '88%',
    minHeight: 0,
    flexShrink: 1,
    ...SHADOW.lg,
  },
  sheetWeb: {
    maxHeight: '92%',
    borderRadius: 28,
    paddingBottom: 24,
  },
  scrollArea: { flexGrow: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { color: COLORS.textPrimary, fontSize: 20, ...FONTS.bold },
  subTitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: COLORS.danger, ...FONTS.semibold, fontSize: 12 },
  formGrid: { gap: 16 },
  formGridWeb: { flexDirection: 'row', alignItems: 'flex-start' },
  formCol: { flex: 1 },
  sideCol: { flex: 0.9, gap: 12 },
  group: { marginBottom: 14 },
  label: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold, marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    ...FONTS.semibold,
  },
  infoCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLow,
    padding: 16,
  },
  infoEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  infoTitle: { marginTop: 8, color: COLORS.textPrimary, fontSize: 16, ...FONTS.bold },
  infoText: { marginTop: 6, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  switchBox: {
    marginTop: 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLow,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchTitle: { color: COLORS.textPrimary, ...FONTS.semibold },
  switchSub: { marginTop: 2, color: COLORS.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLow },
  cancelText: { color: COLORS.textSecondary, ...FONTS.semibold },
  saveBtn: { flex: 1.4, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  saveText: { color: '#fff', ...FONTS.semibold },
});
