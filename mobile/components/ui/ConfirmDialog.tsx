/**
 * TrọCare Mobile — Confirm Dialog Component
 * Modal confirmation dialog for destructive actions (delete, terminate).
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button
              title={cancelLabel}
              variant="outline"
              onPress={onCancel}
              style={{ flex: 1 }}
              disabled={loading}
            />
            <Button
              title={confirmLabel}
              variant={variant}
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
    letterSpacing: -0.15,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
