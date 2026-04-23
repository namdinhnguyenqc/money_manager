import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';

export default function RoomActionSheet({ visible, room, hasInvoice, onClose, onAction, onTerminate }) {
  const { width } = useWindowDimensions();
  if (!visible || !room) return null;

  const isPaid = room?.invoice_status === 'paid';
  const isWeb = Platform.OS === 'web';
  const sheetWidth = width >= 980 ? 560 : Math.min(width - 24, 520);

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, isWeb && styles.sheetWeb, { width: isWeb ? sheetWidth : '100%' }]}>
          <View style={styles.dragPill} />

          <View style={styles.header}>
            <Text style={styles.roomName}>Phòng {room.name}</Text>
            <Text style={styles.tenant}>{room.tenant_name}</Text>
          </View>

          <View style={styles.grid}>
            <TouchableOpacity style={[styles.card, hasInvoice && !isPaid && styles.cardActive]} onPress={() => onAction('invoice')}>
              <Ionicons name="receipt-outline" size={30} color={hasInvoice ? COLORS.secondary : COLORS.primary} />
              <Text style={styles.cardLabel}>{hasInvoice ? 'Sửa hóa đơn' : 'Tạo hóa đơn'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => onAction('contract')}>
              <Ionicons name="document-text-outline" size={30} color={COLORS.primary} />
              <Text style={styles.cardLabel}>Hợp đồng</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => onAction('history')}>
              <Ionicons name="time-outline" size={30} color={COLORS.primary} />
              <Text style={styles.cardLabel}>Lịch sử</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.card, styles.dangerCard]} onPress={onTerminate}>
              <Ionicons name="log-out-outline" size={30} color={COLORS.danger} />
              <Text style={[styles.cardLabel, { color: COLORS.danger }]}>Trả phòng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  overlayWeb: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: COLORS.surfaceLowest,
    borderTopLeftRadius: RADIUS.xxl || 32,
    borderTopRightRadius: RADIUS.xxl || 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    ...SHADOW.lg,
  },
  sheetWeb: {
    borderRadius: RADIUS.xxl || 32,
  },
  dragPill: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  header: { alignItems: 'center', marginBottom: 18 },
  roomName: { color: COLORS.textPrimary, fontSize: 20, ...FONTS.bold },
  tenant: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  card: {
    width: '48.5%',
    borderRadius: RADIUS.lg,
    borderWidth: 1.2,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  cardActive: { borderColor: COLORS.secondary, backgroundColor: '#e8fff4' },
  dangerCard: { backgroundColor: COLORS.dangerLight },
  cardLabel: { ...TYPOGRAPHY.label, color: COLORS.textPrimary, fontSize: 11, letterSpacing: 0.3 },
});
