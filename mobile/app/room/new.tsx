/**
 * TrọCare Mobile — Create Room Screen
 * Form fields:
 * - Room Name (e.g. 101, 102)
 * - Rent Price (₫/month)
 * - Area (m²)
 * - Max People
 * - AC availability (has_ac)
 * Submits to: /owner/boarding-houses/:facility_id/rooms
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import { createOwnerRoom, loadBoardingHouse } from '@/lib/rentalOps';

export default function NewRoomScreen() {
  const router = useRouter();
  const { facility_id } = useLocalSearchParams<{ facility_id: string }>();

  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [facility, setFacility] = useState<any | null>(null);

  // Form Inputs
  const [form, setForm] = useState({
    name: '',
    price: '',
    area: '20',
    maxPeople: '2',
    status: 'AVAILABLE' as 'AVAILABLE' | 'MAINTENANCE',
    hasAC: false,
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    async function init() {
      if (!facility_id) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin dãy trọ.', [
          { text: 'Quay lại', onPress: () => router.back() },
        ]);
        return;
      }

      try {
        setLoading(true);
        const f = await loadBoardingHouse(facility_id);
        setFacility(f);
      } catch (e: any) {
        showToast(e?.message || 'Không tìm thấy dãy trọ.', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [facility_id]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên phòng (ví dụ: 101).');
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      Alert.alert('Giá trị không hợp lệ', 'Vui lòng nhập đơn giá thuê hàng tháng hợp lệ.');
      return;
    }

    try {
      setSubmitting(true);
      await createOwnerRoom(facility_id!, {
        name: form.name.trim(),
        price: Number(form.price),
        area: Number(form.area || 0),
        maxPeople: Number(form.maxPeople || 2),
        status: form.status,
      });

      showToast('Thêm phòng trọ thành công!', 'success');
      router.back();
    } catch (e: any) {
      Alert.alert('Lỗi thêm phòng', e?.message || 'Không thể tạo phòng trọ mới.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin dãy trọ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm phòng mới</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        
        {/* Boarding House Reference */}
        {facility && (
          <Card style={styles.refCard}>
            <Ionicons name="business" size={18} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.refLabel}>Dãy trọ áp dụng:</Text>
              <Text style={styles.refValue}>{facility.name}</Text>
            </View>
          </Card>
        )}

        {/* Main Form Fields */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Thông tin phòng trọ</Text>

          <Input
            label="Tên / Số phòng *"
            placeholder="Ví dụ: 101, 202, A1"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <View style={{ height: 12 }} />

          <Input
            label="Giá thuê hàng tháng (₫) *"
            placeholder="Ví dụ: 3000000"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(v) => setForm({ ...form, price: v })}
          />
          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Diện tích (m²)"
                placeholder="Ví dụ: 20"
                keyboardType="numeric"
                value={form.area}
                onChangeText={(v) => setForm({ ...form, area: v })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Số người tối đa"
                placeholder="Ví dụ: 2"
                keyboardType="numeric"
                value={form.maxPeople}
                onChangeText={(v) => setForm({ ...form, maxPeople: v })}
              />
            </View>
          </View>
        </Card>

        {/* Service Options & Statuses */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Trạng thái & Tiện ích</Text>

          {/* AC Toggle */}
          <TouchableOpacity
            style={[styles.toggleRow, form.hasAC && styles.toggleRowActive]}
            onPress={() => setForm({ ...form, hasAC: !form.hasAC })}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Trang bị điều hòa (AC)</Text>
              <Text style={styles.toggleDesc}>
                Phòng trọ được lắp đặt sẵn điều hòa không khí.
              </Text>
            </View>
            <Ionicons
              name={form.hasAC ? 'toggle' : 'toggle-outline'}
              size={32}
              color={form.hasAC ? Colors.success : Colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Status Selection */}
          <Text style={styles.label}>Trạng thái phòng ban đầu</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                form.status === 'AVAILABLE' && styles.statusBtnActiveAvailable,
              ]}
              onPress={() => setForm({ ...form, status: 'AVAILABLE' })}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={form.status === 'AVAILABLE' ? Colors.successDark : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusText,
                  form.status === 'AVAILABLE' && styles.statusTextActive,
                ]}
              >
                Sẵn sàng cho thuê
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                form.status === 'MAINTENANCE' && styles.statusBtnActiveMaintenance,
              ]}
              onPress={() => setForm({ ...form, status: 'MAINTENANCE' })}
            >
              <Ionicons
                name="construct-outline"
                size={16}
                color={form.status === 'MAINTENANCE' ? Colors.warning : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusText,
                  form.status === 'MAINTENANCE' && styles.statusTextActive,
                ]}
              >
                Bảo trì sửa chữa
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Submit */}
        <Button
          title={submitting ? 'Đang thêm phòng...' : 'Lưu thông tin phòng'}
          variant="primary"
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitBtn}
          icon={submitting ? <ActivityIndicator size="small" color="#fff" /> : undefined}
        />
      </ScrollView>

      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  refCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', padding: 14 },
  refLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  refValue: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.successDark, marginTop: 2 },
  card: { padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  sectionHeader: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.3 },
  inputRow: { flexDirection: 'row', gap: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  toggleRowActive: {},
  toggleTitle: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  toggleDesc: { fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 14 },
  label: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary, marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  statusBtnActiveAvailable: {
    borderColor: Colors.successDark,
    backgroundColor: '#f0fdf4',
  },
  statusBtnActiveMaintenance: {
    borderColor: Colors.warning,
    backgroundColor: '#fffbeb',
  },
  statusText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  statusTextActive: { color: Colors.textPrimary },
  submitBtn: { marginVertical: 10, paddingVertical: 14 },
});
