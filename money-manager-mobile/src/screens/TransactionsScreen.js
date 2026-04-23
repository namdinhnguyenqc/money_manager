import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY, WEB } from '../theme';
import { formatCurrency, formatDateTime, getCurrentMonthYear } from '../utils/format';
import {
  deleteTransaction,
  getMonthlyWalletStats,
  getTransactionCount,
  getTransactions,
} from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import WebDesktopShell from '../components/ui/WebDesktopShell';
import { confirmDialog } from '../utils/dialogs';

const PAGE_SIZE = 20;

export default function TransactionsScreen({ navigation, route, walletId: propWalletId, walletName: propWalletName, isEmbedded }) {
  const { width } = useWindowDimensions();
  const walletId = propWalletId || route?.params?.walletId || null;
  const walletName = propWalletName || route?.params?.walletName || 'Tài chính cá nhân';
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [monthStats, setMonthStats] = useState({ income: 0, expense: 0, balance: 0 });

  const loadData = useCallback(async (reset = true) => {
    const offset = reset ? 0 : page * PAGE_SIZE;
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const [rows, count] = await Promise.all([
        getTransactions({ walletId, limit: PAGE_SIZE, offset }),
        getTransactionCount(walletId),
      ]);

      if (reset) {
        setTransactions(rows);
        setPage(1);
      } else {
        setTransactions((prev) => [...prev, ...rows]);
        setPage((prev) => prev + 1);
      }

      setTotal(count);
      setHasMore(offset + PAGE_SIZE < count);

      if (walletId) {
        const { month, year } = getCurrentMonthYear();
        const stats = await getMonthlyWalletStats(walletId, month, year);
        setMonthStats(stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, walletId]);

  useFocusEffect(useCallback(() => { loadData(true); }, [loadData]));

  const onXóa = (tx) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xóa giao dịch',
        message: `"${tx.description || tx.category_name || 'Giao dịch'}"?`,
        confirmText: 'Xóa',
      });
      if (!confirmed) return;
      await deleteTransaction(tx.id);
      loadData(true);
    })();
  };

  const grouped = [];
  let lastDay = '';
  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const day = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const key = `Ngày ${day}`;
    if (lastDay !== key) {
      grouped.push({ type: 'header', key });
      lastDay = key;
    }
    grouped.push({ type: 'item', tx });
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && !isEmbedded;
  const contentMaxWidth = width >= 1440 ? WEB.contentMax.xl : width >= 1024 ? WEB.contentMax.lg : WEB.contentMax.md;
  const incomeCount = transactions.filter((tx) => tx.type === 'income').length;
  const expenseCount = transactions.filter((tx) => tx.type !== 'income').length;
  const imageCount = transactions.filter((tx) => Boolean(tx.image_uri)).length;

  const screenContent = (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isEmbedded ? { paddingBottom: 24 } : { paddingBottom: 120 }}
      >
        <View style={[styles.contentWrap, isWeb && styles.contentWrapWeb, { maxWidth: contentMaxWidth }]}>
          {isDesktopWeb && !isEmbedded ? (
            <View style={styles.heroRow}>
              <SurfaceCard tone="low" style={styles.heroCard}>
                <Text style={styles.heroEyebrow}>KHÔNG GIAN SỔ CÁI</Text>
                <Text style={styles.heroTitle}>Nhật ký giao dịch và đối soát</Text>
                <Text style={styles.heroText}>
                  Theo dõi giao dịch theo ngày, mở ảnh đính kèm nhanh và chỉnh sửa trực tiếp trên website.
                </Text>
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Đã tải</Text>
                    <Text style={styles.heroStatValue}>{transactions.length}</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Tổng dòng</Text>
                    <Text style={styles.heroStatValue}>{total}</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Có chứng từ</Text>
                    <Text style={styles.heroStatValue}>{imageCount}</Text>
                  </View>
                </View>
              </SurfaceCard>

              <SurfaceCard tone="lowest" style={styles.heroNote}>
                <Text style={styles.heroNoteEyebrow}>THÁNG HIỆN TẠI</Text>
                <Text style={[styles.heroNoteValue, { color: (monthStats.balance || 0) >= 0 ? COLORS.secondary : COLORS.danger }]}>
                  {(monthStats.balance || 0) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthStats.balance || 0))}
                </Text>
                <Text style={styles.heroNoteText}>Số dư hiện tại của sổ trong tháng đang mở.</Text>
                <View style={styles.heroNoteList}>
                  <Text style={styles.heroNoteItem}>Thu: {formatCurrency(monthStats.income || 0)}</Text>
                  <Text style={styles.heroNoteItem}>Chi: {formatCurrency(monthStats.expense || 0)}</Text>
                  <Text style={styles.heroNoteItem}>Dòng có đính kèm: {imageCount}</Text>
                </View>
              </SurfaceCard>
            </View>
          ) : null}

          {walletId && !isEmbedded ? (
            <View style={[styles.statsGrid, isDesktopWeb && styles.statsGridWeb]}>
              <SurfaceCard tone="low" style={[styles.statsCard, isDesktopWeb && styles.statsCardWeb]}>
                <Text style={styles.statsLabel}>Số dư tháng này</Text>
                <Text style={[styles.balance, { color: (monthStats.balance || 0) >= 0 ? COLORS.secondary : COLORS.danger }]}>
                  {(monthStats.balance || 0) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthStats.balance || 0))}
                </Text>
                <View style={styles.statsRow}>
                  <Text style={styles.income}>Thu +{formatCurrency(monthStats.income || 0)}</Text>
                  <Text style={styles.expense}>Chi -{formatCurrency(monthStats.expense || 0)}</Text>
                </View>
              </SurfaceCard>
              {isDesktopWeb ? (
                <>
                  <SurfaceCard tone="lowest" style={[styles.statsMiniCard, styles.statsMiniCardWeb]}>
                    <Text style={styles.statsMiniLabel}>Dòng thu</Text>
                    <Text style={[styles.statsMiniValue, { color: COLORS.secondary }]}>{incomeCount}</Text>
                  </SurfaceCard>
                  <SurfaceCard tone="lowest" style={[styles.statsMiniCard, styles.statsMiniCardWeb]}>
                    <Text style={styles.statsMiniLabel}>Dòng chi</Text>
                    <Text style={[styles.statsMiniValue, { color: COLORS.danger }]}>{expenseCount}</Text>
                  </SurfaceCard>
                </>
              ) : null}
            </View>
          ) : null}

          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>$</Text>
              <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
            </View>
          ) : (
            <View style={styles.listShell}>
              {isDesktopWeb ? (
                <View style={styles.listHeader}>
                  <View>
                    <Text style={styles.listTitle}>Nhật ký giao dịch</Text>
                    <Text style={styles.listSub}>Chạm vào một dòng để sửa. Nhấn giữ để xóa.</Text>
                  </View>
                  <View style={styles.listMeta}>
                    <Text style={styles.listMetaText}>{transactions.length}/{total} dòng hiển thị</Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.list}>
              {grouped.map((row, idx) => {
                if (row.type === 'header') {
                  return <Text key={`${row.key}-${idx}`} style={styles.dayHeader}>{row.key}</Text>;
                }

                const tx = row.tx;
                const isThu = tx.type === 'income';
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={[styles.card, isWeb && styles.cardWeb]}
                    onPress={() => navigation.navigate('AddTransaction', { editTx: tx })}
                    onLongPress={() => onXóa(tx)}
                    delayLongPress={500}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${tx.category_color || COLORS.primary}20` }]}>
                      <Text style={styles.iconTxt}>{tx.category_icon || '$'}</Text>
                    </View>
                    <View style={styles.mid}>
                      <Text numberOfLines={1} style={styles.desc}>{tx.description || tx.category_name || 'Giao dịch'}</Text>
                      <Text style={styles.meta}>{formatDateTime(tx.date)}</Text>
                      <View style={styles.walletTag}>
                        <Text style={styles.walletTagTxt}>{tx.wallet_name || 'Sổ'}</Text>
                      </View>
                    </View>
                    <View style={styles.right}>
                      {isDesktopWeb ? (
                        <View style={[styles.typePill, isThu ? styles.typePillThu : styles.typePillChi]}>
                          <Text style={[styles.typePillText, isThu ? styles.typePillTextThu : styles.typePillTextChi]}>
                            {isThu ? 'Thu' : 'Chi'}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[styles.amount, { color: isThu ? COLORS.secondary : COLORS.danger }]}>
                        {isThu ? '+' : '-'}{formatCurrency(tx.amount || 0)}
                      </Text>
                      {tx.image_uri ? (
                        <TouchableOpacity onPress={() => setSelectedImage(tx.image_uri)}>
                          <Ionicons name="image-outline" size={14} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {hasMore ? (
                <TouchableOpacity style={styles.loadMore} onPress={() => loadData(false)} disabled={loadingMore}>
                  {loadingMore ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.loadMoreTxt}>Tải thêm ({total - transactions.length})</Text>}
                </TouchableOpacity>
              ) : null}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {!isEmbedded ? (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddTransaction', { walletId })}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </>
  );

  const imageModal = (
    <Modal visible={!!selectedImage} transparent animationType="fade">
      <TouchableOpacity activeOpacity={1} style={styles.imageOverlay} onPress={() => setSelectedImage(null)}>
        <Image
          source={{ uri: selectedImage ? (selectedImage.startsWith('file://') ? selectedImage : `${FileSystem.documentDirectory}${selectedImage}`) : null }}
          style={styles.fullImage}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
          <Ionicons name="close-circle" size={36} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  if (isDesktopWeb) {
    return (
      <WebDesktopShell
        navigation={navigation}
        routeName="Transactions"
        title={walletName}
        subtitle="Số lượng giao dịch"
        searchPlaceholder="Tìm giao dịch, sổ tiền, mô tả..."
        headerAction={(
          <TouchableOpacity style={styles.webHeaderBtn} onPress={() => navigation.navigate('AddTransaction', { walletId })}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.webHeaderBtnText}>Thêm giao dịch</Text>
          </TouchableOpacity>
        )}
      >
        <View style={styles.root}>
          {screenContent}
          {imageModal}
        </View>
      </WebDesktopShell>
    );
  }

  return (
    <View style={styles.root}>
      {!isEmbedded ? (
        <TopAppBar
          title={walletName}
          subtitle="Số lượng giao dịch"
          onBack={() => navigation.goBack()}
          light
        />
      ) : null}

      {screenContent}
      {imageModal}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentWrap: { width: '100%' },
  contentWrapWeb: { alignSelf: 'center', paddingTop: 20 },
  heroRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4, marginBottom: 12 },
  heroCard: { flex: 1.15 },
  heroEyebrow: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  heroTitle: { marginTop: 8, fontSize: 22, color: COLORS.textPrimary, ...FONTS.bold },
  heroText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  heroStatsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  heroStat: {
    flex: 1,
    minHeight: 82,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surfaceLowest,
    padding: 12,
  },
  heroStatLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  heroStatValue: { marginTop: 8, fontSize: 22, color: COLORS.textPrimary, ...FONTS.black },
  heroNote: { width: 320, justifyContent: 'center' },
  heroNoteEyebrow: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  heroNoteValue: { marginTop: 10, fontSize: 28, ...FONTS.black },
  heroNoteText: { marginTop: 8, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  heroNoteList: { marginTop: 14, gap: 8 },
  heroNoteItem: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.medium },
  statsGrid: { marginHorizontal: 16, marginTop: 8, gap: 10 },
  statsGridWeb: { flexDirection: 'row', alignItems: 'stretch' },
  statsCard: { marginTop: 0 },
  statsCardWeb: { flex: 1.35 },
  statsLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  balance: { fontSize: 30, ...FONTS.black, marginTop: 4 },
  statsRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  income: { fontSize: 12, color: COLORS.secondary, ...FONTS.semibold },
  expense: { fontSize: 12, color: COLORS.danger, ...FONTS.semibold },
  statsMiniCard: { flex: 1, justifyContent: 'center' },
  statsMiniCardWeb: { minHeight: 126 },
  statsMiniLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  statsMiniValue: { marginTop: 10, fontSize: 26, ...FONTS.black },
  empty: { alignItems: 'center', paddingVertical: 88 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { marginTop: 10, fontSize: 16, color: COLORS.textSecondary, ...FONTS.bold },
  listShell: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surfaceLowest,
    overflow: 'hidden',
  },
  listHeader: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listTitle: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  listSub: { marginTop: 4, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  listMeta: {
    minHeight: 38,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listMetaText: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.bold },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  dayHeader: { marginTop: 16, marginBottom: 8, fontSize: 12, color: COLORS.textMuted, ...FONTS.bold },
  card: {
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOW.sm,
  },
  cardWeb: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    minHeight: 82,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 20 },
  mid: { flex: 1 },
  desc: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.semibold },
  meta: { marginTop: 2, fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  walletTag: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceLow,
  },
  walletTagTxt: { fontSize: 10, color: COLORS.textSecondary, ...FONTS.semibold },
  right: { alignItems: 'flex-end', gap: 6 },
  typePill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillThu: { backgroundColor: COLORS.incomeLight },
  typePillChi: { backgroundColor: COLORS.expenseLight },
  typePillText: { fontSize: 10, ...FONTS.bold },
  typePillTextThu: { color: COLORS.secondary },
  typePillTextChi: { color: COLORS.danger },
  amount: { fontSize: 14, ...FONTS.bold },
  loadMore: {
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
  },
  loadMoreTxt: { color: COLORS.primary, ...FONTS.bold },
  webHeaderBtn: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOW.sm,
  },
  webHeaderBtnText: { color: '#fff', ...FONTS.bold, fontSize: 12 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.lg,
  },
  imageOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.94)', alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 52, right: 20 },
});
