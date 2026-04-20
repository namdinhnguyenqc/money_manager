import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';

export default function TopAppBar({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  light = false,
}) {
  const { width } = useWindowDimensions();
  const isLight = light;
  const fg = isLight ? COLORS.textPrimary : '#fff';
  const muted = isLight ? COLORS.textSecondary : 'rgba(255,255,255,0.75)';
  const isWeb = Platform.OS === 'web';
  const maxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;

  return (
    <View style={[styles.wrap, isWeb && styles.wrapWeb, { backgroundColor: isLight ? COLORS.surface : COLORS.primary }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? COLORS.surface : COLORS.primary} />
      <View style={[styles.row, isWeb && styles.rowWeb, { maxWidth }]}>
        <TouchableOpacity onPress={onBack} style={[styles.iconBtn, isWeb && styles.iconBtnWeb, { backgroundColor: isLight ? COLORS.surfaceLow : 'rgba(255,255,255,0.16)' }]}>
          <Ionicons name="chevron-back" size={22} color={fg} />
        </TouchableOpacity>
        <View style={[styles.center, isWeb && styles.centerWeb]}>
          {subtitle ? <Text style={[styles.subtitle, isWeb && styles.subtitleWeb, { color: muted }]}>{subtitle}</Text> : null}
          <Text numberOfLines={1} style={[styles.title, isWeb && styles.titleWeb, { color: fg }]}>{title}</Text>
        </View>
        <TouchableOpacity
          onPress={onRightPress}
          style={[styles.iconBtn, isWeb && styles.iconBtnWeb, { backgroundColor: isLight ? COLORS.surfaceLow : 'rgba(255,255,255,0.16)', opacity: rightIcon ? 1 : 0 }]}
          disabled={!rightIcon}
        >
          <Ionicons name={rightIcon || 'ellipsis-horizontal'} size={20} color={fg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  wrapWeb: {
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderStrong,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowWeb: {
    width: '100%',
    alignSelf: 'center',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnWeb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  centerWeb: {
    alignItems: 'flex-start',
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 0.5,
    ...FONTS.medium,
  },
  subtitleWeb: {
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    fontSize: 20,
    ...FONTS.bold,
  },
  titleWeb: {
    fontSize: 24,
    letterSpacing: -0.3,
  },
});
