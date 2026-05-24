/**
 * TrọCare Mobile — Public Marketplace Screen
 * Allows guests to browse active/public boarding houses, search by name/address,
 * and filter by province/district using cascading selection.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { apiGet } from '@/lib/api';
import { loadProvinces, loadDistricts, Province, District } from '@/lib/profile';

export default function MarketplaceScreen() {
  const router = useRouter();

  // State
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Location States
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  // Dropdown UI visibility states
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const loadData = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);

      // Fetch public boarding houses
      const res = await apiGet<any>('/public/boarding-houses');
      const list = res?.data ?? res ?? [];
      setItems(list);

      // Load provinces for filtering cascade
      const provList = await loadProvinces();
      setProvinces(provList);
    } catch (e: any) {
      showToast(e?.message || 'Không tải được danh sách phòng trọ.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cascading Location trigger
  const handleSelectProvince = async (province: Province) => {
    setSelectedProvince(province);
    setSelectedDistrict(null);
    setDistricts([]);
    setShowProvincePicker(false);

    try {
      const distList = await loadDistricts(province.code);
      setDistricts(distList);
    } catch (e: any) {
      showToast('Lỗi tải danh sách quận/huyện.', 'error');
    }
  };

  const handleSelectDistrict = (district: District) => {
    setSelectedDistrict(district);
    setShowDistrictPicker(false);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setDistricts([]);
  };

  // Filtered public boarding houses
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Text Search query
      const normQuery = searchQuery.trim().toLowerCase();
      if (normQuery) {
        const searchText = `${item.name ?? ''} ${item.address ?? ''} ${item.description ?? ''}`.toLowerCase();
        if (!searchText.includes(normQuery)) return false;
      }

      // 2. Province Filter (Address matching)
      if (selectedProvince) {
        const provName = selectedProvince.name.toLowerCase();
        const address = (item.address ?? '').toLowerCase();
        if (!address.includes(provName)) return false;
      }

      // 3. District Filter (Address matching)
      if (selectedDistrict) {
        const distName = selectedDistrict.name.toLowerCase();
        const address = (item.address ?? '').toLowerCase();
        if (!address.includes(distName)) return false;
      }

      return true;
    });
  }, [items, searchQuery, selectedProvince, selectedDistrict]);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Khám phá phòng trọ',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />

      <View style={styles.container}>
        {/* Header Hero Area */}
        <View style={styles.heroSection}>
          <Text style={styles.heroSub}>TrọCare Marketplace</Text>
          <Text style={styles.heroTitle}>Tìm phòng trọ ưng ý</Text>
          <Text style={styles.heroDesc}>
            Duyệt danh sách các dãy trọ đang mở công khai, lọc nhanh theo vị trí, gửi liên hệ và yêu cầu giữ chỗ trực tiếp.
          </Text>
        </View>

        {/* Search & Location Filter Panel */}
        <Card style={styles.filterCard}>
          {/* Text Input */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              placeholder="Tên dãy trọ, từ khóa địa chỉ..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {(searchQuery || selectedProvince || selectedDistrict) && (
              <TouchableOpacity onPress={handleClearFilters} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Cascading Pickers Trigger */}
          <View style={styles.pickerRow}>
            {/* Province selector */}
            <TouchableOpacity
              style={[styles.pickerTrigger, selectedProvince && styles.pickerTriggerActive]}
              onPress={() => setShowProvincePicker(!showProvincePicker)}
            >
              <Text
                style={[styles.pickerText, selectedProvince && styles.pickerTextActive]}
                numberOfLines={1}
              >
                {selectedProvince ? selectedProvince.name : 'Tỉnh/Thành phố'}
              </Text>
              <Ionicons
                name={showProvincePicker ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={selectedProvince ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>

            {/* District selector */}
            <TouchableOpacity
              style={[
                styles.pickerTrigger,
                !selectedProvince && styles.pickerDisabled,
                selectedDistrict && styles.pickerTriggerActive,
              ]}
              onPress={() => selectedProvince && setShowDistrictPicker(!showDistrictPicker)}
              disabled={!selectedProvince}
            >
              <Text
                style={[
                  styles.pickerText,
                  selectedDistrict && styles.pickerTextActive,
                  !selectedProvince && { color: Colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {selectedDistrict ? selectedDistrict.name : 'Quận/Huyện'}
              </Text>
              <Ionicons
                name={showDistrictPicker ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={selectedDistrict ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Expanded Province Dropdown */}
          {showProvincePicker && (
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownTitle}>Chọn Tỉnh/Thành phố</Text>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {provinces.map((p) => (
                  <TouchableOpacity
                    key={p.code}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectProvince(p)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedProvince?.code === p.code && styles.dropdownItemTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                    {selectedProvince?.code === p.code && (
                      <Ionicons name="checkmark" size={16} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Expanded District Dropdown */}
          {showDistrictPicker && (
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownTitle}>Chọn Quận/Huyện</Text>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {districts.map((d) => (
                  <TouchableOpacity
                    key={d.code}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectDistrict(d)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedDistrict?.code === d.code && styles.dropdownItemTextActive,
                      ]}
                    >
                      {d.name}
                    </Text>
                    {selectedDistrict?.code === d.code && (
                      <Ionicons name="checkmark" size={16} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </Card>

        {/* Results List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách dãy trọ...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Không tìm thấy dãy trọ</Text>
                <Text style={styles.emptyDesc}>
                  Chưa có dãy trọ nào công khai hoặc phù hợp với bộ lọc tìm kiếm hiện tại của bạn.
                </Text>
                {(searchQuery || selectedProvince || selectedDistrict) && (
                  <TouchableOpacity style={styles.resetBtn} onPress={handleClearFilters}>
                    <Text style={styles.resetBtnText}>Xóa bộ lọc</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <Card style={styles.bhCard}>
                <View style={styles.bhHeader}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>ĐANG MỞ CÔNG KHAI</Text>
                  </View>
                  <Text style={styles.bhId} numberOfLines={1}>
                    ID: {item.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.bhName}>{item.name ?? 'Dãy nhà trọ'}</Text>

                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={16} color={Colors.primary} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.address ?? 'Chưa cập nhật địa chỉ'}
                  </Text>
                </View>

                {item.description ? (
                  <Text style={styles.descText} numberOfLines={3}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.cardActions}>
                  <Button
                    title="Xem chi tiết & Phòng"
                    variant="primary"
                    onPress={() => router.push(`/marketplace/${item.id}`)}
                    style={styles.detailBtn}
                  />
                </View>
              </Card>
            )}
          />
        )}
      </View>

      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  heroSub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  filterCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  clearBtn: { padding: 4 },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 10,
  },
  pickerTriggerActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pickerDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: Colors.borderLight,
  },
  pickerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  pickerTextActive: {
    color: Colors.primary,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 8,
    maxHeight: 180,
  },
  dropdownTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dropdownScroll: {
    flexGrow: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  dropdownItemTextActive: {
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, gap: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  emptyDesc: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  bhCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bhHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#059669',
  },
  bhId: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    maxWidth: 100,
  },
  bhName: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  descText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 10,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  cardActions: {
    flexDirection: 'row',
  },
  detailBtn: {
    flex: 1,
    height: 38,
  },
});
