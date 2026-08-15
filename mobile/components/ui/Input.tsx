/**
 * TrọCare Mobile — Form Input Component
 * Includes focus ring, inline error display, and disabled state (for readonly fields like email).
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  hint,
  required = false,
  disabled = false,
  containerStyle,
  icon,
  leftIcon,
  rightIcon,
  ...inputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const activeLeftIcon = leftIcon || icon;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
      >
        {activeLeftIcon && <View style={styles.leftIcon}>{activeLeftIcon}</View>}
        <TextInput
          style={[styles.input, disabled && styles.textDisabled]}
          placeholderTextColor={Colors.textMuted}
          editable={!disabled}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...inputProps}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  required: {
    color: Colors.danger,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  leftIcon: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    letterSpacing: -0.15,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.danger,
    letterSpacing: -0.1,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
});
