import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SHADOW, TYPOGRAPHY, WEB } from '../theme';
import { getWallets } from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function ModulesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWallets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWallets();
      setWallets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadWallets(); }, [loadWallets]));

  const modules = [
    {
      id: 'rental',
      name: 'Nhà trọ',
      desc: 'Quản lý phòng, hợp đồng và hóa đơn',
      icon: 'business-outline',
      color: COLORS.secondary,
      route: 'Rental',
    },
    {
      id: 'trading',
      name: 'Kinh doanh',
      desc: 'Theo dõi sản phẩm, tồn kho và lợi nhuận',
      icon: 'cube-outline',
      color: COLORS.warning,
      route: 'Trading',
    },
    {
      id: 'personal',
      name: 'Tài chính cá nhân',
      desc: 'Quản lý thu chi và giao dịch cá nhân',
      icon: 'wallet-outline',
      color: COLORS.primary,
      route: 'Transactions',
    },
  ];

  const handlePress = (module) => {
    const targetWallet = wallets.find((wallet) => wallet.type === module.id);
    if (targetWallet) {
      navigation.navigate(module.route, { walletId: targetWallet.id, walletName: targetWallet.name });
      return;
    }
    navigation.navigate(module.route);
  };

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb;
  const contentMaxWidth = width >= 1440 ? WEB.contentMax.xl : width >= 1024 ? WEB.contentMax.lg : WEB.contentMax.md;
  const moduleCardBasis = width >= 1320 ? '32%' : width >= 980 ? '49%' : '100%';
  const readyModuleCount = modules.filter((module) => wallets.some((wallet) => wallet.type === module.id)).length;

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? <TopAppBar title="Danh sách module" subtitle="Chọn module" onBack={() => navigation.goBack()} /> : null}

      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroRow, isWeb && styles.heroRowWeb]}>
          <SurfaceCard tone="low" style={styles.introCard}>
            <Text style={styles.introEyebrow}>CỔNG KHÔNG GIAN LÀM VIỆC</Text>
            <Text style={styles.introTitle}>Chọn luồng vận hành phù hợp</Text>
            <Text style={styles.intro}>
              Trang web đã được tổ chức lại theo dạng cổng máy tính. Mỗi module mở với không gian làm việc, dữ liệu và giao diện quản trị riêng.
            </Text>
            <View style={[styles.heroStatRow, isWeb && styles.heroStatRowWeb]}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Module sẵn sàng</Text>
                <Text style={styles.heroStatValue}>{readyModuleCount}/{modules.length}</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Sổ đang hoạt động</Text>
                <Text style={styles.heroStatValue}>{wallets.length}</Text>
              </View>
            </View>
          </SurfaceCard>
          {isWeb ? (
            <SurfaceCard tone="lowest" style={styles.noteCard}>
              <Text style={styles.noteEyebrow}>ĐIỀU HƯỚNG WEB</Text>
              <Text style={styles.noteTitle}>Truy cập module</Text>
              <Text style={styles.noteText}>Khu vực này được bố trí như cổng quản trị. Mỗi module mở với bộ dữ liệu và không gian làm việc riêng.</Text>
            </SurfaceCard>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={[styles.grid, isWeb && styles.gridWeb]}>
            {modules.map((module) => {
              const linkedWallet = wallets.find((wallet) => wallet.type === module.id);
              return (
                <TouchableOpacity key={module.id} activeOpacity={0.85} onPress={() => handlePress(module)} style={isWeb ? { width: moduleCardBasis } : null}>
                  <SurfaceCard style={[styles.moduleCard, isWeb && styles.moduleCardWeb]}>
                    <View style={[styles.iconWrap, { backgroundColor: `${module.color}20` }]}>
                      <Ionicons name={module.icon} size={28} color={module.color} />
                    </View>
                    <View style={styles.info}>
                      {isWeb ? (
                        <View style={[styles.statusPill, linkedWallet ? styles.statusPillReady : styles.statusPillPending]}>
                          <Text style={[styles.statusText, linkedWallet ? styles.statusTextReady : styles.statusTextPending]}>
                            {linkedWallet ? 'Đã kết nối' : 'Chưa khởi tạo'}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.name}>{module.name}</Text>
                      <Text style={styles.desc}>{module.desc}</Text>
                      {isWeb ? (
                        <Text style={styles.metaText}>
                          {linkedWallet ? `Không gian: ${linkedWallet.name}` : 'Nếu chưa có không gian, màn hình thiết lập sẽ mở ra.'}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </SurfaceCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <SurfaceCard tone="low">
          <Text style={styles.footer}>
            Bạn có thể tùy chỉnh danh mục và thiết lập module trong màn hình Cài đặt.
          </Text>
        </SurfaceCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 80, gap: 12 },
  contentWeb: { width: '100%', alignSelf: 'center', paddingTop: 20 },
  heroRow: { gap: 12 },
  heroRowWeb: { flexDirection: 'row', alignItems: 'stretch' },
  introCard: { flex: 1.1 },
  introEyebrow: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  introTitle: { marginTop: 8, fontSize: 20, color: COLORS.textPrimary, ...FONTS.bold },
  intro: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  heroStatRow: { gap: 10, marginTop: 16 },
  heroStatRowWeb: { flexDirection: 'row' },
  heroStatCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surfaceLowest,
    padding: 14,
  },
  heroStatLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  heroStatValue: { marginTop: 8, fontSize: 22, color: COLORS.textPrimary, ...FONTS.black },
  noteCard: { flex: 0.9, justifyContent: 'center' },
  noteEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  noteTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  noteText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  loadingWrap: { paddingVertical: 24 },
  grid: { gap: 12 },
  gridWeb: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moduleCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moduleCardWeb: {
    minHeight: 176,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    ...SHADOW.sm,
  },
  iconWrap: { width: 52, height: 52, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  statusPill: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillReady: { backgroundColor: COLORS.incomeLight },
  statusPillPending: { backgroundColor: COLORS.surfaceLow },
  statusText: { fontSize: 10, ...FONTS.bold },
  statusTextReady: { color: COLORS.secondary },
  statusTextPending: { color: COLORS.textSecondary },
  name: { color: COLORS.textPrimary, ...FONTS.bold, fontSize: 16, marginBottom: 4 },
  desc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  metaText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 11, lineHeight: 17, ...FONTS.medium },
  footer: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
});
