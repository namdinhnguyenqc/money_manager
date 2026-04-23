import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY, WEB } from '../theme';
import { login, signUp } from '../services/authService';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? WEB.contentMax.xl : width >= 1024 ? WEB.contentMax.lg : WEB.contentMax.md;

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signUp(email, password);
        Alert.alert('Thành công', 'Đã tạo tài khoản mới');
      }
    } catch (error) {
      console.error(error);
      let msg = error?.message || 'Đã xảy ra lỗi';
      if (error?.status === 401) msg = 'Email hoặc mật khẩu không đúng';
      if (error?.status === 400 && /already registered|already exists/i.test(error?.message || '')) {
        msg = 'Email này đã được sử dụng';
      }
      Alert.alert('Thất bại', msg);
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      <Text style={styles.formTitle}>{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>
      <Text style={styles.formSub}>
        {isLogin
          ? 'Vào hệ thống để quản lý phòng, hóa đơn và giao dịch.'
          : 'Tạo tài khoản để đồng bộ dữ liệu và dùng trên website.'}
      </Text>

      <View style={styles.group}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.mainBtn} onPress={handleAuth} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{isLogin ? 'Vào trang chủ' : 'Đăng ký ngay'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchBtn}>
        <Text style={styles.switchText}>
          {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <LinearGradient colors={['#eef3ff', '#dbe7ff', '#eef3ff']} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.keyboard, isDesktopWeb && styles.keyboardWeb]}>
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
                <Text style={styles.subtitle}>Đăng nhập để đồng bộ dữ liệu lên đám mây</Text>
              </View>

              <SurfaceCard style={styles.form}>
                {formContent}
              </SurfaceCard>

              <Text style={styles.footer}>Bản quyền 2026 Money Manager Pro</Text>
            </>
          )}
        </View>
        {isDesktopWeb ? <Text style={styles.footerWeb}>Bản quyền 2026 Money Manager Pro</Text> : null}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  keyboard: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  keyboardWeb: { paddingHorizontal: 28, paddingVertical: 28 },
  shell: { width: '100%', alignSelf: 'center' },
  shellWeb: { flexDirection: 'row', alignItems: 'stretch', gap: 24 },
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
  featureEyebrow: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  featureTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  featureText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, ...FONTS.medium },
  brandFooter: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderStrong,
  },
  brandFooterLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
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
  group: { marginBottom: 14 },
  label: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold, marginBottom: 6 },
  inputWrap: {
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, color: COLORS.textPrimary, ...FONTS.semibold },
  mainBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },
  mainBtnText: { color: '#fff', ...FONTS.bold, fontSize: 15 },
  switchBtn: { alignItems: 'center', marginTop: 14 },
  switchText: { color: COLORS.primary, ...FONTS.semibold },
  footer: { marginTop: 20, textAlign: 'center', color: COLORS.textMuted, fontSize: 11, ...FONTS.medium },
  footerWeb: {
    marginTop: 18,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    ...FONTS.medium,
  },
});
