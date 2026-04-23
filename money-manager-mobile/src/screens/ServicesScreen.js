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
  metered: 'Theo đồng hồ',
  meter: 'Theo đồng hồ',
  fixed: 'Phí cố định',
  per_person: 'Theo đầu người',
};

const SERVICE_TYPES = [
  { key: 'fixed', label: 'Cố định', icon: '📌' },
  { key: 'metered', label: 'Theo đồng hồ', icon: '📊' },
  { key: 'per_person', label: 'Theo đầu người', icon: '👥' },
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
  const [newUnit, setNewUnit] = useState('month');
  const [newIcon, setNewIcon] = useState('⚙️');

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
      Alert.alert('Lỗi', 'Giá không hợp lệ');
      return;
    }
    await updateService(svc.id, { unitPrice: price, unitPriceAc: priceAc, active: true });
    setEditing(null);
    loadServices();
  };

  const handleDelete = (svc) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xóa dịch vụ',
        message: `Xóa ${svc.name}?`,
        confirmText: 'Xóa',
      });
      if (!confirmed) return;
      await deleteService(svc.id);
      loadServices();
    })();
  };

  const handleAddService = async () => {
    if (!newName.trim()) {
      Alert.alert('Lỗi', 'Nhập tên dịch vụ');
      return;
    }
    const price = parseInt(newPrice.replace(/[^0-9]/g, ''), 10);
    if (!price || price < 1) {
      Alert.alert('Lỗi', 'Giá không hợp lệ');
      return;
    }
    const priceAc = parseInt(newPriceAc.replace(/[^0-9]/g, ''), 10) || 0;

    await addService({
      name: newName.trim(),
      type: newType,
      unitPrice: price,
      unitPriceAc: priceAc,
      unit: newUnit.trim() || 'month',
      icon: newIcon || '⚙️',
    });

    setShowAddModal(false);
    setNewName('');
    setNewType('fixed');
    setNewPrice('');
    setNewPriceAc('');
    setNewUnit('month');
    setNewIcon('⚙️');
    loadServices();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb;
  const contentMaxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;
  const serviceCardBasis = width >= 1320 ? '32%' : width >= 900 ? '48.5%' : '100%';
  const fixedServices = services.filter((svc) => {
    const serviceName = normalizeText(svc.name);
    const isWater = serviceName.includes('nuoc') || serviceName.includes('water');
    return svc.type === 'fixed' && !isWater;
  });
  const meteredServices = services.filter((svc) => svc.type === 'metered' || svc.type === 'meter');
  const perPersonServices = services.filter((svc) => {
    const serviceName = normalizeText(svc.name);
    return svc.type === 'per_person' || serviceName.includes('nuoc') || serviceName.includes('water');
  });
  const monthlyFixedTotal = fixedServices.reduce((sum, svc) => sum + Number(svc.unit_price || 0), 0);

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? (
        <TopAppBar
          title="Dịch vụ nhà trọ"
          subtitle="Cấu hình đơn giá"
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
              <Text style={styles.heroEyebrow}>BẢNG DỊCH VỤ</Text>
              <Text style={styles.heroTitle}>Bảng giá vận hành nhà trọ</Text>
              <Text style={styles.heroText}>Quản lý điện, nước, wifi, rác và các khoản phí khác trên giao diện máy tính để đối soát nhanh hơn.</Text>

              <View style={[styles.heroStats, isWeb && styles.heroStatsWeb]}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Tổng dịch vụ</Text>
                  <Text style={styles.heroStatValue}>{services.length}</Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Phí cố định</Text>
                  <Text style={styles.heroStatValue}>{fixedServices.length}</Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Theo đồng hồ</Text>
                  <Text style={styles.heroStatValue}>{meteredServices.length}</Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Theo đầu người</Text>
                  <Text style={styles.heroStatValue}>{perPersonServices.length}</Text>
                </View>
              </View>
            </SurfaceCard>

            {isWeb ? (
              <SurfaceCard tone="lowest" style={styles.heroAside}>
                <Text style={styles.heroAsideTitle}>Tổng phí cố định theo tháng</Text>
                <Text style={styles.heroAsideValue}>{formatCurrency(monthlyFixedTotal)}</Text>
                <Text style={styles.heroAsideText}>Tổng này chưa bao gồm điện tính theo công tơ và nước tính theo đầu người.</Text>
                <View style={styles.heroAsideList}>
                  <Text style={styles.heroAsideItem}>Nước trên website đang hiển thị theo đầu người</Text>
                  <Text style={styles.heroAsideItem}>Điện vẫn được tính theo công tơ</Text>
                  <Text style={styles.heroAsideItem}>Bạn có thể cập nhật đơn giá trực tiếp trên từng thẻ dịch vụ</Text>
                </View>
              </SurfaceCard>
            ) : null}
          </View>

          <View style={[styles.toolbar, isWeb && styles.toolbarWeb]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Bảng giá đang áp dụng</Text>
              <Text style={styles.sectionText}>Cập nhật đơn giá dịch vụ dùng trong quy trình lập hóa đơn tháng.</Text>
            </View>
            {isWeb ? (
              <TouchableOpacity style={styles.addActionBtn} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addActionText}>Thêm dịch vụ</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {services.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="construct-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Chưa có dịch vụ</Text>
              <Text style={styles.emptyText}>Thêm điện, nước, wifi hoặc phí cố định để bắt đầu lập hóa đơn.</Text>
            </View>
          ) : (
            <View style={styles.serviceGrid}>
              {services.map((svc) => {
                const isEditing = editing === svc.id;
                const isMetered = svc.type === 'metered' || svc.type === 'meter';
                const serviceName = normalizeText(svc.name);
                const isWater = serviceName.includes('nuoc') || serviceName.includes('water');
                const displayType = isWater ? 'Theo đầu người' : (SERVICE_DESCRIPTIONS[svc.type] || svc.type);
                const displayUnit = isWater ? 'người' : svc.unit;
                const cardHint = isWater
                  ? 'Tính theo số người ở mỗi tháng'
                  : isMetered
                    ? 'Nhập số cũ/số mới khi lập hóa đơn'
                    : 'Cộng theo tháng vào hóa đơn';

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
                            placeholder="Đơn giá"
                          />
                          {isMetered ? (
                            <TextInput
                              style={styles.input}
                              keyboardType="number-pad"
                              value={editPriceAc}
                              onChangeText={setEditPriceAc}
                              placeholder="Giá phòng máy lạnh"
                            />
                          ) : null}
                        </View>
                        <View style={styles.editActions}>
                          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                            <Text style={styles.cancelTxt}>Hủy</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.saveBtn} onPress={() => saveEdit(svc)}>
                            <Text style={styles.saveTxt}>Lưu</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatCurrency(svc.unit_price || 0)}/{displayUnit}</Text>
                        {isWater ? <Text style={styles.priceHint}>Tính theo số người ở mỗi tháng</Text> : null}
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
            <Text style={styles.modalTitle}>Thêm dịch vụ</Text>
            <Text style={styles.modalSub}>Đơn giá tại đây sẽ áp dụng cho luồng lập hóa đơn trên website.</Text>

            <View style={[styles.modalTopRow, isWeb && styles.modalTopRowWeb]}>
              <TextInput style={[styles.modalInput, isWeb && styles.modalInputWide]} placeholder="Tên dịch vụ" value={newName} onChangeText={setNewName} />
              <TextInput style={[styles.modalInput, isWeb && styles.modalInputIcon]} placeholder="Icon" value={newIcon} onChangeText={setNewIcon} maxLength={2} />
            </View>

            <View style={styles.typesRow}>
              {SERVICE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, newType === t.key && styles.typeChipActive]}
                  onPress={() => {
                    setNewType(t.key);
                    if (t.key === 'fixed') setNewUnit('month');
                    else if (t.key === 'per_person') setNewUnit('person');
                    else setNewUnit('kWh');
                  }}
                >
                  <Text>{t.icon}</Text>
                  <Text style={[styles.typeChipTxt, newType === t.key && styles.typeChipTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalRow}>
              <TextInput style={styles.modalInputHalf} placeholder="Đơn giá" keyboardType="number-pad" value={newPrice} onChangeText={setNewPrice} />
              <TextInput style={styles.modalInputHalf} placeholder="Đơn vị" value={newUnit} onChangeText={setNewUnit} />
            </View>

            {newType === 'metered' ? (
              <TextInput style={styles.modalInput} placeholder="Giá cho phòng máy lạnh" keyboardType="number-pad" value={newPriceAc} onChangeText={setNewPriceAc} />
            ) : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddService}>
                <Text style={styles.saveTxt}>Thêm</Text>
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
