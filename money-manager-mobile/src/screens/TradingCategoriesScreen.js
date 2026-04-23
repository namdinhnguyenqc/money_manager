import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS } from '../theme';
import { getTradingCategories, addTradingCategory, deleteTradingCategory, updateTradingCategory } from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import { confirmDialog } from '../utils/dialogs';

const EMOJI_SUGGESTIONS = ['🏍️', '⚙️', '🔧', '⛑️', '📦', '🚲', '🏎️', '🛠️', '🧴', '🧥', '🕶️', '🧤', '🧼', '👟', '👖', '🔋', '⛽', '🛢️', '🛒', '🏭'];
const COLOR_SUGGESTIONS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#1e293b', '#fb7185'];

export default function TradingCategoriesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catColor, setCatColor] = useState('#64748b');

  const loadData = useCallback(async () => {
    try {
      const cats = await getTradingCategories();
      setCategories(cats);
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleOpenAdd = () => {
    setEditCat(null);
    setCatName('');
    setCatIcon('📦');
    setCatColor('#64748b');
    setShowModal(true);
  };

  const handleOpenEdit = (cat) => {
    setEditCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || '📦');
    setCatColor(cat.color || '#64748b');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!catName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }
    try {
      if (editCat) {
        await updateTradingCategory(editCat.id, catName.trim(), catIcon, catColor);
      } else {
        await addTradingCategory(catName.trim(), catIcon, catColor);
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu danh mục');
    }
  };

  const handleDelete = (id) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xóa danh mục',
        message: 'Bạn có chắc muốn xóa danh mục này?',
        confirmText: 'Xóa',
      });
      if (!confirmed) return;
      try {
        await deleteTradingCategory(id);
        loadData();
      } catch (e) {
        console.error(e);
        Alert.alert('Lỗi', 'Không thể xóa');
      }
    })();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? 1120 : width >= 1024 ? 980 : 860;

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? (
        <TopAppBar
          title="Product categories"
          subtitle="Business"
          onBack={() => navigation.goBack()}
          rightIcon="add"
          onRightPress={handleOpenAdd}
        />
      ) : null}

      <ScrollView contentContainerStyle={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]} showsVerticalScrollIndicator={false}>
        <SurfaceCard tone="low">
          <Text style={styles.hint}>
            This category list is for business products only (vehicles, parts, accessories).
          </Text>
        </SurfaceCard>

        {isDesktopWeb ? (
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Danh sách danh mục</Text>
              <Text style={styles.sectionSub}>Cập nhật nhóm sản phẩm để lọc tồn kho và báo cáo lợi nhuận.</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Thêm danh mục</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {categories.length === 0 ? (
          <SurfaceCard style={styles.empty}>
            <Ionicons name="pricetags-outline" size={54} color={COLORS.outline} />
            <Text style={styles.emptyTitle}>Chưa có danh mục</Text>
            <Text style={styles.emptySub}>Nhấn + để tạo danh mục mới.</Text>
          </SurfaceCard>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => (
              <SurfaceCard key={cat.id} style={styles.card}>
                <TouchableOpacity style={styles.del} onPress={() => handleDelete(cat.id)}>
                  <Ionicons name="close-circle" size={20} color={COLORS.border} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardTouch} onPress={() => handleOpenEdit(cat)}>
                  <View style={[styles.iconWrap, { backgroundColor: `${cat.color}20` }]}>
                    <Text style={styles.icon}>{cat.icon}</Text>
                  </View>
                  <Text style={styles.name} numberOfLines={2}>{cat.name}</Text>
                </TouchableOpacity>
              </SurfaceCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={[styles.overlay, isDesktopWeb && styles.overlayWeb]}>
          <SurfaceCard style={[styles.modal, isDesktopWeb && styles.modalWeb]}>
            <Text style={styles.modalTitle}>{editCat ? 'Sửa danh mục' : 'Thêm phân loại sản phẩm'}</Text>

            <Text style={styles.label}>Tên danh mục *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Xe Honda, Ohlins"
              value={catName}
              onChangeText={setCatName}
            />

            <Text style={styles.label}>Biểu tượng</Text>
            <View style={styles.emojiRow}>
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, catIcon === emoji && styles.activeEmoji]}
                  onPress={() => setCatIcon(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Màu chính</Text>
            <View style={styles.colorRow}>
              {COLOR_SUGGESTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, catColor === color && styles.activeColor]}
                  onPress={() => setCatColor(color)}
                />
              ))}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancel} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.save} onPress={handleSave}>
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 90, gap: 12 },
  contentWeb: { width: '100%', alignSelf: 'center' },
  hint: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold },
  sectionSub: { marginTop: 4, color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  addBtn: { height: 42, borderRadius: RADIUS.lg, paddingHorizontal: 16, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtnText: { color: '#fff', ...FONTS.bold, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 34 },
  emptyTitle: { marginTop: 10, color: COLORS.textPrimary, ...FONTS.bold },
  emptySub: { marginTop: 4, color: COLORS.textMuted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { width: '48%', padding: 0, overflow: 'hidden' },
  cardTouch: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 16, minHeight: 148, justifyContent: 'center' },
  del: { position: 'absolute', top: 8, right: 8, zIndex: 2 },
  iconWrap: { width: 58, height: 58, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  name: { marginTop: 10, textAlign: 'center', color: COLORS.textPrimary, ...FONTS.semibold },
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  overlayWeb: { alignItems: 'center' },
  modal: { padding: 20 },
  modalWeb: { width: '100%', maxWidth: 760 },
  modalTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 10 },
  label: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.semibold, marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLowest,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeEmoji: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  emojiText: { fontSize: 20 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorBtn: { width: 36, height: 36, borderRadius: 10 },
  activeColor: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancel: { flex: 1, backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: 12 },
  save: { flex: 1.2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: COLORS.textSecondary, ...FONTS.semibold },
  saveText: { color: '#fff', ...FONTS.semibold },
});
