/**
 * TrọCare Tenant Mobile — Premium Register Screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { registerWithInvite, validateInviteCode } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteValidated, setInviteValidated] = useState(false);
  const [matchedTenantName, setMatchedTenantName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleVerifyInvite = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mã mời.');
      return;
    }

    setCheckingInvite(true);
    setInviteValidated(false);
    setMatchedTenantName('');

    try {
      const res = await validateInviteCode(inviteCode.trim().toUpperCase());
      if (res.valid) {
        setInviteValidated(true);
        setMatchedTenantName(res.tenantName || 'Khách thuê trọ');
        setName(res.tenantName || ''); // Auto-fill name from landlord entry
        Alert.alert('Hợp lệ! 🎉', `Mã mời khớp với hồ sơ: ${res.tenantName || 'Khách thuê'}. Hãy hoàn tất đăng ký.`);
      } else {
        Alert.alert('Không hợp lệ', res.message || 'Mã mời không tồn tại, đã hết hạn hoặc đã được sử dụng.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi kiểm tra', err.message || 'Không thể xác thực mã mời lúc này.');
    } finally {
      setCheckingInvite(false);
    }
  };

  const handleRegister = async () => {
    if (!inviteValidated) {
      Alert.alert('Xác thực mã mời', 'Vui lòng điền và bấm "Kiểm tra mã mời" trước.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setRegistering(true);
    try {
      const data = await registerWithInvite(
        phone.trim(),
        password,
        name.trim(),
        inviteCode.trim().toUpperCase()
      );
      setUser(data.user);
      Alert.alert('Thành công! 🎉', 'Tài khoản của bạn đã được đăng ký và liên kết thành công.');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error?.message || 'Có lỗi xảy ra trong quá trình đăng ký.');
      setRegistering(false);
    }
  };

  const handleFillMockInvite = () => {
    setInviteCode('TRO12345');
    setPhone('0987654321');
    setPassword('123456');
    Alert.alert('Thông tin test', 'Đã điền mã mời test. Vui lòng nhấn "Kiểm tra mã mời" để thực hiện mock verify.');
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
          
          {/* Header */}
          <View style={styles.headerSection}>
            <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.appName}>Liên kết tài khoản</Text>
            <Text style={styles.tagline}>Đăng ký tài khoản mới bằng mã mời do chủ trọ cung cấp</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            
            {/* Step 1: Invite Code Verification */}
            <Text style={styles.sectionTitle}>1. Xác thực mã mời</Text>
            
            <View style={styles.inviteRow}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="Ví dụ: TCINV123"
                  value={inviteCode}
                  onChangeText={(val) => {
                    setInviteCode(val);
                    setInviteValidated(false);
                  }}
                  autoCapitalize="characters"
                  leftIcon={<Ionicons name="key-outline" size={18} color="#64748B" />}
                  editable={!inviteValidated}
                />
              </View>
              
              {!inviteValidated ? (
                <TouchableOpacity
                  style={[styles.btnVerify, checkingInvite && { opacity: 0.7 }]}
                  onPress={handleVerifyInvite}
                  disabled={checkingInvite}
                >
                  {checkingInvite ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnVerifyText}>Kiểm tra</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.verifySuccessBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                </View>
              )}
            </View>

            {inviteValidated && (
              <View style={styles.matchedInfoBox}>
                <Ionicons name="person-outline" size={16} color={Colors.success} />
                <Text style={styles.matchedInfoText}>
                  Khớp hồ sơ: <Text style={{ fontFamily: Typography.fontFamily.bold }}>{matchedTenantName}</Text>
                </Text>
              </View>
            )}

            {/* Step 2: Account details */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>2. Thiết lập tài khoản</Text>

            <Input
              label="Họ và tên"
              placeholder="Nhập họ và tên đầy đủ"
              value={name}
              onChangeText={setName}
              leftIcon={<Ionicons name="person-outline" size={18} color="#64748B" />}
              editable={inviteValidated}
            />

            <View style={{ marginTop: 12 }}>
              <Input
                label="Số điện thoại"
                placeholder="Nhập số điện thoại của bạn"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                leftIcon={<Ionicons name="phone-portrait-outline" size={18} color="#64748B" />}
                editable={inviteValidated}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Input
                label="Mật khẩu"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
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
                editable={inviteValidated}
              />
            </View>

            <Button
              title="Đăng ký & Liên kết"
              onPress={handleRegister}
              loading={registering}
              disabled={!inviteValidated}
              style={{ marginTop: 28 }}
            />
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <View style={styles.loginPrompt}>
              <Text style={styles.promptText}>Bạn đã đăng ký tài khoản trước đó?</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.loginLink}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && (
              <TouchableOpacity
                style={styles.btnMock}
                onPress={handleFillMockInvite}
                activeOpacity={0.8}
              >
                <Text style={styles.btnMockText}>Điền nhanh thông tin mã mời (Test)</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.terms}>
              Bằng việc đăng ký, bạn đồng ý với{' '}
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
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    width: '100%',
  },
  btnBack: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  appName: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  tagline: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
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
  sectionTitle: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnVerify: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  btnVerifyText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  verifySuccessBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  matchedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  matchedInfoText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#0f766e',
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  loginPrompt: {
    alignItems: 'center',
    gap: 6,
  },
  promptText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  btnMock: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 113, 227, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMockText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
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
});
