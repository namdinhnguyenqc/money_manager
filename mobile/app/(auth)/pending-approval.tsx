import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

export default function PendingApprovalScreen() {
  const { user, logout, hydrate } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-256.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.iconBadge}>
          <Ionicons name="time-outline" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Hồ sơ đang chờ duyệt</Text>
        <Text style={styles.description}>
          Tài khoản {user?.email || 'của bạn'} đã gửi hồ sơ chủ trọ. Admin cần duyệt trước khi bạn vào dashboard và dùng các tính năng vận hành.
        </Text>
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
          <Text style={styles.noticeText}>Sau khi được duyệt, mở lại app hoặc bấm kiểm tra trạng thái.</Text>
        </View>
        <Button title="Kiểm tra trạng thái" onPress={hydrate} variant="primary" fullWidth style={styles.button} />
        <Button title="Đăng xuất" onPress={() => logout()} variant="ghost" fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: 'center' },
  card: { borderRadius: 24, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, padding: 24, alignItems: 'center' },
  logoWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  logo: { width: 38, height: 38 },
  iconBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 22, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, textAlign: 'center', letterSpacing: 0 },
  description: { marginTop: 10, fontSize: 14, lineHeight: 21, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, textAlign: 'center' },
  notice: { marginTop: 18, flexDirection: 'row', gap: 8, borderRadius: 14, padding: 12, backgroundColor: Colors.successLight },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  button: { marginTop: 22, marginBottom: 6 },
});
