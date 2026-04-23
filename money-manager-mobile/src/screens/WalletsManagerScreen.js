import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
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
import { addWallet, getAllWallets, toggleWalletStatus, updateWallet } from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function WalletsManagerScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('personal');

  const loadData = useCallback(async () => {
    try {
      const rows = await getAllWallets();
      setWallets(rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleToggle = async (id, currentActive) => {
    try {
      const activeCount = wallets.filter((w) => w.active === 1 || w.active === true).length;
      if (currentActive && activeCount <= 1) {
        Alert.alert('Lỗi', 'Cần ít nhất một sổ tiền đang hoạt động');
        return;
      }
      await toggleWalletStatus(id, !currentActive);
      loadData();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    try {
      if (editId) await updateWallet(editId, newName.trim(), newType);
      else await addWallet(newName.trim(), newType);
      setNewName('');
      setEditId(null);
      setNewType('personal');
      setShowAdd(false);
      loadData();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu sổ');
    }
  };

  const openEditor = (w) => {
    setEditId(w.id);
    setNewName(w.name);
    setNewType(w.type);
    setShowAdd(true);
  };

  const openAdd = () => {
    setEditId(null);
    setNewName('');
    setNewType('personal');
    setShowAdd(true);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb;
  const contentMaxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;
  const modalWidth = width >= 1180 ? 760 : width >= 900 ? 680 : Math.min(width - 24, 560);

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? (
        <TopAppBar
          title="Danh sách sổ"
          subtitle="Quản lý module đang hiển thị"
          onBack={() => navigation.goBack()}
          rightIcon="add"
          onRightPress={openAdd}
          light
        />
      ) : null}

      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
        <View style={[styles.heroRow, isWeb && styles.heroRowWeb]}>
          <SurfaceCard tone="low" style={styles.noteCard}>
            <Text style={styles.note}>Bật/tắt sổ tiền trên màn hình chính. Tắt sổ sẽ không xóa dữ liệu.</Text>
          </SurfaceCard>
          {isWeb ? (
            <SurfaceCard tone="lowest" style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>QUẢN LÝ SỔ TIỀN</Text>
              <Text style={styles.heroTitle}>Cấu hình không gian làm việc</Text>
              <Text style={styles.heroText}>Mỗi sổ tiền tương ứng một mảng vận hành. Giao diện website dạng máy tính giúp bật/tắt và cập nhật tên/loại sổ dễ hơn.</Text>
            </SurfaceCard>
          ) : null}
        </View>

        {wallets.map((w) => {
          const isActive = w.active === 1 || w.active === true;
          return (
            <SurfaceCard key={w.id} tone="lowest" style={[styles.card, !isActive && { opacity: 0.6 }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${w.color || COLORS.primary}20` }]}>
                <Text style={{ fontSize: 22 }}>{w.icon || '💼'}</Text>
              </View>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openEditor(w)}>
                <Text style={styles.name}>{w.name}</Text>
                <Text style={styles.type}>
                  {w.type === 'personal' ? 'Tài chính cá nhân' : w.type === 'rental' ? 'Quản lý nhà trọ' : 'Kinh doanh'}
                </Text>
              </TouchableOpacity>
              <Switch
                value={isActive}
                onValueChange={() => handleToggle(w.id, isActive)}
                trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                thumbColor={isActive ? COLORS.primary : '#f4f3f4'}
              />
            </SurfaceCard>
          );
        })}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade">
        <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
          <View style={[styles.modal, isWeb && styles.modalWeb, { width: isWeb ? modalWidth : '100%' }]}>
            <Text style={styles.modalTitle}>{editId ? 'Sửa sổ' : 'Thêm sổ mới'}</Text>

            <Text style={styles.label}>Tên sổ</Text>
            <TextInput style={styles.input} placeholder="VD: Chi tiêu, Kinh doanh..." value={newName} onChangeText={setNewName} />

            <Text style={styles.label}>Loại sổ</Text>
            <View style={styles.types}>
              {[
                { id: 'personal', icon: '👛', title: 'Cá nhân', sub: 'Thu/chi hằng ngày' },
                { id: 'rental', icon: '🏠', title: 'Nhà trọ', sub: 'Phòng, hợp đồng, hóa đơn' },
                { id: 'trading', icon: '📦', title: 'Kinh doanh', sub: 'Nhập/xuất kho và lợi nhuận' },
              ].map((item) => (
                <TouchableOpacity key={item.id} style={[styles.typeBtn, newType === item.id && styles.typeBtnActive]} onPress={() => setNewType(item.id)}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeTitle, newType === item.id && { color: COLORS.primary }]}>{item.title}</Text>
                    <Text style={styles.typeSub}>{item.sub}</Text>
                  </View>
                  {newType === item.id ? <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} /> : null}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveTxt}>{editId ? 'Cập nhật' : 'Tạo sổ'}</Text>
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
  content: { padding: 16, paddingBottom: 60, gap: 12 },
  contentWeb: { width: '100%', alignSelf: 'center', paddingTop: 20 },
  heroRow: { gap: 12 },
  heroRowWeb: { flexDirection: 'row', alignItems: 'stretch' },
  noteCard: { flex: 1.05 },
  note: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 12 },
  heroCard: { flex: 0.95, justifyContent: 'center' },
  heroEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  heroTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  heroText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  type: { marginTop: 2, fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 16 },
  overlayWeb: { alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 18 },
  modalWeb: { maxWidth: 760 },
  modalTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 10 },
  label: { ...TYPOGRAPHY.label, color: COLORS.textMuted, marginBottom: 6 },
  input: { height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, marginBottom: 12 },
  types: { gap: 8 },
  typeBtn: { minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceLow, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeTitle: { fontSize: 13, color: COLORS.textPrimary, ...FONTS.bold },
  typeSub: { marginTop: 2, fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 10, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1.4, height: 42, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },
  cancelTxt: { color: COLORS.textSecondary, ...FONTS.bold },
  saveTxt: { color: '#fff', ...FONTS.bold },
});
