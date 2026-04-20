import React, { useRef } from 'react';
import { TextInput, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Tim kiem...', style }) {
  const isFocused = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    Animated.timing(isFocused, {
      toValue: 1,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  const onBlur = () => {
    Animated.timing(isFocused, {
      toValue: 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  const borderTransition = isFocused.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.borderStrong, COLORS.primary],
  });

  const backgroundTransition = isFocused.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.surfaceLowest, '#ffffff'],
  });

  return (
    <Animated.View style={[styles.container, Platform.OS === 'web' && styles.containerWeb, { borderColor: borderTransition, backgroundColor: backgroundTransition }, style]}>
      <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {value?.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    ...SHADOW.sm,
  },
  containerWeb: {
    height: 52,
    borderRadius: 16,
  },
  icon: { marginRight: 9 },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.textPrimary,
    ...FONTS.medium,
    fontSize: 14,
  },
  clearBtn: { padding: 3 },
});
