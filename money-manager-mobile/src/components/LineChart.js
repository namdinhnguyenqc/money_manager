import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LineChart({ data, height = 220 }) {
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = height - 60;

  if (!data || data.length === 0) return null;

  const vals = data.map((d) => d.value);
  const maxVal = Math.max(...vals, 1);
  const minVal = Math.min(...vals, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? 0 : (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y };
  });

  const getCurvePath = (pts) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 2;
      const cp1y = pts[i].y;
      const cp2x = pts[i].x + (pts[i + 1].x - pts[i].x) / 2;
      const cp2y = pts[i + 1].y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return path;
  };

  const linePath = getCurvePath(points);
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
    : '';

  return (
    <View style={styles.container}>
      <Svg width={chartWidth + 20} height={height} viewBox={`-10 0 ${chartWidth + 20} ${height}`}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.35" />
            <Stop offset="60%" stopColor={COLORS.primary} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <G x="5" y="20">
          {[0, 0.5, 1].map((v) => (
            <Path key={v} d={`M 0 ${chartHeight * v} L ${chartWidth} ${chartHeight * v}`} stroke={COLORS.borderSoft} strokeWidth="1" />
          ))}

          {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={COLORS.primary}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : null}

          {points.map((point, i) => (
            <G key={i}>
              <Circle cx={point.x} cy={point.y} r="6" fill={`${COLORS.primary}22`} />
              <Circle cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke={COLORS.primary} strokeWidth="2" />
            </G>
          ))}
        </G>
      </Svg>

      <View style={styles.labelRow}>
        {data.map((d, i) => (
          <Text key={i} style={styles.label}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 22,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  label: {
    color: COLORS.textMuted,
    ...FONTS.semibold,
    fontSize: 10,
  },
});
