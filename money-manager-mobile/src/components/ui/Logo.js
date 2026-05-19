import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function Logo({ size = 'md', showText = true, style }) {
  const sizeMap = {
    sm: 28,
    md: 40,
    lg: 80,
    xl: 120,
  };

  const imgSize = sizeMap[size] || 40;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../../assets/icon.png')}
        style={{
          width: imgSize,
          height: imgSize,
          borderRadius: size === 'xl' || size === 'lg' ? 24 : 10,
        }}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[styles.text, { fontSize: size === 'lg' || size === 'xl' ? 26 : 20 }]}>
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
