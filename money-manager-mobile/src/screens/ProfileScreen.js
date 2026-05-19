import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import SurfaceCard from '../components/ui/SurfaceCard';
import TopAppBar from '../components/ui/TopAppBar';
import { getMyProfile } from '../services/profileService';

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text>
    </View>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <SurfaceCard tone="lowest" style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </SurfaceCard>
  );
}

export default function ProfileScreen({ navigation }) {
  const isDesktopWeb = Platform.OS === 'web';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const profile = await getMyProfile();
      setData(profile);
    } catch (err) {
      setError(err?.message || 'Không tải được hồ sơ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) load({ refresh: true });
    }, [load, loading])
  );

  const user = data?.user || {};
  const profile = data?.profile || {};
  const displayName = profile.fullName || user.name || 'Chủ trọ';
  const avatarUrl = profile.avatarUrl || user.avatarUrl;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surfacePage} />
      {!isDesktopWeb ? (
        <TopAppBar
          title="Hồ sơ cá nhân"
          subtitle={user.email || 'Thông tin tài khoản'}
          onBack={() => navigation.goBack()}
          rightIcon="create-outline"
          onRightPress={() => navigation.navigate('CompleteProfile', { mode: 'edit' })}
          light
        />
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>Đang tải hồ sơ...</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={24} color={COLORS.danger} />
          </View>
          <Text style={styles.errorTitle}>Không tải được hồ sơ</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => load()}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.primaryTxt}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />}
        >
          <SurfaceCard tone="lowest" style={styles.identityCard}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={48} color={COLORS.primary} />
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{user.email || 'Chưa có email'}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.primaryDark} />
                  <Text style={styles.badgeText}>{user.role || 'USER'}</Text>
                </View>
                <View style={[styles.badge, data?.user?.isProfileCompleted ? styles.badgeDone : styles.badgeWarning]}>
                  <Ionicons
                    name={data?.user?.isProfileCompleted ? 'checkmark-circle-outline' : 'time-outline'}
                    size={13}
                    color={data?.user?.isProfileCompleted ? COLORS.success : COLORS.warning}
                  />
                  <Text style={[styles.badgeText, data?.user?.isProfileCompleted ? styles.badgeDoneText : styles.badgeWarningText]}>
                    {data?.user?.isProfileCompleted ? 'Đã hoàn tất' : 'Cần bổ sung'}
                  </Text>
                </View>
              </View>
            </View>
          </SurfaceCard>

          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('CompleteProfile', { mode: 'edit' })}>
            <Ionicons name="create-outline" size={17} color="#fff" />
            <Text style={styles.editTxt}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>

          <SectionCard icon="person-outline" title="Thông tin tài khoản">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Role" value={user.role} />
            <InfoRow label="Đăng nhập bằng" value={user.authProvider || 'google'} />
          </SectionCard>

          <SectionCard icon="call-outline" title="Thông tin liên hệ">
            <InfoRow label="Họ tên" value={profile.fullName || user.name} />
            <InfoRow label="Số điện thoại" value={profile.phone} />
          </SectionCard>

          <SectionCard icon="location-outline" title="Địa chỉ">
            <InfoRow label="Tỉnh / Thành phố" value={profile.provinceName} />
            <InfoRow label="Quận / Huyện" value={profile.districtName} />
            <InfoRow label="Địa chỉ chi tiết" value={profile.addressLine} />
            <InfoRow label="Địa chỉ đầy đủ" value={profile.fullAddress} />
          </SectionCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  content: { padding: 16, paddingBottom: 42 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 12, color: COLORS.textMuted, fontSize: 13, ...FONTS.medium },
  errorIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5f5', marginBottom: 14 },
  errorTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  errorText: { marginTop: 8, textAlign: 'center', color: COLORS.danger, fontSize: 13, lineHeight: 19, ...FONTS.medium },
  primaryBtn: { marginTop: 18, height: 42, paddingHorizontal: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, ...SHADOW.sm },
  primaryTxt: { color: '#fff', fontSize: 13, ...FONTS.bold },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 24, padding: 16, ...SHADOW.sm },
  avatar: { width: 72, height: 72, borderRadius: 18, backgroundColor: COLORS.primaryContainer, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 72, height: 72 },
  identityText: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, color: COLORS.textPrimary, ...FONTS.black },
  email: { marginTop: 4, fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { minHeight: 28, borderRadius: 999, paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row', gap: 5, backgroundColor: COLORS.primaryContainer },
  badgeDone: { backgroundColor: '#e8f8ef' },
  badgeWarning: { backgroundColor: '#fff4df' },
  badgeText: { color: COLORS.primaryDark, fontSize: 11, ...FONTS.bold },
  badgeDoneText: { color: COLORS.success },
  badgeWarningText: { color: COLORS.warning },
  editBtn: { marginTop: 14, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...SHADOW.sm },
  editTxt: { color: '#fff', fontSize: 14, ...FONTS.bold },
  sectionCard: { marginTop: 14, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 20, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 },
  sectionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryContainer },
  sectionTitle: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  infoRow: { minHeight: 46, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  infoLabel: { width: 126, color: COLORS.textMuted, fontSize: 12, ...TYPOGRAPHY.caption },
  infoValue: { flex: 1, color: COLORS.textPrimary, fontSize: 13, lineHeight: 19, textAlign: 'right', ...FONTS.semibold },
});
