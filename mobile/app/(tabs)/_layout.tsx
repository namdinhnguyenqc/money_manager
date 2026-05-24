/**
 * TrọCare Mobile — Main Tab Navigator
 * 5 tabs: Dashboard, Facilities, Invoices, Contracts, Settings
 * Premium bottom tab bar with icons matching web-admin sidebar navigation.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Image } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

export default function TabLayout() {
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
        tabBarActiveTintColor: Colors.primary, // Brand amethyst purple
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamily.medium,
          fontSize: 10,
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
          borderColor: 'rgba(138, 63, 252, 0.15)', // Glowing royal amethyst outline
          height: 66,
          paddingBottom: Platform.OS === 'ios' ? 10 : 12,
          paddingTop: 8,
          shadowColor: Colors.primary, // Ethereal amethyst shadow glow!
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'TrọCare Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="facilities"
        options={{
          title: 'Dãy trọ',
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
          title: 'Sổ quỹ',
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
          headerTitle: 'Báo cáo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>

  );
}
