/**
 * TrọCare Mobile — Root Layout
 * Handles:
 * - Font loading (Inter from Google Fonts)
 * - Auth state hydration
 * - Auth-based routing: login → complete-profile → main tabs
 * - Auth event listener for 401/403 redirects
 */

import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
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
import { clearApiMemoryCache, setAuthEventListener } from '@/lib/api';
import { logPerfEvent, markAppStart } from '@/lib/telemetry/appPerformance';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import {
  consumeNotificationResponseOnce,
  getNotificationRoute,
  registerPushIfAlreadyAllowed,
} from '@/lib/pushNotifications';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();
markAppStart();

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
  const { isAuthenticated, isProfileCompleted, approvalStatus, onboardingStep, isHydrated, hydrate, logout } = useAuthStore();
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  const canEnterApp = isProfileCompleted && approvalStatus === 'ACTIVE' && onboardingStep === 'DONE';

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError) || fontWaitExpired;

  // Font loading is cosmetic and must never block authentication/navigation.
  // If the native font loader stalls on a specific Android build, continue
  // with the platform fallback and let the font finish loading later.
  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const fallback = setTimeout(() => {
      setFontWaitExpired(true);
      logPerfEvent('FONT_LOAD_FALLBACK', { timeoutMs: 1500 });
    }, 1500);
    return () => clearTimeout(fallback);
  }, [fontError, fontsLoaded]);

  // Hydrate auth state on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (previousState !== 'active' && nextState === 'active') {
        clearApiMemoryCache('app_foreground');
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !canEnterApp) return;
    registerPushIfAlreadyAllowed().catch((error) => {
      console.warn('Unable to refresh push token:', error?.message || error);
    });
  }, [isAuthenticated, canEnterApp]);

  useEffect(() => {
    let active = true;
    const openNotification = async (response: Notifications.NotificationResponse) => {
      const shouldOpen = await consumeNotificationResponseOnce(response).catch(() => false);
      if (!active || !shouldOpen) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      const route = getNotificationRoute(data);
      if (route) router.push(route as any);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void openNotification(response);
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void openNotification(response);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, [router]);

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

  // Hand off to a usable route on the first React commit. Auth and fonts hydrate
  // in the background; neither may hold a blocking app-level loading screen.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Hide immediately when local boot state is ready.
  useEffect(() => {
    if (fontsReady && isHydrated) {
      SplashScreen.hideAsync().catch(() => {});
      logPerfEvent("NAVIGATION_READY", { authenticated: isAuthenticated });
    }
  }, [fontsReady, isHydrated, isAuthenticated]);

  // Auth-based routing guard
  useEffect(() => {
    if (!fontsReady || !isHydrated) return;

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
  }, [isAuthenticated, isProfileCompleted, canEnterApp, segments, fontsReady, isHydrated, router]);

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
