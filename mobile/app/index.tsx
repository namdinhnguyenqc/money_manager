import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function IndexRoute() {
  const { isAuthenticated, isProfileCompleted, approvalStatus, onboardingStep, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isProfileCompleted) return <Redirect href="/(auth)/complete-profile" />;
  if (approvalStatus !== 'ACTIVE' || onboardingStep !== 'DONE') return <Redirect href="/(auth)/pending-approval" />;
  return <Redirect href="/(tabs)" />;
}
