/**
 * TrọCare Mobile — Create Facility Screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAppToast } from '@/components/ui/ToastProvider';
import { apiPost } from '@/lib/api';

export default function NewFacilityScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useAppToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Vui lòng nhập tên dãy trọ.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await apiPost('/owner/boarding-houses', {
        name: name.trim(),
        address: address.trim() || '',
        description: description.trim() || '',
        status: 'ACTIVE',
      });
      showSuccess('Cơ sở mới đã được tạo.');
      router.back();
    } catch (error: any) {
      showError(error?.message || 'Không thể tạo cơ sở.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Thêm dãy trọ', headerBackTitle: 'Quay lại' }} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Input
            label="Tên dãy trọ"
            value={name}
            onChangeText={setName}
            placeholder="VD: Nhà trọ Phú Quý"
            error={errors.name}
            required
            icon={<Ionicons name="business-outline" size={18} color={Colors.textMuted} />}
          />
          <Input
            label="Địa chỉ"
            value={address}
            onChangeText={setAddress}
            placeholder="VD: 123 Nguyễn Văn Cừ, Q5"
            icon={<Ionicons name="location-outline" size={18} color={Colors.textMuted} />}
          />
          <Input
            label="Mô tả"
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả thêm về dãy trọ..."
            multiline
            numberOfLines={3}
            icon={<Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />}
          />
          <Button title="Tạo dãy trọ" onPress={handleSubmit} variant="primary" size="lg" fullWidth loading={loading} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
});
