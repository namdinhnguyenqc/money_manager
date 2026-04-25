import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW, WEB } from '../theme';
import { signInWithGoogle, login, initAuth, logOut } from '../services/authService';
import { useNavigation } from '@react-navigation/native';
import { isApiDataEnabled, shouldUseApiData } from '../services/dataMode';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function LoginScreen({ navigation }) {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('google');
  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? WEB.contentMax.xl : width >= 1024 ? WEB.contentMax.lg : WEB.contentMax.md;

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    if (shouldUseApiData()) {
      navigation.replace('HomeTabs');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // navigate to home screen (best effort, adapt route name if needed)
      try { nav.reset({ index: 0, routes: [{ name: 'Home' }] }); } catch {}
    } catch (err) {
      const message = err?.message || err?.code || 'Đã xảy ra lỗi';
      
      if (message.includes('hủy') || message.includes('cancelled') || message.includes('CANCELLED')) {
        // User cancelled, do nothing
        return;
      }
      
      if (message.includes('network') || message.includes('NETWORK_ERROR')) {
        setError('Không có kết nối mạng. Vui lòng thử lại.');
      } else if (message.includes('blocked') || message.includes('BLOCKED')) {
        setError('Tài khoản của bạn đã bị khóa. Liên hệ: admin@moneymanager.app');
      } else if (message.includes('invalid') || message.includes('TOKEN')) {
        setError('Xác thực thất bại. Vui lòng thử lại.');
      } else if (message.includes('400') || message.includes('401')) {
        setError('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (message.includes('500') || message.includes('backend') || message.includes('server')) {
        setError('Hệ thống đang bận. Vui lòng thử lại sau.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLocalMode = () => {
    // Skip auth, go directly to Home
    try { nav.reset({ index: 0, routes: [{ name: 'Home' }] }); } catch {}
  };

  const formContent = (
    <>
      <Text style={styles.formTitle}>Đăng nhập</Text>
      <Text style={styles.formSub}>
        {isApiDataEnabled()
          ? 'Đăng nhập để đồng bộ dữ liệu lên đám mây.'
          : 'Vào hệ thống để quản lý phòng, hóa đơn và giao dịch.'}
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isApiDataEnabled() && (
        <>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <View style={styles.googleBtnContent}>
                <Text style={styles.googleBtnText}>Tiếp tục với Gmail</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.mainBtn}
        onPress={handleLocalMode}
        disabled={loading}
      >
        <Text style={styles.mainBtnText}>
          {isApiDataEnabled() ? 'Dùng không đăng nhập' : 'Vào trang chủ'}
        </Text>
      </TouchableOpacity>

      {isApiDataEnabled() && (
        <TouchableOpacity onPress={() => navigation.push('HomeTabs')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Bỏ qua lần này</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <LinearGradient colors={['#eef3ff', '#dbe7ff', '#eef3ff']} style={styles.root}>
      <View style={[styles.shell, isDesktopWeb && styles.shellWeb, { maxWidth: isDesktopWeb ? Math.min(contentMaxWidth, 1160) : 420 }]}>
        {isDesktopWeb ? (
          <>
            <View style={styles.brandPanel}>
              <View style={styles.brandHero}>
                <View style={styles.logo}>
                  <Ionicons name="wallet-outline" size={38} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>Money Manager Pro</Text>
                <Text style={styles.subtitle}>Không gian vận hành tài chính cá nhân, nhà trọ và kinh doanh trên website.</Text>
              </View>

              <View style={styles.featureStack}>
                <SurfaceCard tone="lowest" style={styles.featureCard}>
                  <Text style={styles.featureEyebrow}>VẬN HÀNH NHÀ TRỌ</Text>
                  <Text style={styles.featureTitle}>Hóa đơn theo tháng</Text>
                  <Text style={styles.featureText}>Theo dõi phòng chưa lập hóa đơn, chờ thu và đã thu trên cùng một màn hình máy tính.</Text>
                </SurfaceCard>
                <SurfaceCard tone="lowest" style={styles.featureCard}>
                  <Text style={styles.featureEyebrow}>VẬN HÀNH TÀI CHÍNH</Text>
                  <Text style={styles.featureTitle}>Đồng bộ giao dịch</Text>
                  <Text style={styles.featureText}>Tập trung dữ liệu thu/chi, sổ tiền và cấu hình ngân hàng để đối soát.</Text>
                </SurfaceCard>
              </View>

              <View style={styles.brandFooter}>
                <Text style={styles.brandFooterLabel}>Không gian đám mây</Text>
                <Text style={styles.brandFooterValue}>1 tài khoản, nhiều module vận hành</Text>
              </View>
            </View>

            <SurfaceCard tone="lowest" style={[styles.form, styles.formWeb]}>
              {formContent}
            </SurfaceCard>
          </>
        ) : (
          <>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons name="wallet-outline" size={38} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Money Manager Pro</Text>
              <Text style={styles.subtitle}>
                {isApiDataEnabled()
                  ? 'Quản lý tài chính thông minh'
                  : 'Đăng nhập để đồng bộ dữ liệu'}
              </Text>
            </View>

            <SurfaceCard style={styles.form}>
              {formContent}
            </SurfaceCard>

            <Text style={styles.footer}>Bản quyền 2026 Money Manager Pro</Text>
          </>
        )}
      </View>
      {isDesktopWeb ? <Text style={styles.footerWeb}>Bản quyền 2026 Money Manager Pro</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shell: { width: '100%', alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  shellWeb: { flexDirection: 'row', alignItems: 'stretch', gap: 24, paddingHorizontal: 28, paddingVertical: 28 },
  brand: { alignItems: 'center', marginBottom: 20 },
  brandPanel: {
    flex: 1.08,
    borderRadius: 32,
    padding: 28,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    ...SHADOW.md,
  },
  brandHero: { maxWidth: 460 },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: COLORS.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  title: { marginTop: 10, color: COLORS.textPrimary, fontSize: 24, ...FONTS.black },
  subtitle: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, ...FONTS.medium },
  featureStack: { marginTop: 24, gap: 14 },
  featureCard: {
    minHeight: 136,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  featureEyebrow: { ...FONTS.label, color: COLORS.textMuted },
  featureTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  featureText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, ...FONTS.medium },
  brandFooter: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderStrong,
  },
  brandFooterLabel: { ...FONTS.label, color: COLORS.textMuted },
  brandFooterValue: { marginTop: 6, color: COLORS.textPrimary, fontSize: 15, ...FONTS.bold },
  form: { borderRadius: 28, padding: 22 },
  formWeb: {
    width: 430,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  formTitle: { color: COLORS.textPrimary, fontSize: 22, ...FONTS.bold, marginBottom: 8, textAlign: 'center' },
  formSub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, ...FONTS.medium, textAlign: 'center', marginBottom: 18 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, ...FONTS.medium },
  googleBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleBtnText: { color: COLORS.textPrimary, ...FONTS.bold, fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderSoft },
  dividerText: { paddingHorizontal: 12, color: COLORS.textMuted, ...FONTS.medium, fontSize: 12 },
  mainBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },
  mainBtnText: { color: '#fff', ...FONTS.bold, fontSize: 15 },
  skipBtn: { alignItems: 'center', marginTop: 14 },
  skipText: { color: COLORS.textMuted, ...FONTS.semibold, fontSize: 13 },
  footer: { marginTop: 20, textAlign: 'center', color: COLORS.textMuted, fontSize: 11, ...FONTS.medium },
  footerWeb: {
    marginTop: 18,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    ...FONTS.medium,
  },
});
