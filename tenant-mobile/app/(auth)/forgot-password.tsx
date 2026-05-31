/**
 * TrọCare Tenant Mobile — Premium Forgot Password Screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { forgotPassword } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!phone.trim() || !email.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại và địa chỉ email hợp đồng.');
      return;
    }

    setLoading(true);
    try {
      const data = await forgotPassword(phone.trim(), email.trim());
      Alert.alert(
        'Khôi phục thành công',
        data.message || 'Mật khẩu đã được khôi phục về email của bạn. Vui lòng đăng nhập lại.',
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => router.replace('/(auth)/login'),
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Thất bại',
        error?.message || 'Khôi phục mật khẩu không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🌌 Premium Ambient Blue Blur Orbs */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header & Back Button */}
          <View style={styles.headerSection}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back-outline" size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.logoBadge}>
              <Ionicons name="key-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>
              Quên mật khẩu?
            </Text>
            <Text style={styles.tagline}>Khôi phục mật khẩu mặc định qua thông tin hợp đồng</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Khôi phục mật khẩu</Text>
            <Text style={styles.cardSubtitle}>
              Điền số điện thoại và email chính xác trên hợp đồng thuê phòng của bạn. Hệ thống sẽ đặt lại mật khẩu mặc định chính là địa chỉ email hợp đồng của bạn.
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

            <View style={{ marginTop: 12 }}>
              <Input
                label="Email hợp đồng"
                placeholder="Nhập địa chỉ email trên hợp đồng"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Ionicons name="mail-outline" size={18} color="#64748B" />}
              />
            </View>

            <Button
              title="Yêu cầu đặt lại mật khẩu"
              onPress={handleForgotPassword}
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <TouchableOpacity 
              onPress={() => router.replace('/(auth)/login')}
              style={styles.backToLogin}
              activeOpacity={0.7}
            >
              <Text style={styles.backToLoginText}>Quay lại màn hình đăng nhập</Text>
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Lưu ý: Nếu chưa thiết lập email trên hợp đồng, bạn phải liên hệ chủ nhà (owner) để cập nhật thông tin email trước khi thực hiện đặt lại mật khẩu.
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
    backgroundColor: '#F4F4F6', // Matte Snow White backing
  },
  glowTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(239, 68, 68, 0.05)', // Faint red/warm glow for recovery
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(0, 113, 227, 0.06)', // Faint blue glow
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEF',
    marginBottom: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
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
  appName: {
    fontSize: 24,
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
    paddingHorizontal: 12,
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
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  backToLogin: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backToLoginText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  helpText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
