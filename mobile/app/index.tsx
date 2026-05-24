import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';

export default function IndexRoute() {
  const { isAuthenticated, isProfileCompleted, isHydrated } = useAuthStore();

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

  return <Redirect href={isProfileCompleted ? '/(tabs)' : '/(auth)/complete-profile'} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
