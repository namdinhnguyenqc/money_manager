/**
 * TrọCare Tenant Mobile — Main Tab Navigator
 * 5 tabs: Dashboard, Invoices, Finance, Notifications, Profile
 */

import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Image, TouchableOpacity, View, Text } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet } from '@/lib/api';

// Shared brand logo component for all tab headers
function HeaderBrandLogo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 16 }}>
      <Image
        source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-128.png')}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
      <Image
        source={require('@/assets/brand/transparent/trocare-wordmark-transparent-1600.png')}
        style={{ width: 80, height: 20 }}
        resizeMode="contain"
      />
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await apiGet<any>('/tenant/notifications');
      const list = res?.data ?? res ?? [];
      const count = list.filter((n: any) => !n.is_read).length;
      setUnreadCount(count);
    } catch (err) {
      console.warn('Error fetching unread notifications count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

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
            style={{ width: 24, height: 24, marginLeft: 16 }}
            resizeMode="contain"
          />
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            style={{ marginRight: 16, padding: 4 }}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  right: -4,
                  top: -4,
                  backgroundColor: Colors.danger,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: Colors.background,
                  paddingHorizontal: 2,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 8.5, fontFamily: Typography.fontFamily.bold, textAlign: 'center' }}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
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
          // Dashboard tab: show TrọCare wordmark as the header title
          headerLeft: () => <HeaderBrandLogo />,
          headerTitle: '',
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
          href: null, // Hide tab from bottom bar
          title: 'Thông báo',
          headerTitle: 'Thông báo của tôi',
          headerRight: () => null, // Hide notification bell icon in notification screen
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
