import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SHADOW } from '../theme';

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

export default function MonthYearPicker({ visible, initialMonth, initialYear, onClose, onSelect }) {
  const { width } = useWindowDimensions();
  const [tempMonth, setTempMonth] = useState(initialMonth || new Date().getMonth() + 1);
  const [tempYear, setTempYear] = useState(initialYear || new Date().getFullYear());

  useEffect(() => {
    if (!visible) return;
    setTempMonth(initialMonth || new Date().getMonth() + 1);
    setTempYear(initialYear || new Date().getFullYear());
  }, [visible, initialMonth, initialYear]);

  const handleApply = () => {
    onSelect(tempMonth, tempYear);
    onClose();
  };

  const isWeb = Platform.OS === 'web';
  const dialogWidth = width >= 1180 ? 720 : width >= 900 ? 640 : Math.min(width - 24, 520);
  const monthCardWidth = dialogWidth >= 640 ? (dialogWidth - 36 - 24) / 4 : (dialogWidth - 36 - 16) / 3;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
        <Pressable style={styles.blur} onPress={onClose} />
        <View style={[styles.modalBox, isWeb && styles.modalBoxWeb, { width: dialogWidth }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Chọn kỳ</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.yearRow}>
            <TouchableOpacity style={styles.yearBtn} onPress={() => setTempYear((prev) => prev - 1)}>
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.yearDisplay}>
              <Text style={styles.yearText}>{tempYear}</Text>
            </View>
            <TouchableOpacity style={styles.yearBtn} onPress={() => setTempYear((prev) => prev + 1)}>
              <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {MONTHS.map((monthLabel, i) => {
              const monthNum = i + 1;
              const isActive = tempMonth === monthNum;
              return (
                <TouchableOpacity key={monthNum} style={[styles.monthCard, { width: monthCardWidth }, isActive && styles.monthCardActive]} onPress={() => setTempMonth(monthNum)}>
                  <Text style={[styles.monthText, isActive && styles.monthTextActive]}>{monthLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayWeb: { padding: 16 },
  blur: { ...StyleSheet.absoluteFillObject },
  modalBox: {
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.xxl,
    padding: 18,
    ...SHADOW.lg,
  },
  modalBoxWeb: {
    maxWidth: 720,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: COLORS.textPrimary, ...FONTS.bold, fontSize: 18 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.lg,
    paddingVertical: 8,
    marginBottom: 14,
  },
  yearBtn: { padding: 8 },
  yearDisplay: { paddingHorizontal: 24 },
  yearText: { color: COLORS.primary, ...FONTS.black, fontSize: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  monthCard: {
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.3,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
  },
  monthCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthText: { color: COLORS.textSecondary, ...FONTS.semibold, fontSize: 13 },
  monthTextActive: { color: '#fff' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, borderRadius: RADIUS.lg, alignItems: 'center', paddingVertical: 13, backgroundColor: COLORS.surfaceLow },
  cancelBtnText: { color: COLORS.textSecondary, ...FONTS.semibold },
  applyBtn: { flex: 1.4, borderRadius: RADIUS.lg, alignItems: 'center', paddingVertical: 13, backgroundColor: COLORS.primary },
  applyBtnText: { color: '#fff', ...FONTS.semibold },
});
