import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { getCurrentUser, logOut, subscribeToAuthChanges } from '../services/authService';
import { migrateSQLiteToFirestore } from '../utils/migrateToCloud';
import { resetDatabase } from '../database/db';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function SettingsScreen({ navigation }) {
  const isDesktopWeb = Platform.OS === 'web';
  const [migrating, setMigrating] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => subscribeToAuthChanges((u) => setUser(u)), []);

  const handleCloudSync = () => {
    Alert.alert('Đồng bộ cũ', 'Đẩy dữ liệu SQLite local lên Firebase cũ?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng bộ',
        onPress: async () => {
          setMigrating(true);
          try {
            setSyncStatus('Đang bắt đầu...');
            await migrateSQLiteToFirestore((msg) => setSyncStatus(msg));
            Alert.alert('Hoàn tất', 'Đồng bộ dữ liệu cũ thành công');
          } catch (e) {
            Alert.alert('Đồng bộ thất bại', e?.message || 'Lỗi không xác định');
          } finally {
            setMigrating(false);
            setSyncStatus('');
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logOut();
        },
      },
    ]);
  };
  const handleReset = () => {
    Alert.alert(
      'Xóa toàn bộ dữ liệu',
      'Thao tác này sẽ xóa sạch mọi phòng trọ, hóa đơn và giao dịch. Bạn có chắc chắn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa sạch', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await resetDatabase();
              if (Platform.OS !== 'web') {
                Alert.alert('Thành công', 'Đã xóa toàn bộ dữ liệu.');
                navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
              }
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể xóa dữ liệu.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      {!isDesktopWeb ? (
        <TopAppBar
          title="Cài đặt"
          subtitle={user?.email || 'Chưa đăng nhập'}
          onBack={() => navigation.goBack()}
          rightIcon="log-out-outline"
          onRightPress={handleLogout}
          light
        />
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Dữ liệu</Text>
        <SurfaceCard tone="lowest" style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Đồng bộ Firebase cũ</Text>
              <Text style={styles.sub}>Chỉ dùng cho luồng chuyển đổi dữ liệu cũ.</Text>
            </View>
          </View>

          {migrating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.syncText}>{syncStatus}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleCloudSync} disabled={migrating}>
            <Ionicons name="rocket-outline" size={16} color="#fff" />
            <Text style={styles.primaryTxt}>{migrating ? 'Đang đồng bộ...' : 'Bắt đầu đồng bộ cũ'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: COLORS.danger, marginTop: 12 }]} 
            onPress={handleReset}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.primaryTxt}>Xóa sạch dữ liệu (Reset)</Text>
          </TouchableOpacity>
        </SurfaceCard>

        <Text style={styles.section}>Cấu hình</Text>
        <SurfaceCard tone="lowest" style={styles.card}>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('WalletsManager')}>
            <View style={[styles.icon, { backgroundColor: '#e8f0ff' }]}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.itemTxt}>Sổ tiền</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('Services')}>
            <View style={[styles.icon, { backgroundColor: '#e8f0ff' }]}>
              <Ionicons name="build-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.itemTxt}>Dịch vụ</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.item, { marginBottom: 0 }]} onPress={() => navigation.navigate('BankConfig')}>
            <View style={[styles.icon, { backgroundColor: '#e8f0ff' }]}>
              <Ionicons name="card-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.itemTxt}>Cấu hình ngân hàng</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </SurfaceCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  section: { ...TYPOGRAPHY.label, color: COLORS.textMuted, marginBottom: 8, marginTop: 8 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.bold },
  sub: { marginTop: 2, fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  syncText: { fontSize: 11, color: COLORS.primary, ...FONTS.medium },
  primaryBtn: { height: 40, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, ...SHADOW.sm },
  primaryTxt: { color: '#fff', ...FONTS.bold, fontSize: 12 },
  item: { height: 48, borderRadius: 10, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  itemTxt: { flex: 1, fontSize: 13, color: COLORS.textPrimary, ...FONTS.semibold },
});
