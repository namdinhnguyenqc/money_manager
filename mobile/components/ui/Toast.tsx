/**
 * TrọCare Mobile — Toast Notification Component
 * Success/error/warning toast with auto-dismiss and slide animation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  title?: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

const TOAST_CONFIG: Record<ToastType, { accent: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { accent: Colors.primary, icon: 'checkmark' },
  error: { accent: Colors.danger, icon: 'close' },
  warning: { accent: Colors.warning, icon: 'warning-outline' },
  info: { accent: Colors.primary, icon: 'information' },
};

const TOAST_TITLES: Record<ToastType, string> = {
  success: 'Đã hoàn tất',
  error: 'Chưa thể hoàn tất',
  warning: 'Cần kiểm tra lại',
  info: 'Thông tin',
};

export default function Toast({ message, title, type = 'success', visible, onDismiss, duration = 3000 }: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const config = TOAST_CONFIG[type];

  useEffect(() => {
    if (visible) {
      progress.setValue(1);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      Animated.timing(progress, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();

      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  // Reset the display timer when a processing toast changes into success/error.
  }, [visible, duration, message, title, type, onDismiss, progress, translateY]);

  if (!visible) return null;

  // A Modal makes this a true app-level overlay. Without it, an absolutely
  // positioned toast is anchored to whichever screen/layout happens to render
  // it, causing the overlap seen on financial summary cards.
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <View pointerEvents="box-none" style={styles.overlay}>
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.container,
            { bottom: Math.max(insets.bottom + 72, 88), transform: [{ translateY }] },
          ]}
        >
          <View style={styles.toast}>
            <View style={[styles.iconShell, { backgroundColor: config.accent }]}>
              <Ionicons name={config.icon} size={18} color={Colors.textWhite} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title} numberOfLines={1}>{title || TOAST_TITLES[type]}</Text>
              <Text style={styles.text} numberOfLines={2}>{message}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng thông báo"
              hitSlop={10}
              onPress={onDismiss}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <Animated.View style={[styles.progress, { backgroundColor: config.accent, transform: [{ scaleX: progress }] }]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 40,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 74,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  iconShell: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  closeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -6 },
  progress: { position: 'absolute', left: 0, bottom: 0, height: 3, width: '100%', transformOrigin: 'left' },
  text: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    letterSpacing: -0.15,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 20, fontFamily: Typography.fontFamily.bold, letterSpacing: -0.15, color: Colors.textPrimary },
});
