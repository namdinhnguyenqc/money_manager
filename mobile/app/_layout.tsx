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
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { setAuthEventListener } from '@/lib/api';
import Colors from '@/constants/Colors';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isProfileCompleted, approvalStatus, isLoading, isHydrated, hydrate, logout } = useAuthStore();
  const isPendingApproval = isProfileCompleted && approvalStatus === 'PENDING_APPROVAL';

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
    } else if (isAuthenticated && isPendingApproval && segs[1] !== 'pending-approval') {
      router.replace('/(auth)/pending-approval');
    } else if (isAuthenticated && isProfileCompleted && !isPendingApproval && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isProfileCompleted, isPendingApproval, segments, fontsLoaded, isHydrated, router]);

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
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
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
});
