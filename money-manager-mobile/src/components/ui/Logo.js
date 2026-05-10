import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';

export default function Logo({ size = 'md', showText = true, style }) {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 64,
    xl: 96,
  };

  const svgSize = sizeMap[size] || 32;

  return (
    <View style={[styles.container, style]}>
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 100 100"
        fill="none"
      >
        <Defs>
          <LinearGradient id="trocareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1D8FE1" />
            <Stop offset="100%" stopColor="#24C7A6" />
          </LinearGradient>
        </Defs>
        
        {/* Heart/Leaf Symbol */}
        <Path
          d="M50 85 C50 85, 20 60, 20 40 A15 15 0 0 1 50 30 A15 15 0 0 1 80 40 C80 60, 50 85, 50 85 Z"
          fill="url(#trocareGradient)"
          opacity="0.9"
        />
        {/* Hand/Support Curve Left */}
        <Path
          d="M15 55 C10 70, 30 85, 45 90 C35 80, 25 70, 25 50 Z"
          fill="#1D8FE1"
        />
        {/* Hand/Support Curve Right */}
        <Path
          d="M85 55 C90 70, 70 85, 55 90 C65 80, 75 70, 75 50 Z"
          fill="#24C7A6"
        />
      </Svg>
      {showText && (
        <Text style={[styles.text, { fontSize: size === 'lg' || size === 'xl' ? 24 : 18 }]}>
          <Text style={{ color: '#1D8FE1' }}>Trọ</Text>
          <Text style={{ color: '#24C7A6' }}>Care</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontFamily: 'System',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
