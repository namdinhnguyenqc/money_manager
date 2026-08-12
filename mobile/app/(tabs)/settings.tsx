import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { useAuthStore } from '@/store/authStore';
import { loadProfile, type OwnerProfile } from '@/lib/profile';

type RoutePath = Parameters<ReturnType<typeof useRouter>['push']>[0];

const sections: Array<{
  title: string;
  items: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    detail?: string;
    route?: RoutePath;
    tone?: 'default' | 'success' | 'warning' | 'danger';
    action?: 'logout';
  }>;
}> = [
  {
    title: 'Vận hành phòng trọ',
    items: [
      { icon: 'people-outline', label: 'Khách thuê', detail: 'Hồ sơ, liên hệ, tình trạng thuê', route: '/tenants' as any },
      { icon: 'receipt-outline', label: 'Hóa đơn', detail: 'Danh sách hóa đơn và thanh toán', route: '/invoices' as any },
      { icon: 'copy-outline', label: 'Lập hóa đơn hàng loạt', detail: 'Tạo nhanh theo kỳ thu tiền', route: '/invoice/bulk' as any },
      { icon: 'list-outline', label: 'Bảng giá dịch vụ', detail: 'Điện, nước, rác, wifi và phụ phí', route: '/services' as any },
      { icon: 'cash-outline', label: 'Tiền cọc giữ phòng', detail: 'Nhận cọc, hoàn cọc, chuyển hợp đồng', route: '/deposit' as any, tone: 'success' },
    ],
  },
  {
    title: 'Thanh toán và đối soát',
    items: [
      { icon: 'wallet-outline', label: 'Ví và tài khoản', detail: 'Nguồn tiền, số dư, giao dịch', route: '/wallets' as any },
      { icon: 'trending-up-outline', label: 'Kinh doanh hàng hóa', detail: 'Thu bán thêm dịch vụ, vật tư', route: '/trading' as any },
    ],
  },
  {
    title: 'Tài khoản',
    items: [
      { icon: 'notifications-outline', label: 'Cài đặt thông báo', detail: 'Nhận tiền, thanh toán và thông báo đẩy', route: '/notifications/settings' as any },
      { icon: 'help-circle-outline', label: 'Báo cáo lỗi / Góp ý', detail: 'Gửi góp ý và báo lỗi hệ thống', route: '/feedback' as any },
      { icon: 'log-out-outline', label: 'Đăng xuất', detail: 'Thoát khỏi tài khoản hiện tại', action: 'logout', tone: 'danger' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const nextProfile = await loadProfile();
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleItemPress = (item: (typeof sections)[number]['items'][number]) => {
    if (item.route) {
      router.push(item.route);
      return;
    }
    if (item.action === 'logout') {
      handleLogout();
    }
  };

  const displayName = profile?.fullName || user?.email || 'Chủ trọ';
  const displayPhone = profile?.phone || 'Chưa cập nhật số điện thoại';
  const completionText = profile?.isProfileCompleted || profile?.is_profile_completed ? 'Hồ sơ đã hoàn tất' : 'Cần cập nhật hồ sơ';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.profilePanel}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={23} color={Colors.textWhite} />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.profileMeta} numberOfLines={1}>{user?.email || displayPhone}</Text>
          <View style={styles.profileStatus}>
            <View style={[styles.statusDot, profile?.isProfileCompleted || profile?.is_profile_completed ? styles.statusDotOk : styles.statusDotWarn]} />
            <Text style={styles.statusText}>{completionText}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/profile' as any)}>
          <Ionicons name="create-outline" size={17} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickGrid}>
        <QuickAction icon="person-outline" label="Hồ sơ" onPress={() => router.push('/profile' as any)} />
        <QuickAction icon="cash-outline" label="Nhận cọc" onPress={() => router.push('/deposit/new' as any)} />
        <QuickAction icon="wallet-outline" label="Ví" onPress={() => router.push('/wallets' as any)} />
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuGroup}>
            {section.items.map((item, index) => (
              <React.Fragment key={item.label}>
                <SettingsItem item={item} onPress={() => handleItemPress(item)} />
                {index < section.items.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.72}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function SettingsItem({
  item,
  onPress,
}: {
  item: (typeof sections)[number]['items'][number];
  onPress: () => void;
}) {
  const toneColor = item.tone === 'danger'
    ? Colors.danger
    : item.tone === 'success'
      ? Colors.success
      : item.tone === 'warning'
        ? Colors.warning
        : Colors.primary;

  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.menuIcon, { backgroundColor: `${toneColor}14` }]}>
        <Ionicons name={item.icon} size={18} color={toneColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, item.tone === 'danger' && styles.dangerText]} numberOfLines={1}>
          {item.label}
        </Text>
        {item.detail ? <Text style={styles.menuDetail} numberOfLines={1}>{item.detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 104,
    gap: 18,
  },
  profilePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  profileMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  profileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotOk: {
    backgroundColor: Colors.success,
  },
  statusDotWarn: {
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    minHeight: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    paddingHorizontal: 2,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  menuGroup: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  menuDetail: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
  },
  dangerText: {
    color: Colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 60,
  },
});
