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
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function SettingsScreen({ navigation }) {
  const isDesktopWeb = Platform.OS === 'web';
  const [migrating, setMigrating] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => subscribeToAuthChanges((u) => setUser(u)), []);

  const handleCloudSync = () => {
    Alert.alert('Legacy sync', 'Push local SQLite data to legacy Firebase?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sync',
        onPress: async () => {
          setMigrating(true);
          try {
            setSyncStatus('Starting...');
            await migrateSQLiteToFirestore((msg) => setSyncStatus(msg));
            Alert.alert('Done', 'Legacy sync completed');
          } catch (e) {
            Alert.alert('Sync failed', e?.message || 'Unknown error');
          } finally {
            setMigrating(false);
            setSyncStatus('');
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Do you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logOut();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      {!isDesktopWeb ? (
        <TopAppBar
          title="Settings"
          subtitle={user?.email || 'Not logged in'}
          onBack={() => navigation.goBack()}
          rightIcon="log-out-outline"
          onRightPress={handleLogout}
          light
        />
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Data</Text>
        <SurfaceCard tone="lowest" style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Legacy Firebase Sync</Text>
              <Text style={styles.sub}>Only for old migration flow.</Text>
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
            <Text style={styles.primaryTxt}>{migrating ? 'Syncing...' : 'Start Legacy Sync'}</Text>
          </TouchableOpacity>
        </SurfaceCard>

        <Text style={styles.section}>Config</Text>
        <SurfaceCard tone="lowest" style={styles.card}>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('WalletsManager')}>
            <View style={[styles.icon, { backgroundColor: '#e8f0ff' }]}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.itemTxt}>Wallets</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('Services')}>
            <View style={[styles.icon, { backgroundColor: '#e8f0ff' }]}>
              <Ionicons name="build-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.itemTxt}>Services</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.item, { marginBottom: 0 }]} onPress={() => navigation.navigate('BankConfig')}>
            <View style={[styles.icon, { backgroundColor: '#e8f0ff' }]}>
              <Ionicons name="card-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.itemTxt}>Bank Config</Text>
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
