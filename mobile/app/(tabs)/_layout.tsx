/**
 * TrọCare Mobile — Main Tab Navigator
 * 5 tabs: Dashboard, Facilities, Invoices, Contracts, Settings
 * Premium bottom tab bar with icons matching web-admin sidebar navigation.
 */

import { useCallback, useState } from 'react';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Image, TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet } from '@/lib/api';

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
};

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View style={[styles.tabIconShell, focused && styles.tabIconShellActive]}>
      <Ionicons name={name} size={focused ? 22 : 21} color={color} />
    </View>
  );
}

function HomeNotificationButton() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      apiGet<any>('/owner/notifications')
        .then((res) => setUnreadCount(Number(res?.unreadCount || 0)))
        .catch(() => setUnreadCount(0));
    }, []),
  );

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications' as any)}
      style={styles.headerNotificationButton}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel="Thông báo"
    >
      <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
      {unreadCount > 0 ? (
        <View style={styles.headerNotificationBadge}>
          <Text style={styles.headerNotificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.background, // Pristine alabaster snow background
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTitleStyle: {
          fontFamily: Typography.fontFamily.bold,
          fontSize: 18,
          letterSpacing: -0.3,
          color: Colors.textPrimary, // Rich charcoal text
        },
        headerLeft: () => (
          <Image
            source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-128.png')}
            style={{ width: 24, height: 24, marginLeft: 16 }}
            resizeMode="contain"
          />
        ),
        tabBarActiveTintColor: Colors.primary, // Brand royal blue
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamily.bold,
          fontSize: 9.5,
          letterSpacing: -0.1,
          marginTop: 0,
        },
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10,
          left: 10,
          right: 10,
          backgroundColor: Colors.surface, // Pure white porcelain dock
          borderRadius: 20,
          borderWidth: 1,
          borderColor: Colors.borderLight,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
          shadowColor: Colors.primary, // Ethereal blue shadow glow!
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 14,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          headerTitle: 'TrọCare',
          headerRight: () => <HomeNotificationButton />,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="facilities"
        options={{
          title: 'Phòng',
          headerTitle: 'Danh sách dãy trọ & phòng',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/facility/new')}
              style={{ width: 36, height: 36, marginRight: 16, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.72}
            >
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="business-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Thu/Chi',
          headerTitle: 'Sổ quỹ thu chi',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="receipt-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Báo cáo',
          headerTitle: 'Báo cáo quản lý',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="stats-chart-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Tài khoản',
          headerTitle: 'Cài đặt tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarItem: {
    paddingVertical: 0,
  },
  tabIconShell: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconShellActive: {
    backgroundColor: Colors.primaryAlpha20,
  },
  headerNotificationButton: {
    width: 40,
    height: 40,
    marginRight: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  headerNotificationBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },
});
