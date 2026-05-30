/**
 * TrọCare Mobile — Premium Login Screen (White & Blue Redesign)
 * A masterpiece of landlord authentication design under Senior UI/UX guidelines:
 * - Stunning white & blue (trắng xanh) dual-tone color architecture.
 * - Glassmorphic ambient blue aurora backdrops floating on alabaster.
 * - Porcelain bento-box style feature showcase grid.
 * - High-end Google Sign-In and developer mock login buttons.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Config from '@/constants/Config';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { loginWithGoogle } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
  }, []);

  const handleGoogleLogin = async () => {
    const missingAndroidClient = Platform.OS === 'android' && !Config.GOOGLE_ANDROID_CLIENT_ID;
    const missingIosClient = Platform.OS === 'ios' && !Config.GOOGLE_IOS_CLIENT_ID;

    if (missingAndroidClient || missingIosClient) {
      Alert.alert(
        'Thiếu OAuth Client ID',
        missingAndroidClient
          ? 'Tạo Google OAuth Client loại Android cho package com.trocare.mobile và SHA-1 debug, rồi set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.'
          : 'Tạo Google OAuth Client loại iOS cho bundle identifier của app, rồi set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.'
      );
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => null);
      const result = await GoogleSignin.signIn();

      if (result.type === 'cancelled') {
        setLoading(false);
        return;
      }

      const idToken = result.data.idToken;
      if (!idToken) {
        throw new Error('Google không trả về ID token. Kiểm tra Web Client ID trong Google Sign-In config.');
      }

      const data = await loginWithGoogle(idToken);
      const profileCompleted =
        data.user?.is_profile_completed ??
        data.user?.isProfileCompleted ??
        data.profile?.is_profile_completed ??
        data.profile?.isProfileCompleted ??
        data.nextStep === 'DONE';
      setUser(data.user, profileCompleted);
      const pendingApproval = data.nextStep === 'PENDING_APPROVAL' || data.user?.status === 'PENDING_APPROVAL' || data.user?.approvalStatus === 'PENDING_APPROVAL';
      router.replace(!profileCompleted ? '/(auth)/complete-profile' : pendingApproval ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (error: any) {
      Alert.alert('Lỗi đăng nhập', error?.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const handleMockLogin = async () => {
    setLoading(true);
    try {
      const data = await loginWithGoogle('mock-owner-google-token');
      const profileCompleted =
        data.user?.is_profile_completed ??
        data.user?.isProfileCompleted ??
        data.profile?.is_profile_completed ??
        data.profile?.isProfileCompleted ??
        data.nextStep === 'DONE';
      setUser(data.user, profileCompleted);
      const pendingApproval = data.nextStep === 'PENDING_APPROVAL' || data.user?.status === 'PENDING_APPROVAL' || data.user?.approvalStatus === 'PENDING_APPROVAL';
      router.replace(!profileCompleted ? '/(auth)/complete-profile' : pendingApproval ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (error: any) {
      Alert.alert('Lỗi đăng nhập', error?.message || 'Không thể đăng nhập bằng tài khoản test.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🌌 Premium Ambient Blue Blur Orbs */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <View style={styles.content}>
        {/* Logo & Branding */}
        <View style={styles.brandSection}>
          <View style={styles.logoCard}>
            <Image
              source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-256.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>
            TrọCare<Text style={{ color: Colors.primary }}>.</Text>
          </Text>
          <Text style={styles.tagline}>Nền tảng quản lý phòng trọ thế hệ mới</Text>
        </View>

        {/* Features Bento Grid (Trắng & Xanh) */}
        <View style={styles.featuresBento}>
          <View style={styles.bentoRow}>
            <View style={styles.bentoItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#e0f2fe' }]}>
                <Image
                  source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-32.png')}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.featureTitle}>Vận hành trọ</Text>
              <Text style={styles.featureDesc}>Giám sát số lượng phòng & thông tin khách thuê.</Text>
            </View>

            <View style={styles.bentoItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#e0f2fe' }]}>
                <Image
                  source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-32.png')}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.featureTitle}>Hóa đơn tự động</Text>
              <Text style={styles.featureDesc}>Lập hóa đơn & tính điện nước chu kỳ nhanh chóng.</Text>
            </View>
          </View>

          <View style={styles.bentoRow}>
            <View style={styles.bentoItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#e0f2fe' }]}>
                <Image
                  source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-32.png')}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.featureTitle}>Thu chi sổ quỹ</Text>
              <Text style={styles.featureDesc}>Kiểm toán dòng tiền thực tế & lợi suất ròng.</Text>
            </View>

            <View style={styles.bentoItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#e0f2fe' }]}>
                <Image
                  source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-32.png')}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.featureTitle}>Marketplace</Text>
              <Text style={styles.featureDesc}>Đăng tin trống phòng lên sàn liên kết tiện lợi.</Text>
            </View>
          </View>
        </View>

        {/* Action Authentication Buttons */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={[styles.btnGoogle, { shadowColor: Colors.primary }]}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <Image
              source={require('@/assets/favicon.png')}
              style={{ width: 20, height: 20, marginRight: 10 }}
              resizeMode="contain"
            />
            <Text style={styles.btnGoogleText}>Tiếp tục với Google</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={styles.btnMock}
              onPress={handleMockLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.btnMockText}>Đăng nhập nhanh Chủ trọ (Test Bypass)</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.terms}>
            Bằng việc đăng nhập, bạn đồng ý với{' '}
            <Text style={styles.termsLink}>Điều khoản sử dụng</Text> &{' '}
            <Text style={styles.termsLink}>Chính sách bảo mật</Text>
          </Text>
        </View>
      </View>
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
    backgroundColor: 'rgba(0, 113, 227, 0.09)', // Glowing brand blue
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 45,
  },
  logoCard: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 113, 227, 0.15)', // Glowing blue border
    shadowColor: '#0071e3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  appName: {
    fontSize: 30,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#0F172A',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 4,
    letterSpacing: -0.2,
  },

  /* Features Bento Grid (White Porcelain cards with Soft Blue Highlights) */
  featuresBento: {
    gap: 12,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    shadowColor: 'rgba(0, 113, 227, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1.5,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  featureDesc: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    lineHeight: 14.5,
    marginTop: 3,
  },

  /* Auth Button Section */
  loginSection: {
    gap: 14,
  },
  btnGoogle: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF', // Crisp White
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 113, 227, 0.18)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  btnGoogleText: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  btnMock: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#0071e3', // Premium Brand Blue
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0071e3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  btnMockText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  terms: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#0071e3',
    fontFamily: Typography.fontFamily.semibold,
  },
});
