import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { readMeterImages } from '@/lib/rentalOps';

type Props = {
  meter: 'electricity' | 'water';
  previousValue: number;
  onValueSuggested: (value: string) => void;
  onResultAccepted?: (result: {
    value: string;
    confidence: number;
    imageUri: string;
    needsReview: boolean;
  }) => void;
  compact?: boolean;
};

const meterLabels = {
  electricity: 'điện',
  water: 'nước',
} as const;

export default function MeterOcrAction({ meter, previousValue, onValueSuggested, onResultAccepted, compact = false }: Props) {
  const [reading, setReading] = useState(false);
  const meterLabel = meterLabels[meter];

  const analyzeAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      Alert.alert('Không đọc được ảnh', 'Ảnh không có dữ liệu để nhận diện. Vui lòng chọn ảnh khác hoặc nhập tay.');
      return;
    }

    try {
      setReading(true);
      const id = `${meter}-${Date.now()}`;
      const [ocr] = await readMeterImages([{
        id,
        dataUrl: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`,
      }]);
      if (!ocr?.number) {
        Alert.alert(
          'Không nhận diện được đồng hồ',
          'Ảnh có vẻ không phải mặt đồng hồ hoặc mặt số chưa đủ rõ. Vui lòng chụp/chọn ảnh khác hoặc nhập chỉ số thủ công.',
        );
        return;
      }

      const numericValue = Number(ocr.number);
      const warnings: string[] = [];
      if (!Number.isFinite(numericValue)) warnings.push('Kết quả không phải số hợp lệ.');
      if (Number.isFinite(numericValue) && numericValue < previousValue) {
        warnings.push(`Chỉ số nhận diện nhỏ hơn chỉ số đầu ${previousValue}.`);
      }
      if (ocr.confidence < 75) warnings.push(`Độ tin cậy thấp (${ocr.confidence}%).`);

      const detail = warnings.length > 0
        ? `${warnings.join('\n')}\n\nChỉ dùng kết quả sau khi bạn kiểm tra ảnh đồng hồ.`
        : `OCR đọc được ${ocr.number} với độ tin cậy ${ocr.confidence}%. Hãy kiểm tra trước khi xác nhận.`;

      Alert.alert(
        `Chỉ số ${meterLabel}: ${ocr.number}`,
        detail,
        [
          { text: 'Chọn ảnh khác', style: 'cancel', onPress: chooseSource },
          {
            text: 'Dùng kết quả',
            onPress: () => {
              const value = String(ocr.number);
              onValueSuggested(value);
              onResultAccepted?.({
                value,
                confidence: ocr.confidence,
                imageUri: asset.uri,
                needsReview: warnings.length > 0,
              });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('OCR tạm thời không khả dụng', error?.message || 'Vui lòng nhập chỉ số bằng tay.');
    } finally {
      setReading(false);
    }
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert('Cần quyền camera', `Cho phép camera để chụp đồng hồ ${meterLabel}. Bạn vẫn có thể chọn ảnh có sẵn hoặc nhập tay.`);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [4, 3],
    });
    if (result.canceled || !result.assets?.[0]) return;
    await analyzeAsset(result.assets[0]);
  };

  const openLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert('Cần quyền thư viện ảnh', 'Cho phép truy cập ảnh để chọn ảnh đồng hồ có sẵn.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [4, 3],
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await analyzeAsset(result.assets[0]);
  };

  const chooseSource = () => {
    Alert.alert(`Thêm ảnh đồng hồ ${meterLabel}`, 'Chọn cách cung cấp ảnh để phân tích chỉ số.', [
      { text: 'Chụp ảnh', onPress: () => void openCamera() },
      { text: 'Chọn từ thư viện', onPress: () => void openLibrary() },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.button, compact && styles.buttonCompact]}
      onPress={chooseSource}
      disabled={reading}
      accessibilityRole="button"
      accessibilityLabel={`Thêm ảnh đồng hồ ${meterLabel} để nhận diện chỉ số`}
    >
      {reading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Ionicons name="camera-outline" size={18} color={Colors.primary} />
      )}
      {!compact ? <Text style={styles.label}>{reading ? 'Đang đọc...' : 'Thêm ảnh đồng hồ'}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  buttonCompact: {
    width: 44,
    paddingHorizontal: 0,
  },
  label: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
});
