/**
 * TrọCare Tenant Mobile — Login Screen
 * Phone + password authentication.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, ScrollView,
  Platform, Alert, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { loginWithPhone } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const devPhone = '0927368772';
  const devPassword = '0927368772';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submitLogin = async (loginPhone: string, loginPassword: string) => {
    if (!loginPhone.trim() || !loginPassword.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    try {
      const data = await loginWithPhone(loginPhone.trim(), loginPassword.trim());
      setUser(data.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      const isNetwork =
        /network request failed|failed to fetch|timeout/i.test(String(error?.message || ''));

      if (isNetwork) {
        Alert.alert(
          'Không thể kết nối',
          'Máy chủ đang khởi động lại (thường mất 30–60 giây). Vui lòng chờ một chút rồi thử lại.',
          [{ text: 'Thử lại', onPress: handleLogin }, { text: 'Hủy', style: 'cancel' }],
        );
      } else {
        Alert.alert('Đăng nhập thất bại', error?.message || 'Số điện thoại hoặc mật khẩu không chính xác.');
      }
      throw error;
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await submitLogin(phone, password);
    } catch {
      setLoading(false);
    }
  };

  const handleBypassLogin = async () => {
    setBypassLoading(true);
    try {
      await submitLogin(devPhone, devPassword);
    } catch {
      setBypassLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient glow orbs */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.logoBadge}>
              <Image
                source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-256.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>
              TrọCare <Text style={{ color: Colors.primary }}>Tenant</Text>
            </Text>
            <Text style={styles.tagline}>Ứng dụng dành cho Người thuê phòng trọ</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardSubtitle}>
              Nhập số điện thoại và mật khẩu được cấp bởi chủ trọ
            </Text>

            <Input
              label="Số điện thoại"
              placeholder="Nhập số điện thoại đăng ký"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              leftIcon={<Ionicons name="phone-portrait-outline" size={18} color="#64748B" />}
            />

            <View style={{ position: 'relative', marginTop: 12 }}>
              <Input
                label="Mật khẩu"
                placeholder="Nhập mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#64748B" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={{ alignSelf: 'flex-end', marginTop: 8 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.primary }}>
                Quên mật khẩu?
              </Text>
            </TouchableOpacity>

            <Button
              title={loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              onPress={handleLogin}
              loading={loading}
              disabled={bypassLoading}
              style={{ marginTop: 24 }}
            />

            <TouchableOpacity
              onPress={handleBypassLogin}
              disabled={loading || bypassLoading}
              style={[styles.bypassButton, (loading || bypassLoading) && styles.disabledButton]}
              activeOpacity={0.8}
            >
              {bypassLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="flash-outline" size={18} color={Colors.primary} />
              )}
              <Text style={styles.bypassButtonText}>
                {bypassLoading ? 'Đang vào app test...' : 'Vào app test không cần nhập'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <Text style={styles.helpText}>
              Liên hệ chủ trọ để được cấp tài khoản đăng nhập
            </Text>
            <Text style={styles.terms}>
              Bằng việc đăng nhập, bạn đồng ý với{' '}
              <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> &{' '}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  glowTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 113, 227, 0.09)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(0, 113, 227, 0.06)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 113, 227, 0.15)',
    shadowColor: '#0071e3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  appName: {
    fontSize: 26,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  helpText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
  },
  terms: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semibold,
  },
  bypassButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 113, 227, 0.18)',
    backgroundColor: 'rgba(0, 113, 227, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bypassButtonText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
