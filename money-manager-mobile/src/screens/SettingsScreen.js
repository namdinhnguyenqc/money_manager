import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { getCurrentUser, logOut, subscribeToAuthChanges } from '../services/authService';
import { shouldUseApiData } from '../services/dataMode';
import { resetDatabase } from '../database/db';
import Logo from '../components/ui/Logo';

function SettingItem({ icon, iconBg = '#EFF6FF', iconColor = COLORS.primary, label, sub, onPress, danger = false, rightNode }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemLabel, danger && { color: COLORS.danger }]}>{label}</Text>
        {sub ? <Text style={styles.itemSub}>{sub}</Text> : null}
      </View>
      {rightNode || <Ionicons name="chevron-forward" size={15} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );
}

function SectionGroup({ title, children }) {
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.groupCard}>
        {React.Children.map(children, (child, i) => (
          <>
            {child}
            {i < React.Children.count(children) - 1 && <View style={styles.divider} />}
          </>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const isDesktopWeb = Platform.OS === 'web';
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => subscribeToAuthChanges((u) => setUser(u)), []);

  const handleCloudInfo = () => {
    if (!shouldUseApiData()) {
      Alert.alert('Chế độ Offline', 'Dữ liệu lưu trên thiết bị.\n\nĐăng nhập bằng Google để bật đồng bộ đám mây.', [{ text: 'OK' }]);
      return;
    }
    Alert.alert('Đồng bộ đám mây', `Đang đồng bộ với tài khoản:\n${user?.email || 'Không xác định'}\n\nDữ liệu được đồng bộ tự động mỗi khi bạn thực hiện thao tác.`, [{ text: 'OK' }]);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: async () => { await logOut(); } },
    ]);
  };

  const handleReset = () => {
    Alert.alert(
      'Xóa toàn bộ dữ liệu',
      'Thao tác này sẽ xóa sạch mọi phòng trọ, hóa đơn và giao dịch cục bộ. Bạn có chắc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa sạch',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              if (Platform.OS !== 'web') {
                Alert.alert('Thành công', 'Đã xóa toàn bộ dữ liệu cục bộ.');
                navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
              }
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa dữ liệu.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Mobile Header */}
      {!isDesktopWeb && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tài khoản & Cài đặt</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        {user && (
          <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <View style={styles.avatarWrap}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{(user.name || user.email || 'U')[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.avatarOnline} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>{user.name || 'Người dùng'}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{user.email || ''}</Text>
              <View style={styles.profileBadge}>
                <Ionicons name="cloud-done-outline" size={11} color={COLORS.secondary} />
                <Text style={styles.profileBadgeText}>Đã đồng bộ đám mây</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* Config Group */}
        <SectionGroup title="Cấu hình">
          <SettingItem
            icon="person-outline"
            label="Hồ sơ chủ trọ"
            sub="Thông tin cá nhân và liên hệ"
            onPress={() => navigation.navigate('Profile')}
          />
          <SettingItem
            icon="wallet-outline"
            label="Sổ tiền & Module"
            sub="Quản lý không gian làm việc"
            onPress={() => navigation.navigate('WalletsManager')}
          />
          <SettingItem
            icon="flash-outline"
            label="Bảng giá dịch vụ"
            sub="Điện, nước, phí cố định..."
            onPress={() => navigation.navigate('Services')}
          />
          <SettingItem
            icon="card-outline"
            label="Tài khoản ngân hàng"
            sub="QR nhận tiền và đối soát"
            onPress={() => navigation.navigate('BankConfig')}
          />
          <SettingItem
            icon="pricetag-outline"
            label="Danh mục thu/chi"
            sub="Quản lý nhãn giao dịch"
            onPress={() => navigation.navigate('Categories')}
          />
        </SectionGroup>

        {/* Data Group */}
        <SectionGroup title="Dữ liệu & Đồng bộ">
          <SettingItem
            icon={shouldUseApiData() ? 'cloud-done-outline' : 'cloud-offline-outline'}
            iconBg={shouldUseApiData() ? '#E8F8F4' : '#F1F5F9'}
            iconColor={shouldUseApiData() ? COLORS.secondary : COLORS.textMuted}
            label={shouldUseApiData() ? 'Đồng bộ đám mây: Bật' : 'Chế độ Offline'}
            sub={shouldUseApiData() ? `Tài khoản: ${user?.email || ''}` : 'Dữ liệu lưu trên thiết bị'}
            onPress={handleCloudInfo}
            rightNode={<Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />}
          />
        </SectionGroup>

        {/* Danger Zone */}
        <SectionGroup title="Khu vực nguy hiểm">
          <SettingItem
            icon="log-out-outline"
            iconBg="#FFF0F0"
            label="Đăng xuất"
            danger
            onPress={handleLogout}
          />
          <SettingItem
            icon="trash-outline"
            iconBg="#FFF0F0"
            label="Xóa sạch dữ liệu cục bộ"
            sub="Không thể hoàn tác"
            danger
            onPress={handleReset}
          />
        </SectionGroup>

        {/* Footer */}
        <View style={styles.footer}>
          <Logo size="sm" showText={false} />
          <Text style={styles.footerText}>TrọCare · Phiên bản 1.0.0</Text>
          <Text style={styles.footerSub}>Bản quyền 2026 TrọCare</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F8FF' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: 22, color: COLORS.textPrimary, ...FONTS.bold },

  scroll: { padding: 16, paddingBottom: 60, gap: 6 },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.sm,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primaryLight },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, color: COLORS.primary, ...FONTS.bold },
  avatarOnline: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  profileEmail: { fontSize: 12, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  profileBadgeText: { fontSize: 11, color: COLORS.secondary, ...FONTS.bold },

  // Group
  group: { marginBottom: 16 },
  groupTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.bold,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  divider: { height: 1, backgroundColor: COLORS.borderSoft, marginLeft: 56 },

  // Items
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.semibold },
  itemSub: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 24,
    paddingBottom: 8,
  },
  footerText: { fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
  footerSub: { fontSize: 11, color: COLORS.borderStrong, ...FONTS.medium },
});
