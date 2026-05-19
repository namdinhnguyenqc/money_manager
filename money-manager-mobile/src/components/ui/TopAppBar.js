import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';

/**
 * TopAppBar — shared across all drill-down screens on mobile.
 * Props:
 *  title       — main title text
 *  subtitle    — smaller label above title (optional)
 *  onBack      — back handler (shows chevron-back if provided)
 *  rightIcon   — Ionicons icon name for right button (optional)
 *  rightLabel  — text label for right button (optional, replaces icon)
 *  onRightPress— right button handler
 *  light       — true = white bg + dark text (default for most screens)
 *                false = primary bg + white text
 *  rightNode   — custom ReactNode replacing default right button
 */
export default function TopAppBar({
  title,
  subtitle,
  onBack,
  rightIcon,
  rightLabel,
  onRightPress,
  light = true,
  rightNode,
}) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const maxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;
  const fg = light ? COLORS.textPrimary : '#fff';
  const mutedFg = light ? COLORS.textMuted : 'rgba(255,255,255,0.72)';
  const bgColor = light ? COLORS.surface : COLORS.primary;
  const btnBg = light ? COLORS.surfaceLow : 'rgba(255,255,255,0.16)';

  return (
    <View style={[styles.wrap, isWeb && styles.wrapWeb, { backgroundColor: bgColor }]}>
      <StatusBar
        barStyle={light ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      <View style={[styles.row, isWeb && styles.rowWeb, { maxWidth }]}>
        {/* Back button */}
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.iconBtn, { backgroundColor: btnBg }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={fg} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}

        {/* Center title */}
        <View style={[styles.center, isWeb && styles.centerWeb]}>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[styles.subtitle, { color: mutedFg }, isWeb && styles.subtitleWeb]}
            >
              {subtitle}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.title, { color: fg }, isWeb && styles.titleWeb]}
          >
            {title}
          </Text>
        </View>

        {/* Right action */}
        {rightNode ? (
          rightNode
        ) : rightIcon || rightLabel ? (
          <TouchableOpacity
            onPress={onRightPress}
            style={[
              styles.iconBtn,
              { backgroundColor: btnBg },
              rightLabel && styles.labelBtn,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightLabel ? (
              <Text style={[styles.labelBtnText, { color: fg }]}>{rightLabel}</Text>
            ) : (
              <Ionicons name={rightIcon} size={20} color={fg} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  wrapWeb: {
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowWeb: {
    width: '100%',
    alignSelf: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtnPlaceholder: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  labelBtn: {
    paddingHorizontal: 14,
    width: 'auto',
    borderRadius: RADIUS.md,
  },
  labelBtnText: {
    fontSize: 13,
    ...FONTS.bold,
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
    letterSpacing: 0.3,
    ...FONTS.medium,
  },
  subtitleWeb: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    marginTop: 2,
    fontSize: 18,
    ...FONTS.bold,
  },
  titleWeb: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
});
