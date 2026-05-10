import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import TopAppBar from '../components/ui/TopAppBar';
import { getAuthToken } from '../services/authService';

const API_BASE = process.env?.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

async function getTenantsApi() {
  try {
    const token = await getAuthToken().catch(() => null);
    const res = await fetch(`${API_BASE}/rental/tenants`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    return data?.data ?? [];
  } catch {
    return [];
  }
}

function TenantCard({ tenant, onPress }) {
  const hasActiveContract = Boolean(tenant.room_name);
  return (
    <TouchableOpacity style={tc.card} onPress={() => onPress(tenant)} activeOpacity={0.8}>
      <View style={[tc.avatar, { backgroundColor: hasActiveContract ? COLORS.primaryLight : COLORS.surfaceHigh }]}>
        <Text style={[tc.avatarText, { color: hasActiveContract ? COLORS.primary : COLORS.textMuted }]}>
          {(tenant.name || 'K').charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={tc.name} numberOfLines={1}>{tenant.name}</Text>
          {hasActiveContract && (
            <View style={tc.activeBadge}>
              <Text style={tc.activeBadgeText}>Đang thuê</Text>
            </View>
          )}
        </View>
        {tenant.phone ? (
          <View style={tc.infoRow}>
            <Ionicons name="call-outline" size={12} color={COLORS.textMuted} />
            <Text style={tc.infoText}>{tenant.phone}</Text>
          </View>
        ) : null}
        {hasActiveContract ? (
          <View style={tc.infoRow}>
            <Ionicons name="home-outline" size={12} color={COLORS.primary} />
            <Text style={[tc.infoText, { color: COLORS.primary }]}>
              Phòng {tenant.room_name}
            </Text>
          </View>
        ) : (
          <Text style={tc.inactiveText}>Chưa thuê phòng</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const tc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 14, borderWidth: 1, borderColor: COLORS.borderSoft,
    ...SHADOW.xs,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, ...FONTS.bold },
  name: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold, flex: 1 },
  activeBadge: {
    backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  activeBadgeText: { fontSize: 10, color: '#2e7d32', ...FONTS.bold },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  inactiveText: { fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
});

export default function TenantsScreen({ navigation }) {
  const [tenants, setTenants]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all | active | inactive

  const load = useCallback(async () => {
    try {
      const data = await getTenantsApi();
      setTenants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      String(t.name || '').toLowerCase().includes(q) ||
      String(t.phone || '').includes(q) ||
      String(t.id_card || '').includes(q);
    if (!matchSearch) return false;
    if (filterActive === 'active') return Boolean(t.room_name);
    if (filterActive === 'inactive') return !t.room_name;
    return true;
  });

  const activeCount   = tenants.filter((t) => Boolean(t.room_name)).length;
  const inactiveCount = tenants.length - activeCount;

  if (loading) {
    return (
      <View style={s.root}>
        <TopAppBar title="Khách thuê" subtitle="Danh sách khách thuê" onBack={() => navigation.goBack()} />
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <TopAppBar
        title="Khách thuê"
        subtitle={`${tenants.length} khách · ${activeCount} đang thuê`}
        onBack={() => navigation.goBack()}
      />

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm theo tên, SĐT, CCCD..."
          placeholderTextColor={COLORS.textMuted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {[
          { key: 'all',      label: `Tất cả (${tenants.length})` },
          { key: 'active',   label: `Đang thuê (${activeCount})` },
          { key: 'inactive', label: `Đã trả phòng (${inactiveCount})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, filterActive === tab.key && s.tabActive]}
            onPress={() => setFilterActive(tab.key)}
          >
            <Text style={[s.tabText, filterActive === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TenantCard
            tenant={item}
            onPress={(tenant) => {
              // Navigate to tenant detail (future screen)
              // navigation.navigate('TenantDetail', { tenant });
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={COLORS.borderStrong} />
            <Text style={s.emptyTitle}>Không tìm thấy khách thuê</Text>
            <Text style={s.emptyText}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginBottom: 0,
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, ...FONTS.medium },

  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft,
    marginTop: 12, paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.semibold },
  tabTextActive: { color: COLORS.primary, ...FONTS.bold },

  list: { padding: 16, gap: 10, paddingBottom: 48 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  emptyText: { fontSize: 13, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', maxWidth: 280 },
});
