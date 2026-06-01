/**
 * TrọCare Mobile — Main Tab Navigator
 * 5 tabs: Dashboard, Facilities, Invoices, Contracts, Settings
 * Premium bottom tab bar with icons matching web-admin sidebar navigation.
 */

import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Image, TouchableOpacity } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

export default function TabLayout() {
  const router = useRouter();

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
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 14,
          right: 14,
          backgroundColor: Colors.surface, // Pure white porcelain dock
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: 'rgba(0, 113, 227, 0.12)', // Glowing royal blue outline
          height: 64,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          paddingTop: 8,
          shadowColor: Colors.primary, // Ethereal blue shadow glow!
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          headerTitle: 'TrọCare',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Tài khoản',
          headerTitle: 'Cài đặt tài khoản',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
