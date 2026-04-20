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
  const [filterCat, setFilterCat] = useState('All');
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
      const cats = [...new Set(currentTabItems.map((i) => i.category || 'Mac dinh'))];
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
      Alert.alert('Loi', 'Khong the luu san pham');
    }
  };

  const handleDelete = (id) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xoa hang',
        message: 'Ban chac chan muon xoa?',
        confirmText: 'Xoa',
      });
      if (!confirmed) return;
      await deleteTradingItem(id);
      loadData();
    })();
  };

  const handleQuickSell = async () => {
    const sellPrice = parseInt(String(sellPriceInput).replace(/[^0-9]/g, ''), 10);
    if (!sellPrice) {
      Alert.alert('Loi', 'Nhap gia ban hop le');
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
      Alert.alert('Loi', 'Khong the chot ban');
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
    const okFilter = filterCat === 'All' || (i.category || 'Mac dinh') === filterCat;
    return okTab && okFilter;
  });
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && !isEmbedded;
  const contentMaxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;

  const renderItem = ({ item }) => {
    const profit = Number(item.sell_price || 0) - Number(item.import_price || 0);
    const isProfit = profit >= 0;

    return (
      <TouchableOpacity style={[styles.itemCard, isWeb && styles.itemCardWeb]} onPress={() => { setEditItem(item); setShowAdd(true); }}>
        <View style={styles.itemTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{item.category || 'Mac dinh'}</Text>
            </View>
            <Text style={styles.dateText}>{item.status === 'sold' ? `Ban: ${item.sell_date}` : `Nhap: ${item.import_date}`}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
          {item.batch_id ? (
            <TouchableOpacity style={styles.batchBadge} onPress={() => handleOpenBatch(item.batch_id)}>
              <Text style={styles.batchText}>Lo {item.batch_sold || 0}/{item.batch_total || 0}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.itemBottom}>
          {item.status === 'available' ? (
            <>
              <View>
                <Text style={styles.metaLabel}>Von nhap</Text>
                <Text style={styles.importPrice}>{formatCurrency(item.import_price || 0)}</Text>
              </View>
              <TouchableOpacity style={styles.quickSellBtn} onPress={() => { setSellItem(item); setSellPriceInput(''); setSellModal(true); }}>
                <Text style={styles.quickSellText}>Chot ban</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View>
                <Text style={styles.metaLabel}>Gia ban</Text>
                <Text style={styles.sellPrice}>{formatCurrency(item.sell_price || 0)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.metaLabel}>Loi nhuan</Text>
                <Text style={[styles.profitText, { color: isProfit ? COLORS.secondary : COLORS.danger }]}>
                  {isProfit ? '+' : ''}{formatCurrency(profit)}
                </Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {!isEmbedded && !isDesktopWeb ? (
        <TopAppBar title={walletName} subtitle="Kho va giao dich" onBack={() => navigation.goBack()} />
      ) : null}

      <View style={[styles.content, isWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
        <View style={[styles.heroRow, isWeb && styles.heroRowWeb]}>
        <View style={styles.kpiRow}>
          <SurfaceCard tone="low" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Von dang ton</Text>
            <Text style={styles.kpiValue}>{formatCurrency(stats.unsoldCapital || 0)}</Text>
            <Text style={styles.kpiSub}>{stats.unsoldCount || 0} san pham</Text>
          </SurfaceCard>
          <SurfaceCard tone="lowest" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Loi nhuan da chot</Text>
            <Text style={[styles.kpiValue, { color: (stats.realizedProfit || 0) >= 0 ? COLORS.secondary : COLORS.danger }]}>
              {(stats.realizedProfit || 0) > 0 ? '+' : ''}{formatCurrency(stats.realizedProfit || 0)}
            </Text>
            <Text style={styles.kpiSub}>{stats.soldCount || 0} san pham da ban</Text>
          </SurfaceCard>
        </View>

        {isWeb ? (
          <SurfaceCard tone="lowest" style={styles.heroNote}>
            <Text style={styles.heroEyebrow}>KHO KINH DOANH</Text>
            <Text style={styles.heroTitle}>Bang dieu phoi hang hoa</Text>
            <Text style={styles.heroText}>Theo doi ton kho, chot ban va mo chi tiet lo hang trong mot bo cuc hop voi desktop. Nghiep vu va tinh toan loi nhuan giu nguyen.</Text>
          </SurfaceCard>
        ) : null}
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'available' && styles.tabActive]} onPress={() => setTab('available')}>
            <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>Chua ban</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'sold' && styles.tabActive]} onPress={() => setTab('sold')}>
            <Text style={[styles.tabText, tab === 'sold' && styles.tabTextActive]}>Da ban</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, filterCat === 'All' && styles.filterChipActive]} onPress={() => setFilterCat('All')}>
            <Text style={[styles.filterText, filterCat === 'All' && styles.filterTextActive]}>Tat ca</Text>
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
              <Ionicons name="cube-outline" size={56} color={COLORS.border} />
              <Text style={styles.emptyText}>Chua co san pham</Text>
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
            <Text style={styles.modalTitle}>Chot ban</Text>
            <Text style={styles.modalSub}>{sellItem?.name || ''}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              placeholder="Nhap gia ban"
              value={sellPriceInput}
              onChangeText={setSellPriceInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSellModal(false)}>
                <Text style={styles.cancelText}>Huy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleQuickSell}>
                <Text style={styles.saveText}>Xac nhan</Text>
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
                <Text style={styles.modalTitle}>Chi tiet lo</Text>
                <Text style={styles.modalSub}>{batchSummary.id || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setBatchModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <SurfaceCard tone="low" style={{ marginBottom: 10 }}>
              <Text style={styles.kpiLabel}>Tong von</Text>
              <Text style={styles.kpiValue}>{formatCurrency(batchSummary.totalImport || 0)}</Text>
              <Text style={styles.kpiSub}>Thu ve {formatCurrency(batchSummary.totalRevenue || 0)}</Text>
            </SurfaceCard>
            <ScrollView style={{ maxHeight: 320 }}>
              {batchItems.map((bi) => {
                const p = Number(bi.sell_price || 0) - Number(bi.import_price || 0);
                return (
                  <View key={bi.id} style={styles.batchItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.batchName}>{bi.name}</Text>
                      <Text style={styles.batchMeta}>{bi.category || 'Mac dinh'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.batchMeta}>{bi.status === 'sold' ? 'Da ban' : 'Trong kho'}</Text>
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
  itemCard: {
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.sm,
  },
  itemCardWeb: { borderWidth: 1, borderColor: COLORS.borderSoft },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.primaryLight },
  catText: { fontSize: 10, color: COLORS.primaryDark, ...FONTS.bold },
  dateText: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },
  itemName: { marginTop: 10, flex: 1, fontSize: 14, color: COLORS.textPrimary, ...FONTS.bold },
  batchBadge: { marginLeft: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.surfaceLow },
  batchText: { fontSize: 10, color: COLORS.primary, ...FONTS.bold },
  itemBottom: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.borderSoft, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  metaLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },
  importPrice: { marginTop: 4, fontSize: 16, ...FONTS.bold, color: COLORS.textPrimary },
  sellPrice: { marginTop: 4, fontSize: 16, ...FONTS.bold, color: COLORS.secondary },
  profitText: { marginTop: 4, fontSize: 14, ...FONTS.bold },
  quickSellBtn: { height: 36, borderRadius: 10, paddingHorizontal: 14, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  quickSellText: { fontSize: 12, color: '#fff', ...FONTS.bold },
  emptyWrap: { alignItems: 'center', marginTop: 48 },
  emptyText: { marginTop: 8, fontSize: 13, color: COLORS.textMuted, ...FONTS.medium },
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
