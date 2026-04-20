import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { formatCurrency } from '../utils/format';
import {
  addContract,
  addRoom,
  addTenant,
  deleteRoom,
  getInvoices,
  getRooms,
  terminateContract,
  updateContract,
  updateRoom,
  updateTenant,
} from '../database/queries';
import AddRoomBottomSheet from '../components/AddRoomBottomSheet';
import AddTenantContractSheet from '../components/AddTenantContractSheet';
import ContractPreviewModal from '../components/ContractPreviewModal';
import CreateInvoiceSheet from '../components/CreateInvoiceSheet';
import RoomActionSheet from '../components/RoomActionSheet';
import SearchBar from '../components/SearchBar';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import { promptDialog } from '../utils/dialogs';

export default function RentalScreen({ route, navigation, walletId: propWalletId, isEmbedded }) {
  const { width } = useWindowDimensions();
  const walletId = propWalletId || route?.params?.walletId;
  const walletName = route?.params?.walletName || 'Quan ly nha tro';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [occupiedCount, setOccupiedCount] = useState(0);
  const [occupiedRentSum, setOccupiedRentSum] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthlyInvoices, setMonthlyInvoices] = useState({});

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showAddTenant, setShowAddTenant] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(null);
  const [activeActionRoom, setActiveActionRoom] = useState(null);

  const [showContractPreview, setShowContractPreview] = useState(false);
  const [contractPreviewData, setContractPreviewData] = useState(null);
  const [contractPreviewRoom, setContractPreviewRoom] = useState(null);
  const [contractPreviewEditing, setContractPreviewEditing] = useState(null);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRooms(walletId);
      const rows = data || [];
      setRooms(rows);

      const occupied = rows.filter((r) => r.status === 'occupied');
      setOccupiedCount(occupied.length);
      setOccupiedRentSum(occupied.reduce((sum, r) => sum + Number(r.price || 0), 0));

      const now = new Date();
      const currentInvoices = await getInvoices(now.getMonth() + 1, now.getFullYear());
      const invMap = {};
      (currentInvoices || []).forEach((inv) => {
        invMap[inv.room_id] = inv;
      });
      setMonthlyInvoices(invMap);
    } catch (e) {
      console.error(e);
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [walletId]);

  useFocusEffect(useCallback(() => { loadRooms(); }, [loadRooms]));

  const handleAddRoom = async (id, name, price, hasAc, people) => {
    try {
      if (!name) {
        await loadRooms();
        return;
      }
      if (id) {
        await updateRoom(id, name, price, hasAc, people);
      } else {
        await addRoom(name, price, hasAc, people, walletId);
      }
      setShowAddRoom(false);
      setEditingRoom(null);
      await loadRooms();
    } catch (e) {
      Alert.alert('Loi', e.message || 'Khong the luu phong');
    }
  };

  const handleTerminate = (room) => {
    (async () => {
      const refundInput = await promptDialog({
        title: 'Thanh ly hop dong',
        message: `Xac nhan tra phong ${room.name}. Nhap so tien hoan coc:`,
        defaultValue: String(room.deposit || 0),
      });
      if (refundInput === null) return;

      try {
        const refundAmount = parseInt(String(refundInput).replace(/[^0-9]/g, ''), 10) || 0;
        await terminateContract(room.contract_id, room.id, refundAmount, walletId);
        setActiveActionRoom(null);
        await loadRooms();
      } catch (e) {
        Alert.alert('Loi', e.message || 'Khong the thanh ly');
      }
    })();
  };

  const handleRoomAction = (action) => {
    const room = activeActionRoom;
    if (!room) return;
    setActiveActionRoom(null);
    setTimeout(() => {
      if (action === 'invoice') setShowCreateInvoice(room);
      if (action === 'contract') {
        setEditingContract(room);
        setShowAddTenant(room);
      }
      if (action === 'history') navigation.navigate('Transactions', { walletId, walletName: `Phong ${room.name}` });
    }, 200);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const filteredRooms = rooms.filter(
    (r) =>
      String(r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.tenant_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const monthlyInvoiceEntries = Object.values(monthlyInvoices);
  const pendingInvoiceCount = monthlyInvoiceEntries.filter((invoice) => invoice && invoice.status !== 'paid').length;
  const paidInvoiceCount = monthlyInvoiceEntries.filter((invoice) => invoice && invoice.status === 'paid').length;
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && !isEmbedded;
  const contentMaxWidth = width >= 1440 ? 1280 : width >= 1024 ? 1120 : 960;
  const roomCardBasis =
    width >= 1360 ? '24%' : width >= 1080 ? '32%' : width >= 760 ? '48.5%' : '100%';

  return (
    <View style={styles.root}>
      {!isEmbedded && !isDesktopWeb ? (
        <TopAppBar
          title={walletName}
          subtitle="Quan ly nha tro"
          onBack={() => navigation.goBack()}
          rightIcon="add"
          onRightPress={() => { setEditingRoom(null); setShowAddRoom(true); }}
        />
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRooms(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={[styles.container, isWeb && styles.containerWeb, { maxWidth: contentMaxWidth }]}>
          <View style={[styles.heroBlock, isWeb && styles.heroBlockWeb]}>
            <SurfaceCard tone="low" style={[styles.kpiCard, isWeb && styles.kpiCardWeb]}>
              <View style={styles.kpiCol}>
                <Text style={styles.kpiLabel}>Phong co khach</Text>
                <Text style={styles.kpiValue}>{occupiedCount}/{rooms.length}</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiCol}>
                <Text style={styles.kpiLabel}>Doanh thu du kien</Text>
                <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{formatCurrency(occupiedRentSum)}</Text>
              </View>
              {isWeb ? (
                <>
                  <View style={styles.kpiDivider} />
                  <View style={styles.kpiCol}>
                    <Text style={styles.kpiLabel}>Phong trong</Text>
                    <Text style={styles.kpiValue}>{Math.max(rooms.length - occupiedCount, 0)}</Text>
                  </View>
                  <View style={styles.kpiDivider} />
                  <View style={styles.kpiCol}>
                    <Text style={styles.kpiLabel}>Bill cho thu</Text>
                    <Text style={styles.kpiValue}>{pendingInvoiceCount}</Text>
                  </View>
                </>
              ) : null}
            </SurfaceCard>

            {isWeb ? (
              <SurfaceCard tone="lowest" style={styles.noticeCard}>
                <Text style={styles.noticeEyebrow}>QUAN TRI DAY PHONG</Text>
                <Text style={styles.noticeTitle}>Luong van hanh tren web</Text>
                <Text style={styles.noticeText}>Chon phong de thao tac hop dong, lap hoa don va theo doi trang thai thu tien. UI duoc bo tri lai theo kieu dashboard quan ly, khong thay doi chuc nang.</Text>
              </SurfaceCard>
            ) : null}
          </View>

          <View style={[styles.summaryStrip, isWeb && styles.summaryStripWeb]}>
            <SurfaceCard tone="lowest" style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Bill da thu trong thang</Text>
              <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>{paidInvoiceCount}</Text>
            </SurfaceCard>
            <SurfaceCard tone="lowest" style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Phong dang hien thi</Text>
              <Text style={styles.summaryValue}>{filteredRooms.length}</Text>
            </SurfaceCard>
          </View>

          <View style={[styles.toolbar, isWeb && styles.toolbarWeb]}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tim phong, ten khach..."
              style={styles.searchBar}
            />
            {isWeb ? (
              <View style={styles.toolbarActions}>
                <View style={styles.toolbarMeta}>
                  <Text style={styles.toolbarMetaText}>{filteredRooms.length} phong hien thi</Text>
                </View>
                <TouchableOpacity style={styles.toolbarActionBtn} onPress={() => { setEditingRoom(null); setShowAddRoom(true); }}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.toolbarActionBtnText}>Them phong</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={[styles.billingActions, isWeb && styles.billingActionsWeb]}>
            <TouchableOpacity
              style={[styles.billingActionCard, styles.billingActionPrimary]}
              onPress={() => navigation.navigate('Invoices')}
            >
              <View style={styles.billingActionIcon}>
                <Ionicons name="receipt-outline" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.billingActionTitle}>Lap hoa don thang</Text>
                <Text style={styles.billingActionText}>Vao man hoa don de tao bill tung phong theo thang.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.billingActionCard}
              onPress={() => navigation.navigate('SmartBatchBilling')}
            >
              <View style={[styles.billingActionIcon, styles.billingActionIconSoft]}>
                <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
              <Text style={styles.billingActionTitleDark}>Lap hoa don hang loat</Text>
              <Text style={styles.billingActionTextDark}>Mo luong batch billing neu can xu ly nhieu phong cung luc.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          </View>

          <View style={[styles.sectionRow, isWeb && styles.sectionRowWeb]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Danh sach phong</Text>
              <Text style={styles.sectionText}>Theo doi trang thai thue, bill thang va thao tac hop dong ngay tren tung phong.</Text>
            </View>
            {isWeb ? (
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>{filteredRooms.length} phong</Text>
              </View>
            ) : null}
          </View>

          {filteredRooms.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Khong tim thay phong phu hop</Text>
              <Text style={styles.emptyText}>Thu doi tu khoa tim kiem hoac bo loc de xem lai toan bo danh sach phong.</Text>
            </View>
          ) : (
            <View style={styles.roomGrid}>
              {filteredRooms.map((room) => {
              const isOccupied = room.status === 'occupied';
              const invoice = monthlyInvoices[room.id];
              const isPaid = invoice?.status === 'paid';
              const invoiceLabel = !invoice ? 'Chua lap bill' : isPaid ? 'Bill da thu' : 'Bill cho thu';
              return (
                <TouchableOpacity
                  key={room.id}
                  activeOpacity={isOccupied ? 0.85 : 1}
                  style={[styles.roomCard, isWeb && styles.roomCardWeb, { width: roomCardBasis }]}
                  onPress={() => isOccupied && setActiveActionRoom(room)}
                >
                  <View style={styles.roomTop}>
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomBadgeText}>P{room.name}</Text>
                    </View>
                    <View style={styles.roomTopActions}>
                      {isWeb ? (
                        <View style={[styles.roomStatePill, { backgroundColor: isOccupied ? COLORS.primaryLight : COLORS.surfaceLow }]}>
                          <Text style={[styles.roomStateText, { color: isOccupied ? COLORS.primaryDark : COLORS.textMuted }]}>
                            {isOccupied ? 'Dang thue' : 'Phong trong'}
                          </Text>
                        </View>
                      ) : null}
                      <TouchableOpacity onPress={() => { setEditingRoom(room); setShowAddRoom(true); }}>
                        <Ionicons name="pencil" size={14} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isOccupied ? (
                    <>
                      <Text numberOfLines={1} style={styles.tenant}>{room.tenant_name || 'Khach thue'}</Text>
                      <Text style={styles.roomPrice}>{formatCurrency(room.price || 0)}</Text>
                      {isWeb ? (
                        <View style={styles.infoStack}>
                          <Text style={styles.infoLine}>SDT: {room.tenant_phone || 'Chua cap nhat'}</Text>
                          <Text style={styles.infoLine}>Nguoi o: {room.num_people || 1}</Text>
                        </View>
                      ) : null}
                      {isWeb ? (
                        <View style={styles.invoiceRow}>
                          <View style={[styles.invoicePill, { backgroundColor: invoice ? (isPaid ? COLORS.successLight : COLORS.warningLight) : COLORS.surfaceLow }]}>
                            <Text style={[styles.invoicePillText, { color: invoice ? (isPaid ? COLORS.secondary : COLORS.warning) : COLORS.textMuted }]}>{invoiceLabel}</Text>
                          </View>
                        </View>
                      ) : null}
                      <View style={styles.statusRow}>
                        <View style={[styles.dot, { backgroundColor: isPaid ? COLORS.secondary : COLORS.warning }]} />
                        <Text style={styles.statusText}>{isPaid ? 'Da thu' : 'Cho thu'}</Text>
                      </View>
                      {isWeb ? <Text style={styles.cardHint}>Nhan vao the phong de mo thao tac hop dong, lich su va lap bill.</Text> : null}
                    </>
                  ) : (
                    <>
                      {isWeb ? <Text style={styles.emptyRoomText}>Phong san sang de tao hop dong moi.</Text> : null}
                      <TouchableOpacity style={styles.rentBtn} onPress={() => setShowAddTenant(room)}>
                        <Ionicons name="person-add" size={16} color={COLORS.primary} />
                        <Text style={styles.rentBtnText}>Cho thue ngay</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
            </View>
          )}
        </View>
      </ScrollView>

      <AddRoomBottomSheet
        visible={showAddRoom}
        room={editingRoom}
        onClose={() => setShowAddRoom(false)}
        onSave={handleAddRoom}
        deleteRoom={deleteRoom}
      />

      <AddTenantContractSheet
        visible={Boolean(showAddTenant)}
        room={showAddTenant}
        editingContract={editingContract}
        onClose={() => { setShowAddTenant(null); setEditingContract(null); }}
        onSave={(data) => {
          setContractPreviewData(data);
          setContractPreviewRoom(showAddTenant);
          setContractPreviewEditing(editingContract);
          setShowAddTenant(null);
          setEditingContract(null);
          setShowContractPreview(true);
        }}
      />

      <ContractPreviewModal
        visible={showContractPreview}
        data={contractPreviewData}
        room={contractPreviewRoom}
        onClose={() => {
          setShowContractPreview(false);
          setContractPreviewData(null);
          setContractPreviewRoom(null);
          setContractPreviewEditing(null);
        }}
        onConfirm={async () => {
          try {
            if (!contractPreviewData) return;
            const { tenantName, phone, idCard, address, startDate, deposit, serviceIds } = contractPreviewData;
            if (contractPreviewEditing) {
              await updateTenant(contractPreviewEditing.tenant_id, { name: tenantName, phone, idCard, address });
              await updateContract(contractPreviewEditing.contract_id, { startDate, deposit, serviceIds });
            } else {
              const tenantId = await addTenant(tenantName, phone, idCard, address);
              await addContract(contractPreviewData.roomId, tenantId, startDate, deposit, serviceIds);
            }
            await loadRooms();
            setShowContractPreview(false);
            setContractPreviewData(null);
            setContractPreviewRoom(null);
            setContractPreviewEditing(null);
          } catch (e) {
            Alert.alert('Loi', e.message || 'Khong the luu hop dong');
          }
        }}
      />

      <CreateInvoiceSheet
        visible={Boolean(showCreateInvoice)}
        room={showCreateInvoice}
        onClose={() => setShowCreateInvoice(null)}
        onSaveSuccessful={() => {
          setShowCreateInvoice(null);
          loadRooms();
        }}
      />

      <RoomActionSheet
        visible={Boolean(activeActionRoom)}
        room={activeActionRoom}
        hasInvoice={!!(activeActionRoom && monthlyInvoices[activeActionRoom.id])}
        onClose={() => setActiveActionRoom(null)}
        onAction={handleRoomAction}
        onTerminate={() => handleTerminate(activeActionRoom)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 16, gap: 12 },
  containerWeb: { width: '100%', alignSelf: 'center', paddingTop: 20 },
  heroBlock: { gap: 12 },
  heroBlockWeb: { flexDirection: 'row', alignItems: 'stretch' },
  kpiCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiCardWeb: { flex: 1.2 },
  kpiCol: { flex: 1 },
  kpiDivider: { width: 1, height: 36, backgroundColor: COLORS.border, marginHorizontal: 10 },
  kpiLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  kpiValue: { marginTop: 4, fontSize: 20, color: COLORS.textPrimary, ...FONTS.bold },
  noticeCard: { flex: 0.95, justifyContent: 'center' },
  noticeEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  noticeTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  noticeText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  toolbar: { gap: 10 },
  toolbarWeb: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1 },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolbarMeta: {
    minWidth: 150,
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  toolbarMetaText: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold },
  toolbarActionBtn: {
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SHADOW.sm,
  },
  toolbarActionBtnText: { color: '#fff', fontSize: 12, ...FONTS.bold },
  summaryStrip: { gap: 10 },
  summaryStripWeb: { flexDirection: 'row', alignItems: 'stretch' },
  summaryCard: { flex: 1 },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  summaryValue: { marginTop: 6, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  billingActions: { gap: 10 },
  billingActionsWeb: { flexDirection: 'row', alignItems: 'stretch' },
  billingActionCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOW.sm,
  },
  billingActionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  billingActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingActionIconSoft: {
    backgroundColor: COLORS.primaryLight,
  },
  billingActionTitle: { color: '#fff', fontSize: 14, ...FONTS.bold },
  billingActionText: { marginTop: 4, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 18, ...FONTS.medium },
  billingActionTitleDark: { color: COLORS.textPrimary, fontSize: 14, ...FONTS.bold },
  billingActionTextDark: { marginTop: 4, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, ...FONTS.medium },
  sectionRow: { gap: 10 },
  sectionRowWeb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  sectionText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  sectionPill: {
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionPillText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  emptyWrap: {
    minHeight: 220,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: { marginTop: 12, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  emptyText: { marginTop: 8, maxWidth: 420, textAlign: 'center', fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  roomCard: {
    minHeight: 150,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.sm,
  },
  roomCardWeb: {
    minHeight: 210,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  roomTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  roomTopActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roomBadge: { borderRadius: 8, backgroundColor: COLORS.surfaceLow, paddingHorizontal: 9, paddingVertical: 4 },
  roomBadgeText: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.bold },
  roomStatePill: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  roomStateText: { fontSize: 10, ...FONTS.bold },
  tenant: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.semibold },
  roomPrice: { marginTop: 4, fontSize: 16, color: COLORS.secondary, ...FONTS.bold },
  infoStack: { marginTop: 10, gap: 4 },
  infoLine: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  invoiceRow: { marginTop: 10 },
  invoicePill: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  invoicePillText: { fontSize: 10, ...FONTS.bold },
  statusRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  cardHint: { marginTop: 10, fontSize: 11, lineHeight: 16, color: COLORS.textMuted, ...FONTS.medium },
  emptyRoomText: { marginTop: 10, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  rentBtn: {
    marginTop: 20,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  rentBtnText: { fontSize: 12, color: COLORS.primary, ...FONTS.bold },
});
