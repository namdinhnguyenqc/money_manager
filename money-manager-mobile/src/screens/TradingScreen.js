import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { formatCurrency, toISODate } from '../utils/format';
import {
  addTradingItem,
  deleteTradingItem,
  getTradingItems,
  getTradingStats,
  updateTradingItem,
} from '../database/queries';
import { fetchBatchDetails } from '../services/tradingService';
import AddTradingItemBottomSheet from '../components/AddTradingItemBottomSheet';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import { confirmDialog } from '../utils/dialogs';

export default function TradingScreen({ route, navigation, walletId: propWalletId, walletName: propWalletName, isEmbedded }) {
  const { width } = useWindowDimensions();
  const walletId = propWalletId || route?.params?.walletId;
  const walletName = propWalletName || route?.params?.walletName || 'Kinh doanh';

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 });
  const [tab, setTab] = useState('available');
  const [filterCat, setFilterCat] = useState('Tất cả');
  const [uniqueCats, setUniqueCats] = useState([]);

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [sellModal, setSellModal] = useState(false);
  const [sellItem, setSellItem] = useState(null);
  const [sellPriceInput, setSellPriceInput] = useState('');

  const [batchModal, setBatchModal] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [batchSummary, setBatchSummary] = useState({ id: '', totalImport: 0, totalRevenue: 0, paybackGap: 0, soldCount: 0, unsoldCount: 0 });

  const loadData = useCallback(async () => {
    try {
      const [data, s] = await Promise.all([getTradingItems(walletId), getTradingStats(walletId)]);
      setItems(data || []);
      setStats(s || { unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 });

      const currentTabItems = (data || []).filter((i) => i.status === tab);
      const cats = [...new Set(currentTabItems.map((i) => i.category || 'Mặc định'))];
      setUniqueCats(cats);
    } catch (e) {
      console.error(e);
    }
  }, [tab, walletId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async (formData) => {
    try {
      if (editItem) await updateTradingItem(editItem.id, formData);
      else await addTradingItem({ walletId, ...formData });
      setShowAdd(false);
      setEditItem(null);
      await loadData();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu sản phẩm');
    }
  };

  const handleDelete = (id) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xóa mặt hàng',
        message: 'Bạn có chắc muốn xóa mặt hàng này?',
        confirmText: 'Xóa',
      });
      if (!confirmed) return;
      await deleteTradingItem(id);
      loadData();
    })();
  };

  const handleQuickSell = async () => {
    const sellPrice = parseInt(String(sellPriceInput).replace(/[^0-9]/g, ''), 10);
    if (!sellPrice) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá bán hợp lệ');
      return;
    }
    try {
      await updateTradingItem(sellItem.id, {
        ...sellItem,
        name: sellItem.name,
        category: sellItem.category,
        importPrice: sellItem.import_price,
        importDate: sellItem.import_date,
        note: sellItem.note,
        sellPrice,
        sellDate: toISODate(new Date()),
        status: 'sold',
      });
      setSellModal(false);
      setSellItem(null);
      setSellPriceInput('');
      loadData();
    } catch {
      Alert.alert('Lỗi', 'Không thể chốt bán');
    }
  };

  const handleOpenBatch = async (batchId) => {
    try {
      const summary = await fetchBatchDetails(batchId);
      setBatchItems(summary.items || []);
      setBatchSummary(summary);
      setBatchModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = items.filter((i) => {
    const okTab = i.status === tab;
    const okFilter = filterCat === 'Tất cả' || (i.category || 'Mặc định') === filterCat;
    return okTab && okFilter;
  });
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && !isEmbedded;
  const contentMaxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;

  const renderItem = ({ item }) => {
    const profit = Number(item.sell_price || 0) - Number(item.import_price || 0);
    const isProfit = profit >= 0;

    return (
      <TouchableOpacity style={[styles.itemRow, isWeb && styles.itemRowWeb]} onPress={() => { setEditItem(item); setShowAdd(true); }}>
        <View style={styles.itemMain}>
          <View style={styles.itemInfo}>
            <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <View style={[styles.catBadge, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={styles.catText}>{item.category || 'Mặc định'}</Text>
              </View>
              <Text style={styles.stockLabel}>Số lượng: 1</Text>
            </View>
          </View>

          <View style={styles.itemPrices}>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Giá nhập</Text>
              <Text style={styles.importPrice}>{formatCurrency(item.import_price || 0)}</Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>{item.status === 'sold' ? 'Giá bán' : 'Giá niêm yết'}</Text>
              <Text style={[styles.sellPrice, item.status === 'sold' && { color: COLORS.income }]}>
                {formatCurrency(item.sell_price || item.target_price || 0)}
              </Text>
            </View>
          </View>

          {item.status === 'available' ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setSellItem(item); setSellPriceInput(''); setSellModal(true); }}>
              <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.income} />
            </TouchableOpacity>
          ) : (
            <View style={styles.actionBtn}>
              <Ionicons name="ribbon-outline" size={24} color={COLORS.secondary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {!isEmbedded && !isDesktopWeb ? (
        <TopAppBar 
          title="Kho hàng" 
          subtitle="Quản lý tồn kho & vận hành" 
          onBack={() => navigation.goBack()}
          rightIcon="add"
          onRightPress={() => { setEditItem(null); setShowAdd(true); }}
        />
      ) : null}

      {isDesktopWeb ? (
        <View style={styles.webHeader}>
          <View>
            <Text style={styles.webTitle}>Kho hàng</Text>
            <Text style={styles.webSub}>Vận hành tồn kho và theo dõi lợi nhuận kinh doanh</Text>
          </View>
          <TouchableOpacity style={styles.webAddBtn} onPress={() => { setEditItem(null); setShowAdd(true); }}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.webAddText}>Thêm hàng mới</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.content, isWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
        <View style={[styles.heroRow, isWeb && styles.heroRowWeb]}>
        <View style={styles.kpiRow}>
          <SurfaceCard tone="low" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Giá trị tồn kho hiện tại</Text>
            <Text style={styles.kpiValue}>{formatCurrency(stats.unsoldCapital || 0)}</Text>
            <Text style={styles.kpiSub}>{stats.unsoldCount || 0} sản phẩm</Text>
          </SurfaceCard>
          <SurfaceCard tone="lowest" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Lợi nhuận đã chốt</Text>
            <Text style={[styles.kpiValue, { color: (stats.realizedProfit || 0) >= 0 ? COLORS.secondary : COLORS.danger }]}>
              {(stats.realizedProfit || 0) > 0 ? '+' : ''}{formatCurrency(stats.realizedProfit || 0)}
            </Text>
            <Text style={styles.kpiSub}>{stats.soldCount || 0} sản phẩm đã bán</Text>
          </SurfaceCard>
        </View>

        {isWeb ? (
          <SurfaceCard tone="lowest" style={styles.heroNote}>
            <Text style={styles.heroEyebrow}>KINH DOANH TỒN KHO</Text>
            <Text style={styles.heroTitle}>Bảng điều khiển vận hành kho</Text>
            <Text style={styles.heroText}>Theo dõi tồn kho, chốt bán và xem chi tiết lô trên giao diện máy tính. Logic kinh doanh và cách tính lợi nhuận được giữ nguyên.</Text>
          </SurfaceCard>
        ) : null}
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'available' && styles.tabActive]} onPress={() => setTab('available')}>
            <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>Chưa bán</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'sold' && styles.tabActive]} onPress={() => setTab('sold')}>
            <Text style={[styles.tabText, tab === 'sold' && styles.tabTextActive]}>Đã bán</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, filterCat === 'Tất cả' && styles.filterChipActive]} onPress={() => setFilterCat('Tất cả')}>
            <Text style={[styles.filterText, filterCat === 'Tất cả' && styles.filterTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          {uniqueCats.map((c) => (
            <TouchableOpacity key={c} style={[styles.filterChip, filterCat === c && styles.filterChipActive]} onPress={() => setFilterCat(c)}>
              <Text style={[styles.filterText, filterCat === c && styles.filterTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filteredItems}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cube-outline" size={48} color={COLORS.border} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có hàng hóa trong kho</Text>
              <Text style={styles.emptyText}>Nhấn nút + để bắt đầu nhập hàng và quản lý kinh doanh.</Text>
              <TouchableOpacity style={styles.emptyCTA} onPress={() => setShowAdd(true)}>
                <Text style={styles.emptyCTAText}>Nhập hàng ngay</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => { setEditItem(null); setShowAdd(true); }}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <AddTradingItemBottomSheet
        visible={showAdd}
        item={editItem}
        navigation={navigation}
        onClose={() => { setShowAdd(false); setEditItem(null); }}
        onSave={handleSave}
      />

      <Modal visible={sellModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Chốt bán</Text>
            <Text style={styles.modalSub}>{sellItem?.name || ''}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              placeholder="Nhập giá bán"
              value={sellPriceInput}
              onChangeText={setSellPriceInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSellModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleQuickSell}>
                <Text style={styles.saveText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={batchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.batchBox}>
            <View style={styles.batchHead}>
              <View>
                <Text style={styles.modalTitle}>Chi tiết lô</Text>
                <Text style={styles.modalSub}>{batchSummary.id || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setBatchModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <SurfaceCard tone="low" style={{ marginBottom: 10 }}>
              <Text style={styles.kpiLabel}>Tổng giá vốn</Text>
              <Text style={styles.kpiValue}>{formatCurrency(batchSummary.totalImport || 0)}</Text>
              <Text style={styles.kpiSub}>Doanh thu {formatCurrency(batchSummary.totalRevenue || 0)}</Text>
            </SurfaceCard>
            <ScrollView style={{ maxHeight: 320 }}>
              {batchItems.map((bi) => {
                const p = Number(bi.sell_price || 0) - Number(bi.import_price || 0);
                return (
                  <View key={bi.id} style={styles.batchItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.batchName}>{bi.name}</Text>
                      <Text style={styles.batchMeta}>{bi.category || 'Mặc định'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.batchMeta}>{bi.status === 'sold' ? 'Đã bán' : 'Trong kho'}</Text>
                      <Text style={[styles.batchPrice, { color: bi.status === 'sold' ? (p >= 0 ? COLORS.secondary : COLORS.danger) : COLORS.textPrimary }]}>
                        {bi.status === 'sold' ? `${p >= 0 ? '+' : ''}${formatCurrency(p)}` : formatCurrency(bi.import_price || 0)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  content: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 10 },
  contentWeb: { width: '100%', alignSelf: 'center', paddingTop: 20 },
  heroRow: { gap: 10 },
  heroRowWeb: { flexDirection: 'row', alignItems: 'stretch' },
  kpiRow: { flexDirection: 'row', gap: 10, flex: 1 },
  kpiCard: { flex: 1 },
  kpiLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  kpiValue: { marginTop: 4, fontSize: 20, ...FONTS.bold, color: COLORS.textPrimary },
  kpiSub: { marginTop: 4, fontSize: 11, color: COLORS.textSecondary, ...FONTS.medium },
  heroNote: { flex: 0.95, justifyContent: 'center' },
  heroEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  heroTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  heroText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  webHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  webTitle: { fontSize: 28, color: COLORS.textPrimary, ...FONTS.black },
  webSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, ...FONTS.medium },
  webAddBtn: { height: 42, borderRadius: 12, paddingHorizontal: 18, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8, ...SHADOW.sm },
  webAddText: { color: '#fff', ...FONTS.bold, fontSize: 13 },
  tabRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  tab: { flex: 1, height: 42, borderRadius: 14, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  tabTextActive: { color: '#fff' },
  filterRow: { gap: 8, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surfaceLow },
  filterChipActive: { backgroundColor: COLORS.primaryDark },
  filterText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  filterTextActive: { color: '#fff' },
  itemRow: {
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.xs,
  },
  itemRowWeb: { padding: 4 },
  itemMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 16 },
  itemInfo: { flex: 1.5, gap: 4 },
  itemName: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catText: { fontSize: 10, color: COLORS.primaryDark, ...FONTS.bold },
  stockLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },
  itemPrices: { flex: 2, flexDirection: 'row', gap: 20, justifyContent: 'flex-end', paddingRight: 10 },
  priceCol: { alignItems: 'flex-end', minWidth: 90 },
  priceLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 2 },
  importPrice: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.bold },
  sellPrice: { fontSize: 14, color: COLORS.secondary, ...FONTS.bold },
  actionBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 8 },
  emptyText: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 20 },
  emptyCTA: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary },
  emptyCTAText: { color: '#fff', ...FONTS.bold, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.lg,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 18 },
  modalBox: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 20 },
  modalTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  modalSub: { marginTop: 4, fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
  modalInput: { marginTop: 14, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 14, fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1.5, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.textSecondary, ...FONTS.bold },
  saveText: { color: '#fff', ...FONTS.bold },
  batchBox: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 18 },
  batchHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  batchItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batchName: { fontSize: 13, color: COLORS.textPrimary, ...FONTS.bold },
  batchMeta: { marginTop: 2, fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  batchPrice: { marginTop: 4, fontSize: 12, ...FONTS.bold },
});
