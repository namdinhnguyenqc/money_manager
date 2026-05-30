/**
 * TrọCare Tenant Mobile — Main Tab Navigator
 * 5 tabs: Dashboard, Invoices, Finance, Notifications, Profile
 */

import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Image, TouchableOpacity, View } from 'react-native';
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
          fontSize: 17,
          letterSpacing: -0.3,
          color: Colors.textPrimary, // Rich charcoal text
        },
        headerLeft: () => (
          <Image
            source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-128.png')}
            style={{ width: 22, height: 22, marginLeft: 16 }}
            resizeMode="contain"
          />
        ),
        tabBarActiveTintColor: Colors.primary,
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
          borderColor: 'rgba(0, 113, 227, 0.15)', // Glowing brand blue outline
          height: 66,
          paddingBottom: Platform.OS === 'ios' ? 10 : 12,
          paddingTop: 8,
          shadowColor: Colors.primary,
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
          title: 'Dashboard',
          headerTitle: 'Bảng điều khiển',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Hóa đơn',
          headerTitle: 'Lịch sử hóa đơn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Thu chi',
          headerTitle: 'Sổ chi tiêu cá nhân',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          headerTitle: 'Thông báo của tôi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          headerTitle: 'Hồ sơ khách thuê trọ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
