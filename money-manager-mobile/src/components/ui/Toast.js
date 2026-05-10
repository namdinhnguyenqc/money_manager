import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW, FONTS } from '../../theme';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useState(new Animated.Value(0))[0];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        hideToast();
      }, 3000);
    });
  };

  const hideToast = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View style={[styles.container, { opacity }]}>
          <View style={[styles.toast, styles[toast.type]]}>
            <Ionicons 
              name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.message}>{toast.message}</Text>
            <TouchableOpacity onPress={hideToast}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    gap: 12,
    ...SHADOW.md,
    maxWidth: '100%',
  },
  success: {
    backgroundColor: '#2e7d32',
  },
  error: {
    backgroundColor: '#c62828',
  },
  message: {
    color: '#fff',
    fontSize: 14,
    ...FONTS.semibold,
    flex: 1,
  },
});
