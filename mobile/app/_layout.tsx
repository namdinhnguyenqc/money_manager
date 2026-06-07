/**
 * TrọCare Mobile — Root Layout
 * Handles:
 * - Font loading (Inter from Google Fonts)
 * - Auth state hydration
 * - Auth-based routing: login → complete-profile → main tabs
 * - Auth event listener for 401/403 redirects
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { setAuthEventListener } from '@/lib/api';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function AppStackHeader({ navigation, options, back }: NativeStackHeaderProps) {
  const title = typeof options.title === 'string' ? options.title : '';
  const headerLeft = options.headerLeft?.({
    canGoBack: Boolean(back),
    tintColor: Colors.textPrimary,
  });
  const headerRight = options.headerRight?.({
    canGoBack: Boolean(back),
    tintColor: Colors.textPrimary,
  });

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {headerLeft ?? (back ? (
            <TouchableOpacity
              onPress={navigation.goBack}
              hitSlop={12}
              style={styles.headerBackButton}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
            </TouchableOpacity>
          ) : null)}
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={[styles.headerSide, styles.headerRight]}>{headerRight}</View>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isProfileCompleted, approvalStatus, onboardingStep, isLoading, isHydrated, hydrate, logout } = useAuthStore();
  const canEnterApp = isProfileCompleted && approvalStatus === 'ACTIVE' && onboardingStep === 'DONE';

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Hydrate auth state on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Set up auth event listener for 401/403
  useEffect(() => {
    setAuthEventListener((event) => {
      if (event === 'logout') {
        logout();
        router.replace('/(auth)/login');
      } else if (event === 'profile_required') {
        router.replace('/(auth)/complete-profile');
      } else if (event === 'pending_approval') {
        router.replace('/(auth)/pending-approval');
      }
    });
  }, [router, logout]);

  // Hide splash screen when ready
  useEffect(() => {
    if (fontsLoaded && isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isHydrated]);

  // Auth-based routing guard
  useEffect(() => {
    if (!fontsLoaded || !isHydrated) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !isProfileCompleted && segs[1] !== 'complete-profile') {
      router.replace('/(auth)/complete-profile');
    } else if (isAuthenticated && isProfileCompleted && !canEnterApp && segs[1] !== 'pending-approval') {
      router.replace('/(auth)/pending-approval');
    } else if (isAuthenticated && canEnterApp && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isProfileCompleted, canEnterApp, segments, fontsLoaded, isHydrated, router]);

  // Show loading while fonts/auth hydrating
  if (!fontsLoaded || !isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', header: AppStackHeader }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerSide: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  headerBackButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
});
