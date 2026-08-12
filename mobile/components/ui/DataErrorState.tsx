import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from './Button';

type Props = {
  title?: string;
  message: string;
  onRetry: () => void;
};

export default function DataErrorState({
  title = 'Chưa tải được dữ liệu',
  message,
  onRetry,
}: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.icon}>
        <Ionicons name="cloud-offline-outline" size={24} color={Colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Button title="Thử tải lại" variant="outline" size="md" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dangerLight },
  title: { marginTop: 14, fontSize: 17, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, textAlign: 'center' },
  message: { marginTop: 6, marginBottom: 18, fontSize: 14, lineHeight: 20, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, textAlign: 'center' },
});
