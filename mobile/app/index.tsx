import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';

export default function IndexRoute() {
  const { isAuthenticated, isProfileCompleted, approvalStatus, onboardingStep, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isProfileCompleted) return <Redirect href="/(auth)/complete-profile" />;
  if (approvalStatus !== 'ACTIVE' || onboardingStep !== 'DONE') return <Redirect href="/(auth)/pending-approval" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
