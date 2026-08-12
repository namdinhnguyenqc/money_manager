/**
 * TrọCare Mobile — Main Tab Navigator
 * 5 tabs: Dashboard, Facilities, Invoices, Contracts, Settings
 * Premium bottom tab bar with icons matching web-admin sidebar navigation.
 */

import { useCallback, useRef, useState } from 'react';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Image, TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet } from '@/lib/api';
import { logPerfEvent, markScreenFocus } from '@/lib/telemetry/appPerformance';

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

function getTabNameFromTarget(target?: string | null) {
  const value = String(target || "unknown");
  if (value.startsWith("index")) return "home";
  if (value.startsWith("facilities")) return "facilities";
  if (value.startsWith("invoices")) return "invoices";
  if (value.startsWith("transactions")) return "transactions";
  if (value.startsWith("contracts")) return "contracts";
  if (value.startsWith("reports")) return "reports";
  if (value.startsWith("settings")) return "settings";
  return value;
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
  const lastTabPressAt = useRef<number | null>(null);

  return (
    <Tabs
      screenListeners={{
        tabPress: (event) => {
          lastTabPressAt.current = Date.now();
          logPerfEvent("TAB_SWITCH_START", { target: event.target || null });
        },
        focus: (event) => {
          const durationMs = lastTabPressAt.current ? Date.now() - lastTabPressAt.current : undefined;
          const tabName = getTabNameFromTarget(event.target);
          logPerfEvent("TAB_SWITCH_DONE", { target: event.target || null, tab: tabName, ...(durationMs !== undefined ? { durationMs } : {}) });
          markScreenFocus(tabName);
          lastTabPressAt.current = null;
        },
      }}
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
            onLoadStart={() => logPerfEvent("IMAGE_LOAD_START", { image: "tab_header_logo" })}
            onLoadEnd={() => logPerfEvent("IMAGE_LOAD_DONE", { image: "tab_header_logo" })}
          />
        ),
        tabBarActiveTintColor: Colors.primary, // Brand royal blue
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamily.semibold,
          fontSize: 10,
          lineHeight: 14,
          letterSpacing: 0,
          marginTop: 2,
        },
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#DDE3EA',
          height: 64 + Math.max(insets.bottom, Platform.OS === 'ios' ? 6 : 10),
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 6 : 10),
          paddingTop: 7,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 6,
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
          headerTitle: 'Phòng',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/facility/new')}
              accessibilityRole="button"
              accessibilityLabel="Thêm dãy trọ"
              style={{ width: 44, height: 44, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}
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
          headerTitle: 'Thu/Chi',
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
          headerTitle: 'Báo cáo',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="stats-chart-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Tài khoản',
          headerTitle: 'Tài khoản',
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
    width: 44,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconShellActive: {
    backgroundColor: '#EAF3FF',
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
