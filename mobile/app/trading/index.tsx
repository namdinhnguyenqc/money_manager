/**
 * TrọCare Mobile — Trading (Kinh Doanh) Screen
 * Import goods, sell, track inventory & profit.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import {
  loadWallets, loadTradingItems, loadTradingStats,
  createTradingItem, sellTradingItem, deleteTradingItem,
  formatMoney,
  type Wallet, type TradingItem, type TradingStats,
} from '@/lib/rentalOps';

type TabKey = 'available' | 'sold';

export default function TradingScreen() {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [items, setItems] = useState<TradingItem[]>([]);
  const [stats, setStats] = useState<TradingStats>({ unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>('available');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', importPrice: '', importDate: '', note: '', quantity: '1',
  });

  // Sell modal
  const [sellItem, setSellItem] = useState<TradingItem | null>(null);
  const [sellPrice, setSellPrice] = useState('');

  const fetchWallets = useCallback(async () => {
    try {
      const w = await loadWallets();
      setWallets(w);
      const tradingWallet = w.find((x) => x.type === 'trading') || w[0];
      if (tradingWallet) setSelectedWallet(tradingWallet.id);
    } catch { }
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedWallet) return;
    try {
      const [itemsData, statsData] = await Promise.all([
        loadTradingItems(selectedWallet),
        loadTradingStats(selectedWallet),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedWallet]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);
  useEffect(() => { if (selectedWallet) fetchData(); }, [selectedWallet, fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const today = () => new Date().toISOString().slice(0, 10);

  const handleCreate = async () => {
    if (!form.name.trim()) { Alert.alert('Lỗi', 'Nhập tên sản phẩm.'); return; }
    if (!Number(form.importPrice)) { Alert.alert('Lỗi', 'Nhập giá nhập.'); return; }
    setSaving(true);
    try {
      await createTradingItem({
        walletId: selectedWallet,
        name: form.name.trim(),
        importPrice: Number(form.importPrice),
        importDate: form.importDate || today(),
        note: form.note,
        quantity: Number(form.quantity) || 1,
      });
      setForm({ name: '', importPrice: '', importDate: '', note: '', quantity: '1' });
      setShowAdd(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo.');
    } finally { setSaving(false); }
  };

  const handleSell = async () => {
    if (!sellItem || !Number(sellPrice)) { Alert.alert('Lỗi', 'Nhập giá bán.'); return; }
    setSaving(true);
    try {
      await sellTradingItem(sellItem.id, { sellPrice: Number(sellPrice), sellDate: today() });
      setSellItem(null);
      setSellPrice('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể bán.');
    } finally { setSaving(false); }
  };

  const handleDelete = (item: TradingItem) => {
    Alert.alert('Xóa sản phẩm', `Xóa "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try { await deleteTradingItem(item.id); fetchData(); }
          catch (err: any) { Alert.alert('Lỗi', err?.message || 'Không thể xóa.'); }
        },
      },
    ]);
  };

  const filtered = items.filter((i) => i.status === tab);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kinh doanh</Text>
          <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
            <Ionicons name={showAdd ? 'close' : 'add'} size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Wallet Picker */}
        {wallets.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.walletChip, selectedWallet === w.id && styles.walletChipActive]}
                onPress={() => setSelectedWallet(w.id)}
              >
                <Text style={[styles.walletChipText, selectedWallet === w.id && styles.walletChipTextActive]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="cube-outline" size={18} color="#ea580c" />
            <Text style={styles.statValue}>{formatMoney(stats.unsoldCapital)}</Text>
            <Text style={styles.statLabel}>Vốn chưa bán ({stats.unsoldCount})</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={18} color={Colors.successDark} />
            <Text style={[styles.statValue, { color: stats.realizedProfit >= 0 ? Colors.successDark : Colors.danger }]}>
              {formatMoney(stats.realizedProfit)}
            </Text>
            <Text style={styles.statLabel}>Lợi nhuận ({stats.soldCount})</Text>
          </Card>
        </View>

        {/* Add Form */}
        {showAdd && (
          <Card style={styles.addCard}>
            <Text style={styles.addTitle}>Nhập hàng mới</Text>
            <TextInput style={styles.input} placeholder="Tên sản phẩm" placeholderTextColor={Colors.textMuted}
              value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <View style={styles.priceRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Giá nhập (VNĐ)" placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad" value={form.importPrice} onChangeText={(v) => setForm({ ...form, importPrice: v })} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="SL" placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad" value={form.quantity} onChangeText={(v) => setForm({ ...form, quantity: v })} />
            </View>
            <TextInput style={styles.input} placeholder="Ghi chú (tùy chọn)" placeholderTextColor={Colors.textMuted}
              value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />
            <View style={styles.addActions}>
              <TouchableOpacity style={styles.cancelAction} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelActionText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveAction} onPress={handleCreate} disabled={saving}>
                <Text style={styles.saveActionText}>{saving ? 'Đang lưu...' : 'Nhập hàng'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'available' && styles.tabBtnActive]}
            onPress={() => setTab('available')}
          >
            <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>
              Trong kho ({items.filter((i) => i.status === 'available').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'sold' && styles.tabBtnActive]}
            onPress={() => setTab('sold')}
          >
            <Text style={[styles.tabText, tab === 'sold' && styles.tabTextActive]}>
              Đã bán ({items.filter((i) => i.status === 'sold').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Items */}
        {filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{tab === 'available' ? 'Chưa có hàng trong kho' : 'Chưa bán sản phẩm nào'}</Text>
          </Card>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDate}>{item.import_date}</Text>
                </View>
                <View style={styles.itemPriceCol}>
                  <Text style={styles.itemImportPrice}>Nhập: {formatMoney(item.import_price)}</Text>
                  {item.sell_price != null && (
                    <Text style={[styles.itemSellPrice, {
                      color: (item.sell_price - item.import_price) >= 0 ? Colors.successDark : Colors.danger
                    }]}>
                      Bán: {formatMoney(item.sell_price)}
                    </Text>
                  )}
                </View>
              </View>
              {item.status === 'available' && (
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.sellBtn} onPress={() => { setSellItem(item); setSellPrice(''); }}>
                    <Ionicons name="pricetag-outline" size={14} color={Colors.textWhite} />
                    <Text style={styles.sellBtnText}>Bán</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteItemBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
              {item.status === 'sold' && item.sell_price != null && (
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Lợi nhuận:</Text>
                  <Text style={[styles.profitValue, {
                    color: (item.sell_price - item.import_price) >= 0 ? Colors.successDark : Colors.danger
                  }]}>
                    {formatMoney(item.sell_price - item.import_price)}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}

        {/* Sell Alert */}
        {sellItem && (
          <Card style={styles.sellCard}>
            <Text style={styles.sellTitle}>Bán: {sellItem.name}</Text>
            <Text style={styles.sellSubtext}>Giá nhập: {formatMoney(sellItem.import_price)}</Text>
            <TextInput
              style={styles.input}
              placeholder="Giá bán (VNĐ)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={sellPrice}
              onChangeText={setSellPrice}
              autoFocus
            />
            <View style={styles.addActions}>
              <TouchableOpacity style={styles.cancelAction} onPress={() => setSellItem(null)}>
                <Text style={styles.cancelActionText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveAction, { backgroundColor: Colors.successDark }]} onPress={handleSell} disabled={saving}>
                <Text style={styles.saveActionText}>{saving ? 'Đang bán...' : 'Xác nhận bán'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 18, fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary, letterSpacing: -0.3,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  walletChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  walletChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  walletChipText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  walletChipTextActive: { color: Colors.primary, fontFamily: Typography.fontFamily.semibold },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, padding: 14, gap: 6, alignItems: 'center' },
  statValue: {
    fontSize: 16, fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11, fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted, textAlign: 'center',
  },
  addCard: { padding: 16, gap: 10, marginBottom: 8 },
  addTitle: {
    fontSize: 15, fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary, backgroundColor: Colors.background,
  },
  priceRow: { flexDirection: 'row', gap: 8 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelAction: { padding: 10, borderRadius: 8 },
  cancelActionText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  saveAction: { padding: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors.primary },
  saveActionText: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textWhite },
  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: 8,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textWhite, fontFamily: Typography.fontFamily.semibold },
  emptyCard: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  itemCard: { padding: 14, gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { fontSize: 15, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  itemDate: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  itemPriceCol: { alignItems: 'flex-end' },
  itemImportPrice: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  itemSellPrice: { fontSize: 13, fontFamily: Typography.fontFamily.bold, marginTop: 2 },
  itemActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8,
  },
  sellBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.successDark,
  },
  sellBtnText: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textWhite },
  deleteItemBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
  },
  profitRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8,
  },
  profitLabel: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  profitValue: { fontSize: 14, fontFamily: Typography.fontFamily.bold },
  sellCard: {
    padding: 16, gap: 10, marginTop: 8,
    borderWidth: 2, borderColor: Colors.successDark,
  },
  sellTitle: { fontSize: 15, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  sellSubtext: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
});
