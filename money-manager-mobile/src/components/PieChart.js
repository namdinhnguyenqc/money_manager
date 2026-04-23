import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';

export default function PieChart({ data, size = 180 }) {
  const radius = size / 2;
  const innerRadius = radius * 0.65;
  const centerX = radius;
  const centerY = radius;
  const total = data.reduce((sum, item) => sum + item.total, 0);

  if (total === 0) return null;

  let startAngle = 0;

  const createArc = (start, end, r) => {
    const x1 = centerX + r * Math.cos((Math.PI * start) / 180);
    const y1 = centerY + r * Math.sin((Math.PI * start) / 180);
    const x2 = centerX + r * Math.cos((Math.PI * end) / 180);
    const y2 = centerY + r * Math.sin((Math.PI * end) / 180);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <View style={styles.container}>
      <View style={{ width: size + 34, height: size + 34, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size + 34} height={size + 34} viewBox={`-17 -17 ${size + 34} ${size + 34}`}>
          <Defs>
            {data.map((item, index) => (
              <LinearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={item.color || COLORS.primary} stopOpacity="1" />
                <Stop offset="100%" stopColor={item.color || COLORS.primary} stopOpacity="0.72" />
              </LinearGradient>
            ))}
          </Defs>

          <G rotation="-90" origin={`${centerX}, ${centerY}`}>
            {data.map((item, index) => {
              const angle = (item.total / total) * 360;
              const endAngle = startAngle + angle;
              const path = createArc(startAngle, endAngle, radius);
              startAngle = endAngle;
              return <Path key={`arc-${index}`} d={path} fill={`url(#grad-${index})`} />;
            })}
            <Circle cx={centerX} cy={centerY} r={innerRadius} fill={COLORS.surfaceLowest} />
          </G>
        </Svg>

        <View style={styles.centerLabel}>
          <Text style={styles.centerTotal}>{(total / 1000000).toFixed(1)}M</Text>
          <Text style={styles.centerLabelTxt}>Tổng chi tiêu</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={`legend-${index}`} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color || COLORS.primary }]} />
            <View>
              <Text style={styles.legendTitle}>{item.name}</Text>
              <Text style={styles.legendPct}>{((item.total / total) * 100).toFixed(1)}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18, gap: 10 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendTitle: { color: COLORS.textPrimary, ...FONTS.bold, fontSize: 11 },
  legendPct: { color: COLORS.textMuted, ...FONTS.medium, fontSize: 10 },
  centerLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerTotal: { color: COLORS.textPrimary, ...FONTS.black, fontSize: 18 },
  centerLabelTxt: { color: COLORS.textMuted, ...FONTS.semibold, fontSize: 10, marginTop: -2 },
});
