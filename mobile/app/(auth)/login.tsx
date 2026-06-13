/**
 * TrọCare Owner — Login Screen
 * Google Sign-In via @react-native-google-signin/google-signin (native Google Play Services).
 * Requires Android OAuth Client ID with correct SHA-1 registered in Google Cloud Console.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, Alert,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  console.warn('Google Sign-In native module not available.');
}

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Config from '@/constants/Config';
import { useAuthStore } from '@/store/authStore';
import { getProfileCompleted, isDashboardReady, isPendingApproval, loginWithGoogle } from '@/lib/auth';
import { finishLoginTimeline, markLoginTimeline, resetLoginTimeline } from '@/lib/telemetry/loginTimeline';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const openPolicyPage = (path: '/terms' | '/privacy') => {
    Linking.openURL(`${Config.WEB_URL}${path}`).catch(() => {
      Alert.alert('Không thể mở liên kết', 'Vui lòng thử lại sau.');
    });
  };

  useEffect(() => {
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: Config.GOOGLE_WEB_CLIENT_ID,
          // androidClientId is read automatically from google-services.json on Android, do not pass here
          offlineAccess: false,
          scopes: ['profile', 'email'],
        });
      } catch (e) {
        console.warn('Google Sign-in configure failed:', e);
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    resetLoginTimeline();
    markLoginTimeline("LOGIN_BUTTON_CLICK", { provider: "google" });
    if (!GoogleSignin) {
      Alert.alert('Lỗi', 'Google Sign-In không khả dụng trên thiết bị này.');
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

      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error('Google không trả về ID token. Kiểm tra cấu hình Web Client ID.');
      }

      const data = await loginWithGoogle(idToken);
      const profileCompleted = getProfileCompleted(data.user, Boolean(data.profile?.is_profile_completed ?? data.profile?.isProfileCompleted));
      setUser(data.user, profileCompleted);
      const pendingApproval = isPendingApproval(data.user, data.nextStep);
      const dashboardReady = isDashboardReady(data.user, data.nextStep);
      markLoginTimeline("NAVIGATE_HOME_START", {
        target: !profileCompleted
          ? "complete-profile"
          : pendingApproval || !dashboardReady
          ? "pending-approval"
          : "tabs",
      });
      router.replace(
        !profileCompleted
          ? '/(auth)/complete-profile'
          : pendingApproval || !dashboardReady
          ? '/(auth)/pending-approval'
          : '/(tabs)',
      );
      markLoginTimeline("NAVIGATE_HOME_DONE");
      finishLoginTimeline({ success: true, provider: "google" });
    } catch (error: any) {
      finishLoginTimeline({ success: false, provider: "google", message: String(error?.message || error) });
      const message = error?.code === 'NETWORK_TIMEOUT' || String(error?.message || '').includes('timed out')
        ? 'Máy chủ đang khởi động hoặc mạng chậm. Vui lòng bấm đăng nhập lại sau vài giây.'
        : error?.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.';
      Alert.alert('Đăng nhập thất bại', message);
      setLoading(false);
    }
  };

  const handleDevBypassLogin = async () => {
    resetLoginTimeline();
    markLoginTimeline("LOGIN_BUTTON_CLICK", { provider: "dev_bypass" });
    setLoading(true);
    try {
      const data = await loginWithGoogle("mock-owner-google-token");
      const profileCompleted = getProfileCompleted(data.user, Boolean(data.profile?.is_profile_completed ?? data.profile?.isProfileCompleted));
      setUser(data.user, profileCompleted);
      const pendingApproval = isPendingApproval(data.user, data.nextStep);
      const dashboardReady = isDashboardReady(data.user, data.nextStep);
      markLoginTimeline("NAVIGATE_HOME_START", {
        target: !profileCompleted
          ? "complete-profile"
          : pendingApproval || !dashboardReady
          ? "pending-approval"
          : "tabs",
      });
      router.replace(
        !profileCompleted
          ? '/(auth)/complete-profile'
          : pendingApproval || !dashboardReady
          ? '/(auth)/pending-approval'
          : '/(tabs)',
      );
      markLoginTimeline("NAVIGATE_HOME_DONE");
      finishLoginTimeline({ success: true, provider: "dev_bypass" });
    } catch (error: any) {
      finishLoginTimeline({ success: false, provider: "dev_bypass", message: String(error?.message || error) });
      Alert.alert('Đăng nhập thất bại', error?.message || 'Không thể đăng nhập bằng Google.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient glow orbs */}
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
            TrọCare <Text style={{ color: Colors.primary }}>Owner</Text>
          </Text>
          <Text style={styles.tagline}>Nền tảng quản lý phòng trọ thế hệ mới</Text>
        </View>

        {/* Features Bento Grid */}
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

        {/* Login Button */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={[styles.btnGoogle, loading && styles.btnDisabled]}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Image
                  source={require('@/assets/google.png')}
                  style={{ width: 20, height: 20, marginRight: 10 }}
                  resizeMode="contain"
                />
                <Text style={styles.btnGoogleText}>Tiếp tục với Google</Text>
              </>
            )}
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.btnBypass, loading && styles.btnDisabled]}
              onPress={handleDevBypassLogin}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Ionicons name="construct-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnBypassText}>Đăng nhập nhanh (Dev Bypass)</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.terms}>
            Bằng việc đăng nhập, bạn đồng ý với{' '}
            <Text style={styles.termsLink} onPress={() => openPolicyPage('/terms')}>Điều khoản sử dụng</Text> &{' '}
            <Text style={styles.termsLink} onPress={() => openPolicyPage('/privacy')}>Chính sách bảo mật</Text>
          </Text>
        </View>
      </View>
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
    borderColor: 'rgba(0, 113, 227, 0.15)',
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
  loginSection: {
    gap: 14,
  },
  btnGoogle: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 113, 227, 0.18)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnGoogleText: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
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
  btnBypass: {
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 113, 227, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryAlpha20,
  },
  btnBypassText: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
});
