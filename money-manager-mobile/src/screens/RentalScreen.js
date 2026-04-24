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
  const walletName = route?.params?.walletName || 'Quản lý nhà trọ';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [monthlyInvoices, setMonthlyInvoices] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // all, occupied, vacant, debt

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
      setRooms(data || []);

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
      if (!name) { await loadRooms(); return; }
      if (id) await updateRoom(id, name, price, hasAc, people);
      else await addRoom(name, price, hasAc, people, walletId);
      setShowAddRoom(false);
      setEditingRoom(null);
      await loadRooms();
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu phòng');
    }
  };

  const handleTerminate = async (room) => {
    const refundInput = await promptDialog({
      title: 'Terminate contract',
      message: `Xác nhận trả phòng ${room.name}. Nhập số tiền hoàn cọc:`,
      defaultValue: String(room.deposit || 0),
    });
    if (refundInput === null) return;
    try {
      const refundAmount = parseInt(String(refundInput).replace(/[^0-9]/g, ''), 10) || 0;
      await terminateContract(room.contract_id, room.id, refundAmount, walletId);
      setActiveActionRoom(null);
      await loadRooms();
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể chấm dứt');
    }
  };

  const handleRoomAction = (action) => {
    const room = activeActionRoom;
    if (!room) return;
    setActiveActionRoom(null);
    setTimeout(() => {
      if (action === 'invoice') setShowCreateInvoice(room);
      if (action === 'contract') { setEditingContract(room); setShowAddTenant(room); }
      if (action === 'history') navigation.navigate('Transactions', { walletId, walletName: `Phòng ${room.name}` });
    }, 200);
  };

  // KPI Calculations
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const vacantCount = rooms.length - occupiedCount;
  const occupiedRentSum = rooms.filter((r) => r.status === 'occupied').reduce((sum, r) => sum + Number(r.price || 0), 0);
  const monthlyInvoiceEntries = Object.values(monthlyInvoices);
  const pendingInvoiceCount = monthlyInvoiceEntries.filter((inv) => inv && inv.status !== 'paid').length;
  const paidInvoiceCount = monthlyInvoiceEntries.filter((inv) => inv && inv.status === 'paid').length;

  // Filter Logic
  const filteredRooms = rooms.filter((r) => {
    const matchSearch = String(r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        String(r.tenant_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    if (filterTab === 'occupied') return r.status === 'occupied';
    if (filterTab === 'vacant') return r.status !== 'occupied';
    if (filterTab === 'debt') {
      const invoice = monthlyInvoices[r.id];
      return r.status === 'occupied' && invoice && invoice.status !== 'paid';
    }
    return true; // filterTab === 'all'
  });

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width >= 1024 && !isEmbedded;
  const contentMaxWidth = width >= 1440 ? 1280 : width >= 1024 ? 1120 : 960;
  
  // Cross-browser & React Native valid accurate sizing grid logic
  const GAP = 16;
  const columns = width >= 1360 ? 4 : width >= 1080 ? 3 : width >= 760 ? 2 : 1;
  const safeContainerWidth = isWeb ? Math.min(width - (width > 760 ? 64 : 32), contentMaxWidth) : width - 32;
  const cardWidth = columns === 1 ? '100%' : (safeContainerWidth - (columns - 1) * GAP) / columns;

  if (loading && rooms.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.root}>
      {!isEmbedded && !isDesktopWeb ? (
        <TopAppBar
          title={walletName}
          subtitle="Quản lý nhà trọ"
          onBack={() => navigation.goBack()}
          rightIcon="add"
          onRightPress={() => { setEditingRoom(null); setShowAddRoom(true); }}
        />
      ) : null}

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRooms(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.container, { maxWidth: contentMaxWidth }]}>
          
          {/* KPI Dashboard */}
          <View style={styles.kpiDashboard}>
            <View style={[styles.kpiCard, { flex: 1, backgroundColor: COLORS.surfaceLowest }]}>
              <Ionicons name="home-outline" size={24} color={COLORS.primary} style={styles.kpiIcon} />
              <View>
                <Text style={styles.kpiValue}>{occupiedCount} <Text style={styles.kpiSubValue}>/ {rooms.length}</Text></Text>
                <Text style={styles.kpiLabel}>Phòng cho thuê</Text>
              </View>
            </View>
            <View style={[styles.kpiCard, { flex: 1, backgroundColor: COLORS.surfaceLowest }]}>
              <Ionicons name="cash-outline" size={24} color={COLORS.success} style={styles.kpiIcon} />
              <View>
                <Text style={[styles.kpiValue, { color: COLORS.success }]}>{formatCurrency(occupiedRentSum)}</Text>
                <Text style={styles.kpiLabel}>Doanh thu hàng tháng</Text>
              </View>
            </View>
            {isWeb && (
              <>
                <View style={[styles.kpiCard, { flex: 1, backgroundColor: COLORS.surfaceLowest }]}>
                  <Ionicons name="alert-circle-outline" size={24} color={pendingInvoiceCount > 0 ? COLORS.warning : COLORS.textMuted} style={styles.kpiIcon} />
                  <View>
                    <Text style={[styles.kpiValue, { color: pendingInvoiceCount > 0 ? COLORS.warning : COLORS.textPrimary }]}>{pendingInvoiceCount}</Text>
                    <Text style={styles.kpiLabel}>Hóa đơn chờ thu</Text>
                  </View>
                </View>
                <View style={[styles.kpiCard, { flex: 1, backgroundColor: COLORS.surfaceLowest }]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} style={styles.kpiIcon} />
                  <View>
                    <Text style={styles.kpiValue}>{paidInvoiceCount}</Text>
                    <Text style={styles.kpiLabel}>Hóa đơn đã thu</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Action Toolbar */}
          <SurfaceCard tone="lowest" style={styles.toolbarLayer}>
            <View style={styles.toolbarHeader}>
              <Text style={styles.sectionTitle}>Danh sách phòng</Text>
              <View style={styles.actionGroup}>
                {isWeb && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('TenantLanding')}>
                      <Ionicons name="globe-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.actionBtnTextOutline}>Landing Page</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSoft]} onPress={() => navigation.navigate('SmartBatchBilling')}>
                      <Ionicons name="flash" size={16} color={COLORS.primary} />
                      <Text style={styles.actionBtnTextSoft}>Hóa đơn hàng loạt</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => { setEditingRoom(null); setShowAddRoom(true); }}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.actionBtnTextPrimary}>Thêm phòng</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchRow}>
              <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Tìm theo tên phòng, tên khách..." style={{ flex: 1 }} />
            </View>

            <View style={styles.tabsRow}>
              <TouchableOpacity onPress={() => setFilterTab('all')} style={[styles.tab, filterTab === 'all' && styles.tabActive]}>
                <Text style={[styles.tabText, filterTab === 'all' && styles.tabTextActive]}>Tất cả ({rooms.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFilterTab('occupied')} style={[styles.tab, filterTab === 'occupied' && styles.tabActive]}>
                <Text style={[styles.tabText, filterTab === 'occupied' && styles.tabTextActive]}>Đang thuê ({occupiedCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFilterTab('vacant')} style={[styles.tab, filterTab === 'vacant' && styles.tabActive]}>
                <Text style={[styles.tabText, filterTab === 'vacant' && styles.tabTextActive]}>Trống ({vacantCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFilterTab('debt')} style={[styles.tab, filterTab === 'debt' && styles.tabActive]}>
                <Text style={[styles.tabText, filterTab === 'debt' && styles.tabTextActive]}>Chờ thu tiền ({pendingInvoiceCount})</Text>
                {pendingInvoiceCount > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pendingInvoiceCount}</Text></View>}
              </TouchableOpacity>
            </View>
          </SurfaceCard>

          {/* Room Grid */}
          {filteredRooms.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color={COLORS.borderStrong} />
              <Text style={styles.emptyTitle}>Không có phòng nào phù hợp</Text>
              <Text style={styles.emptyText}>Thử thay đổi bộ lọc hoặc xóa từ khóa tìm kiếm để xem các phòng khác.</Text>
            </View>
          ) : (
            <View style={styles.roomGrid}>
              {filteredRooms.map((room) => {
                const isOccupied = room.status === 'occupied';
                const invoice = monthlyInvoices[room.id];
                const isPaid = invoice?.status === 'paid';
                return (
                  <TouchableOpacity
                    key={room.id}
                    activeOpacity={isOccupied ? 0.7 : 1}
                    style={[styles.roomCard, { width: cardWidth }]}
                    onPress={() => isOccupied && setActiveActionRoom(room)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.roomNameBadge, !isOccupied && { backgroundColor: COLORS.surfaceHigh }]}>
                          <Text style={[styles.roomNameText, !isOccupied && { color: COLORS.textSecondary }]}>P.{room.name}</Text>
                        </View>
                        {isOccupied ? (
                           <View style={[styles.statusPill, { backgroundColor: COLORS.primaryLight }]}>
                             <Text style={[styles.statusPillText, { color: COLORS.primaryDark }]}>Đang thuê</Text>
                           </View>
                        ) : (
                           <View style={[styles.statusPill, { backgroundColor: COLORS.surfaceHigh }]}>
                             <Text style={[styles.statusPillText, { color: COLORS.textSecondary }]}>Trống</Text>
                           </View>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => { setEditingRoom(room); setShowAddRoom(true); }} style={styles.editBtn}>
                        <Ionicons name="pencil" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardBody}>
                      {isOccupied ? (
                        <>
                          <Text style={styles.tenantName} numberOfLines={1}>{room.tenant_name || 'Người thuê'}</Text>
                          <Text style={styles.roomPrice}>{formatCurrency(room.price || 0)}</Text>
                          
                          <View style={styles.infoStrip}>
                             <Ionicons name="call-outline" size={14} color={COLORS.textMuted} />
                             <Text style={styles.infoText}>{room.tenant_phone || 'Không có sđt'}</Text>
                          </View>

                          <View style={styles.invoiceWrap}>
                            <View style={[styles.invoiceAlertPill, { backgroundColor: invoice ? (isPaid ? COLORS.successLight : COLORS.warningLight) : COLORS.surfaceContainer }]}>
                               <View style={[styles.dot, { backgroundColor: invoice ? (isPaid ? COLORS.success : COLORS.warning) : COLORS.textMuted }]} />
                               <Text style={[styles.invoiceAlertText, { color: invoice ? (isPaid ? COLORS.success : COLORS.warning) : COLORS.textSecondary }]}>
                                 {!invoice ? 'Chưa lập hóa đơn' : isPaid ? 'Đã thanh toán' : 'Chờ thu tiền'}
                               </Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <View style={styles.vacantBody}>
                          <View style={styles.vacantIconWrap}>
                             <Ionicons name="home-outline" size={32} color={COLORS.borderStrong} />
                          </View>
                          <Text style={styles.vacantPrice}>{formatCurrency(room.price || 0)}/th</Text>
                          <TouchableOpacity style={styles.rentBtn} onPress={() => setShowAddTenant(room)}>
                            <Ionicons name="person-add" size={16} color="#fff" />
                            <Text style={styles.rentBtnText}>Cho thuê phòng</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button for Mobile */}
      {!isDesktopWeb && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => { setEditingRoom(null); setShowAddRoom(true); }}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Shared Modals */}
      <AddRoomBottomSheet 
        visible={showAddRoom} 
        room={editingRoom} 
        onClose={() => { setShowAddRoom(false); setEditingRoom(null); }} 
        onSave={handleAddRoom} 
        deleteRoom={deleteRoom} 
      />
      <AddTenantContractSheet visible={Boolean(showAddTenant)} room={showAddTenant} editingContract={editingContract} onClose={() => { setShowAddTenant(null); setEditingContract(null); }} onSave={(d) => { setContractPreviewData(d); setContractPreviewRoom(showAddTenant); setContractPreviewEditing(editingContract); setShowAddTenant(null); setEditingContract(null); setShowContractPreview(true); }} />
      <ContractPreviewModal visible={showContractPreview} data={contractPreviewData} room={contractPreviewRoom} onClose={() => { setShowContractPreview(false); setContractPreviewData(null); setContractPreviewRoom(null); setContractPreviewEditing(null); }} onConfirm={async () => { try { if (!contractPreviewData) return; const { tenantName, phone, idCard, address, startDate, deposit, serviceIds } = contractPreviewData; if (contractPreviewEditing) { await updateTenant(contractPreviewEditing.tenant_id, { name: tenantName, phone, idCard, address }); await updateContract(contractPreviewEditing.contract_id, { startDate, deposit, serviceIds }); } else { const tId = await addTenant(tenantName, phone, idCard, address); await addContract(contractPreviewData.roomId, tId, startDate, deposit, serviceIds); } await loadRooms(); setShowContractPreview(false); setContractPreviewData(null); setContractPreviewRoom(null); setContractPreviewEditing(null); } catch (e) { Alert.alert('Lỗi', e.message); } }} />
      <CreateInvoiceSheet visible={Boolean(showCreateInvoice)} room={showCreateInvoice} onClose={() => setShowCreateInvoice(null)} onSaveSuccessful={() => { setShowCreateInvoice(null); loadRooms(); }} />
      <RoomActionSheet visible={Boolean(activeActionRoom)} room={activeActionRoom} hasInvoice={!!(activeActionRoom && monthlyInvoices[activeActionRoom.id])} onClose={() => setActiveActionRoom(null)} onAction={handleRoomAction} onTerminate={() => handleTerminate(activeActionRoom)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
    paddingTop: 24,
    gap: 20,
  },
  
  // KPI Dashboards
  kpiDashboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 14,
    ...SHADOW.sm,
  },
  kpiIcon: {
    opacity: 0.8,
  },
  kpiValue: {
    fontSize: 24,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    lineHeight: 28,
  },
  kpiSubValue: {
    fontSize: 16,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },
  kpiLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    marginTop: 2,
  },

  // Toolbar Layer
  toolbarLayer: {
    padding: 20,
    gap: 16,
  },
  toolbarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    ...SHADOW.sm,
  },
  actionBtnTextPrimary: { color: '#fff', fontSize: 13, ...FONTS.bold },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
  },
  actionBtnTextOutline: { color: COLORS.primary, fontSize: 13, ...FONTS.bold },
  actionBtnSoft: {
    backgroundColor: COLORS.surfaceContainer,
  },
  actionBtnTextSoft: { color: COLORS.primary, fontSize: 13, ...FONTS.bold },
  
  searchRow: {
    flexDirection: 'row',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    paddingBottom: 2,
    flexWrap: 'wrap', // Allow wrap on small screens
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.semibold,
  },
  tabTextActive: {
    color: COLORS.primary,
    ...FONTS.bold,
  },
  tabBadge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeText: {
    // Exact sizing for badges
    fontSize: 10,
    color: '#fff',
    ...FONTS.bold,
  },

  // Room Grid
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
  },
  roomCard: {
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainer,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomNameBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  roomNameText: { color: '#fff', fontSize: 13, ...FONTS.bold },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusPillText: { fontSize: 11, ...FONTS.bold },
  editBtn: {
    padding: 4,
  },

  cardBody: {
    padding: 16,
    minHeight: 140, // consistent height
  },
  tenantName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 4,
  },
  roomPrice: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 12,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  invoiceWrap: {
    marginTop: 'auto',
    paddingTop: 12,
  },
  invoiceAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  invoiceAlertText: {
    fontSize: 12,
    ...FONTS.bold,
  },

  // Vacant State
  vacantBody: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  vacantIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vacantPrice: { fontSize: 13, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 12 },
  rentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md },
  rentBtnText: { color: '#fff', fontSize: 12, ...FONTS.bold },

  // Empty Search/Filter State
  emptyWrap: {
    minHeight: 280,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 320,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.lg,
    zIndex: 999,
  },
});
