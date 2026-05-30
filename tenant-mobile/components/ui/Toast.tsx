/**
 * TrọCare Mobile — Toast Notification Component
 * Success/error/warning toast with auto-dismiss and slide animation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

const TOAST_CONFIG: Record<ToastType, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: Colors.successLight, text: Colors.successDark, icon: 'checkmark-circle' },
  error: { bg: Colors.dangerLight, text: Colors.danger, icon: 'close-circle' },
  warning: { bg: Colors.warningLight, text: '#92400e', icon: 'warning' },
  info: { bg: Colors.primaryLight, text: Colors.primaryDark, icon: 'information-circle' },
};

export default function Toast({ message, type = 'success', visible, onDismiss, duration = 3000 }: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const config = TOAST_CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, duration, onDismiss, translateY]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onDismiss} style={[styles.toast, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={20} color={config.text} />
        <Text style={[styles.text, { color: config.text }]} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: -0.15,
    lineHeight: 20,
  },
});
