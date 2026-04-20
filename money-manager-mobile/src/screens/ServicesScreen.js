import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { formatCurrency } from '../utils/format';
import { addService, deleteService, getServices, updateService } from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import { confirmDialog } from '../utils/dialogs';

const SERVICE_DESCRIPTIONS = {
  metered: 'Tinh theo dong ho',
  meter: 'Tinh theo dong ho',
  fixed: 'Phi co dinh',
  per_person: 'Tinh theo nguoi',
};

const SERVICE_TYPES = [
  { key: 'fixed', label: 'Co dinh', icon: 'ðŸ“Œ' },
  { key: 'metered', label: 'Dong ho', icon: 'ðŸ“Š' },
  { key: 'per_person', label: 'Theo nguoi', icon: 'ðŸ‘¥' },
];

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export default function ServicesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editPriceAc, setEditPriceAc] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('fixed');
  const [newPrice, setNewPrice] = useState('');
  const [newPriceAc, setNewPriceAc] = useState('');
  const [newUnit, setNewUnit] = useState('thang');
  const [newIcon, setNewIcon] = useState('âš™ï¸');

  const loadServices = useCallback(async () => {
    try {
      const rows = await getServices();
      setServices(rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadServices(); }, [loadServices]));

  const startEdit = (svc) => {
    setEditing(svc.id);
    setEditPrice(String(Math.round(svc.unit_price || 0)));
    setEditPriceAc(String(Math.round(svc.unit_price_ac || 0)));
  };

  const saveEdit = async (svc) => {
    const price = parseInt(editPrice.replace(/[^0-9]/g, ''), 10);
    const priceAc = parseInt(editPriceAc.replace(/[^0-9]/g, ''), 10) || 0;
    if (!price || price < 1) {
      Alert.alert('Loi', 'Gia khong hop le');
      return;
    }
    await updateService(svc.id, { unitPrice: price, unitPriceAc: priceAc, active: true });
    setEditing(null);
    loadServices();
  };

  const handleDelete = (svc) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xoa dich vu',
        message: `Xoa ${svc.name}?`,
        confirmText: 'Xoa',
      });
      if (!confirmed) return;
      await deleteService(svc.id);
      loadServices();
    })();
  };

  const handleAddService = async () => {
    if (!newName.trim()) {
      Alert.alert('Loi', 'Nhap ten dich vu');
      return;
    }
    const price = parseInt(newPrice.replace(/[^0-9]/g, ''), 10);
    if (!price || price < 1) {
      Alert.alert('Loi', 'Gia khong hop le');
      return;
    }
    const priceAc = parseInt(newPriceAc.replace(/[^0-9]/g, ''), 10) || 0;

    await addService({
      name: newName.trim(),
      type: newType,
      unitPrice: price,
      unitPriceAc: priceAc,
      unit: newUnit.trim() || 'thang',
      icon: newIcon || 'âš™ï¸',
    });

    setShowAddModal(false);
    setNewName('');
    setNewType('fixed');
    setNewPrice('');
    setNewPriceAc('');
    setNewUnit('thang');
    setNewIcon('âš™ï¸');
    loadServices();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb;
  const contentMaxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;
  const serviceCardBasis = width >= 1320 ? '32%' : width >= 900 ? '48.5%' : '100%';
  const fixedServices = services.filter((svc) => svc.type === 'fixed' && !normalizeText(svc.name).includes('nuoc'));
  const meteredServices = services.filter((svc) => svc.type === 'metered' || svc.type === 'meter');
  const perPersonServices = services.filter((svc) => svc.type === 'per_person' || normalizeText(svc.name).includes('nuoc'));
  const monthlyFixedTotal = fixedServices.reduce((sum, svc) => sum + Number(svc.unit_price || 0), 0);

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? (
        <TopAppBar
          title="Dich vu nha tro"
          subtitle="Cau hinh don gia"
          onBack={() => navigation.goBack()}
          rightIcon="add"
          onRightPress={() => setShowAddModal(true)}
          light
        />
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, isWeb && styles.containerWeb, { maxWidth: contentMaxWidth }]}>
          <View style={[styles.heroRow, isWeb && styles.heroRowWeb]}>
            <SurfaceCard tone="low" style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>DANH MUC DICH VU</Text>
              <Text style={styles.heroTitle}>Bang gia van hanh nha tro</Text>
              <Text style={styles.heroText}>Quan ly gia dien, nuoc, wifi, rac va cac phi phat sinh theo bo cuc desktop de doi soat nhanh tren website.</Text>

              <View style={[styles.heroStats, isWeb && styles.heroStatsWeb]}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Tong dich vu</Text>
                  <Text style={styles.heroStatValue}>{services.length}</Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Phi co dinh</Text>
                  <Text style={styles.heroStatValue}>{fixedServices.length}</Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Theo dong ho</Text>
                  <Text style={styles.heroStatValue}>{meteredServices.length}</Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Theo nguoi</Text>
                  <Text style={styles.heroStatValue}>{perPersonServices.length}</Text>
                </View>
              </View>
            </SurfaceCard>

            {isWeb ? (
              <SurfaceCard tone="lowest" style={styles.heroAside}>
                <Text style={styles.heroAsideTitle}>Tong phi co dinh hang thang</Text>
                <Text style={styles.heroAsideValue}>{formatCurrency(monthlyFixedTotal)}</Text>
                <Text style={styles.heroAsideText}>Tong nay chua bao gom dich vu tinh theo chi so dien va nuoc tinh theo so nguoi o.</Text>
                <View style={styles.heroAsideList}>
                  <Text style={styles.heroAsideItem}>Nuoc tren web hien thi theo nguoi</Text>
                  <Text style={styles.heroAsideItem}>Dien giu nguyen theo chi so</Text>
                  <Text style={styles.heroAsideItem}>Co the cap nhat gia ngay tren tung the dich vu</Text>
                </View>
              </SurfaceCard>
            ) : null}
          </View>

          <View style={[styles.toolbar, isWeb && styles.toolbarWeb]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Bang gia dang ap dung</Text>
              <Text style={styles.sectionText}>Cap nhat don gia dich vu dang dung cho toan bo luong lap hoa don hang thang.</Text>
            </View>
            {isWeb ? (
              <TouchableOpacity style={styles.addActionBtn} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addActionText}>Them dich vu</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {services.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="construct-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Chua co dich vu nao</Text>
              <Text style={styles.emptyText}>Them bang gia dien, nuoc, wifi hoac cac phi co dinh de bat dau lap hoa don.</Text>
            </View>
          ) : (
            <View style={styles.serviceGrid}>
              {services.map((svc) => {
                const isEditing = editing === svc.id;
                const isMetered = svc.type === 'metered' || svc.type === 'meter';
                const isWater = normalizeText(svc.name).includes('nuoc');
                const displayType = isWater ? 'Tinh theo nguoi' : (SERVICE_DESCRIPTIONS[svc.type] || svc.type);
                const displayUnit = isWater ? 'nguoi' : svc.unit;
                const cardHint = isWater
                  ? 'Ap dung theo so nguoi trong phong moi thang'
                  : isMetered
                    ? 'Nhap chi so cu va moi khi lap bill'
                    : 'Cong thang vao hoa don';

                return (
                  <SurfaceCard key={svc.id} tone="lowest" style={[styles.card, isWeb && styles.cardWeb, { width: isWeb ? serviceCardBasis : '100%' }]}>
                    <View style={styles.cardHead}>
                      <View style={styles.cardLeft}>
                        <Text style={styles.icon}>{svc.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{svc.name}</Text>
                          <Text style={styles.type}>{displayType}</Text>
                        </View>
                      </View>
                      {!isEditing ? (
                        <View style={styles.cardActions}>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(svc)}>
                            <Ionicons name="pencil-outline" size={15} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff1f2' }]} onPress={() => handleDelete(svc)}>
                            <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.serviceMetaRow}>
                      <View style={[styles.serviceMetaChip, isWater && styles.serviceMetaChipWater]}>
                        <Text style={[styles.serviceMetaText, isWater && styles.serviceMetaTextWater]}>{displayType}</Text>
                      </View>
                      <Text style={styles.serviceHint}>{cardHint}</Text>
                    </View>

                    {isEditing ? (
                      <View style={styles.editWrap}>
                        <View style={styles.editRow}>
                          <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={editPrice}
                            onChangeText={setEditPrice}
                            placeholder="Don gia"
                          />
                          {isMetered ? (
                            <TextInput
                              style={styles.input}
                              keyboardType="number-pad"
                              value={editPriceAc}
                              onChangeText={setEditPriceAc}
                              placeholder="Gia AC"
                            />
                          ) : null}
                        </View>
                        <View style={styles.editActions}>
                          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                            <Text style={styles.cancelTxt}>Huy</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.saveBtn} onPress={() => saveEdit(svc)}>
                            <Text style={styles.saveTxt}>Luu</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatCurrency(svc.unit_price || 0)}/{displayUnit}</Text>
                        {isWater ? <Text style={styles.priceHint}>Ap dung theo so nguoi trong phong moi thang</Text> : null}
                        {isMetered && Number(svc.unit_price_ac || 0) > 0 ? (
                          <Text style={styles.priceAc}>AC {formatCurrency(svc.unit_price_ac || 0)}/{svc.unit}</Text>
                        ) : null}
                      </View>
                    )}
                  </SurfaceCard>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType={isWeb ? 'fade' : 'slide'}>
        <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
          <View style={[styles.modalBox, isWeb && styles.modalBoxWeb]}>
            <Text style={styles.modalTitle}>Them dich vu</Text>
            <Text style={styles.modalSub}>Cau hinh bang gia se duoc ap dung cho luong lap hoa don tren web.</Text>

            <View style={[styles.modalTopRow, isWeb && styles.modalTopRowWeb]}>
              <TextInput style={[styles.modalInput, isWeb && styles.modalInputWide]} placeholder="Ten dich vu" value={newName} onChangeText={setNewName} />
              <TextInput style={[styles.modalInput, isWeb && styles.modalInputIcon]} placeholder="Icon" value={newIcon} onChangeText={setNewIcon} maxLength={2} />
            </View>

            <View style={styles.typesRow}>
              {SERVICE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, newType === t.key && styles.typeChipActive]}
                  onPress={() => {
                    setNewType(t.key);
                    if (t.key === 'fixed') setNewUnit('thang');
                    else if (t.key === 'per_person') setNewUnit('nguoi');
                    else setNewUnit('kWh');
                  }}
                >
                  <Text>{t.icon}</Text>
                  <Text style={[styles.typeChipTxt, newType === t.key && styles.typeChipTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalRow}>
              <TextInput style={styles.modalInputHalf} placeholder="Gia" keyboardType="number-pad" value={newPrice} onChangeText={setNewPrice} />
              <TextInput style={styles.modalInputHalf} placeholder="Don vi" value={newUnit} onChangeText={setNewUnit} />
            </View>

            {newType === 'metered' ? (
              <TextInput style={styles.modalInput} placeholder="Gia phong co AC" keyboardType="number-pad" value={newPriceAc} onChangeText={setNewPriceAc} />
            ) : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelTxt}>Huy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddService}>
                <Text style={styles.saveTxt}>Them</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 16, paddingTop: 10, gap: 12 },
  containerWeb: { width: '100%', alignSelf: 'center', paddingTop: 20 },
  heroRow: { gap: 12 },
  heroRowWeb: { flexDirection: 'row', alignItems: 'stretch' },
  heroCard: { flex: 1.2 },
  heroEyebrow: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5, ...FONTS.bold },
  heroTitle: { marginTop: 8, fontSize: 22, color: COLORS.textPrimary, ...FONTS.bold },
  heroText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  heroStats: { gap: 10, marginTop: 14 },
  heroStatsWeb: { flexDirection: 'row', flexWrap: 'wrap' },
  heroStatItem: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
    padding: 12,
  },
  heroStatLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  heroStatValue: { marginTop: 6, fontSize: 20, color: COLORS.textPrimary, ...FONTS.bold },
  heroAside: { flex: 0.9, justifyContent: 'center' },
  heroAsideTitle: { fontSize: 12, color: COLORS.textMuted, ...FONTS.bold, textTransform: 'uppercase' },
  heroAsideValue: { marginTop: 10, fontSize: 28, color: COLORS.primary, ...FONTS.black },
  heroAsideText: { marginTop: 8, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  heroAsideList: { marginTop: 12, gap: 8 },
  heroAsideItem: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.medium },
  toolbar: { gap: 12 },
  toolbarWeb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  sectionText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  addActionBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SHADOW.sm,
  },
  addActionText: { color: '#fff', ...FONTS.bold },
  emptyWrap: {
    minHeight: 240,
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
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { marginBottom: 10 },
  cardWeb: { marginBottom: 0, borderWidth: 1, borderColor: COLORS.borderSoft, minHeight: 212 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 24 },
  name: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  type: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  serviceMetaRow: { marginTop: 12, gap: 8 },
  serviceMetaChip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serviceMetaChipWater: {
    backgroundColor: COLORS.primaryLight,
  },
  serviceMetaText: { fontSize: 10, color: COLORS.textSecondary, ...FONTS.bold },
  serviceMetaTextWater: { color: COLORS.primaryDark },
  serviceHint: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  priceRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.borderSoft },
  price: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  priceHint: { marginTop: 4, fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  priceAc: { marginTop: 4, fontSize: 12, color: COLORS.primary, ...FONTS.bold },
  editWrap: { marginTop: 12 },
  editRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: '#fff' },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 10, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1.3, height: 42, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },
  cancelTxt: { color: COLORS.textSecondary, ...FONTS.bold },
  saveTxt: { color: '#fff', ...FONTS.bold },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  overlayWeb: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 18, paddingBottom: 34 },
  modalBoxWeb: { width: '100%', maxWidth: 720, borderRadius: RADIUS.xl, paddingBottom: 24 },
  modalTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 10 },
  modalSub: { marginBottom: 12, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  modalTopRow: { gap: 10 },
  modalTopRowWeb: { flexDirection: 'row', alignItems: 'center' },
  modalInput: { height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, marginBottom: 10 },
  modalInputWide: { flex: 1, marginBottom: 0 },
  modalInputIcon: { width: 84, marginBottom: 0, textAlign: 'center' },
  typesRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeChip: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: COLORS.surfaceLow },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeChipTxt: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.bold },
  typeChipTxtActive: { color: COLORS.primaryDark },
  modalRow: { flexDirection: 'row', gap: 8 },
  modalInputHalf: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
});


