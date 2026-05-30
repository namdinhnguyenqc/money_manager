/**
 * TrọCare Mobile — Complete Profile Screen
 * Onboarding form: Full name, Phone (10 digits), CCCD (12 digits), Province/District.
 * Email shown as readonly from Google auth.
 * Matches web-admin's complete-profile page behavior.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { completeProfile, loadProvinces, loadDistricts } from '@/lib/profile';
import type { Province, District } from '@/lib/profile';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { user, markProfilePendingApproval } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [address, setAddress] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProvinces().then(setProvinces).catch(() => {});
  }, []);

  useEffect(() => {
    if (provinceCode) {
      setDistrictCode('');
      loadDistricts(provinceCode).then(setDistricts).catch(() => {});
    } else {
      setDistricts([]);
    }
  }, [provinceCode]);

  const onlyDigits = (value: string, maxLen: number) =>
    value.replace(/\D/g, '').slice(0, maxLen);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ tên.';
    const cleanPhone = onlyDigits(phone, 10);
    if (cleanPhone.length !== 10) errs.phone = 'Số điện thoại phải có đúng 10 số.';
    const cleanIdCard = onlyDigits(idCard, 12);
    if (cleanIdCard.length !== 12) errs.idCard = 'CCCD phải có đúng 12 số.';
    if (!address.trim() || address.trim().length < 5) errs.address = 'Vui lòng nhập địa chỉ chi tiết.';
    if (!provinceCode) errs.provinceCode = 'Vui lòng chọn tỉnh/thành phố.';
    if (!districtCode) errs.districtCode = 'Vui lòng chọn quận/huyện.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const province = provinces.find((item) => item.code === provinceCode);
      const district = districts.find((item) => item.code === districtCode);
      await completeProfile({
        fullName: fullName.trim(),
        phone: onlyDigits(phone, 10),
        idCard: onlyDigits(idCard, 12),
        addressLine: address.trim(),
        address: address.trim(),
        provinceCode,
        provinceName: province?.name || '',
        districtCode,
        districtName: district?.name || '',
      });
      markProfilePendingApproval();
      router.replace('/(auth)/pending-approval');
    } catch (error: any) {
      // Handle field errors (e.g., duplicate phone) — preserve all inputs
      if (error?.fieldErrors) {
        const fieldErrs: Record<string, string> = {};
        Object.entries(error.fieldErrors).forEach(([key, messages]: [string, any]) => {
          fieldErrs[key] = Array.isArray(messages) ? messages[0] : messages;
        });
        setErrors(fieldErrs);
      } else {
        Alert.alert('Lỗi', error?.message || 'Không thể hoàn tất hồ sơ.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBg}>
            <Image
              source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-256.png')}
              style={{ width: 44, height: 44 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Hoàn tất hồ sơ</Text>
          <Text style={styles.subtitle}>
            Vui lòng điền thông tin để bắt đầu sử dụng TrọCare
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            value={user?.email || ''}
            disabled
            icon={<Ionicons name="mail-outline" size={18} color={Colors.textMuted} />}
            hint="Email được lấy từ tài khoản Google, không thể thay đổi."
          />

          <Input
            label="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nguyễn Văn A"
            error={errors.fullName}
            required
            icon={<Ionicons name="person-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Số điện thoại"
            value={phone}
            onChangeText={(v) => setPhone(onlyDigits(v, 10))}
            placeholder="0901234567"
            keyboardType="phone-pad"
            error={errors.phone}
            required
            icon={<Ionicons name="call-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Số CCCD"
            value={idCard}
            onChangeText={(v) => setIdCard(onlyDigits(v, 12))}
            placeholder="012345678901"
            keyboardType="number-pad"
            error={errors.idCard}
            required
            icon={<Ionicons name="card-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Địa chỉ"
            value={address}
            onChangeText={setAddress}
            placeholder="123 Đường ABC, Phường XYZ"
            error={errors.address}
            required
            icon={<Ionicons name="location-outline" size={18} color={Colors.textMuted} />}
          />

          {/* Province/District pickers */}
          {provinces.length > 0 && (
            <View style={styles.pickerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerLabel}>Tỉnh/Thành phố <Text style={styles.required}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {provinces.map((p) => (
                    <TouchableOpacity
                      key={p.code}
                      style={[styles.chip, provinceCode === p.code && styles.chipActive]}
                      onPress={() => setProvinceCode(p.code)}
                    >
                      <Text style={[styles.chipText, provinceCode === p.code && styles.chipTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.provinceCode ? <Text style={styles.errorText}>{errors.provinceCode}</Text> : null}
              </View>
            </View>
          )}

          {provinceCode && (
            <View style={styles.pickerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerLabel}>Quận/Huyện <Text style={styles.required}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {districts.map((d) => (
                    <TouchableOpacity
                      key={d.code}
                      style={[styles.chip, districtCode === d.code && styles.chipActive]}
                      onPress={() => setDistrictCode(d.code)}
                    >
                      <Text style={[styles.chipText, districtCode === d.code && styles.chipTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.districtCode ? <Text style={styles.errorText}>{errors.districtCode}</Text> : null}
              </View>
            </View>
          )}

          <Button
            title="Hoàn tất hồ sơ"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  form: {
    gap: 2,
  },
  pickerRow: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: Colors.danger,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.danger,
    marginTop: 6,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
});
