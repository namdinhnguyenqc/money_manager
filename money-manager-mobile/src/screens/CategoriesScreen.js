import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS } from '../theme';
import { getWallets, getCategories, addCategory, deleteCategory, updateCategory } from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import { confirmDialog } from '../utils/dialogs';

const EMOJI_SUGGESTIONS = ['🍔', '🚗', '🛒', '💡', '💊', '🏠', '💬', '💰', '🎁', '📈', '🔧', '💧', '🗑️', '📡', '✈️', '🎓', '💳', '🎮', '🎵', '⚽', '🐶', '🌿', '🍺', '☕'];
const COLOR_SUGGESTIONS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#1e40af'];

export default function CategoriesScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const initialWalletId = route?.params?.walletId;
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState(initialWalletId || 1);
  const [catType, setCatType] = useState('expense');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('💬');
  const [catColor, setCatColor] = useState('#64748b');
  const [catParentId, setCatParentId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const ws = await getWallets();
      setWallets(ws);
      const targetWalletId = ws.some((w) => Number(w.id) === Number(selectedWalletId))
        ? selectedWalletId
        : ws[0]?.id;
      if (targetWalletId && targetWalletId !== selectedWalletId) {
        setSelectedWalletId(targetWalletId);
      }
      const cats = targetWalletId ? await getCategories(catType, targetWalletId) : [];
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [catType, selectedWalletId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openAdd = () => {
    setEditCat(null);
    setCatName('');
    setCatIcon('💬');
    setCatColor('#64748b');
    setCatParentId(null);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setCatParentId(cat.parent_id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!catName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }
    if (editCat) {
      await updateCategory(editCat.id, catName.trim(), catIcon, catColor, catParentId);
    } else {
      await addCategory(catName.trim(), catIcon, catColor, catType, selectedWalletId, catParentId);
    }
    setShowModal(false);
    await loadData();
  };

  const handleDelete = (cat) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xóa danh mục',
        message: `Xóa "${cat.name}"? Các giao dịch hiện có sẽ không bị xóa.`,
        confirmText: 'Xóa',
      });
      if (!confirmed) return;
      await deleteCategory(cat.id);
      await loadData();
    })();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const rootCategories = categories.filter((c) => !c.parent_id);
  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? 1180 : width >= 1024 ? 1040 : 920;

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? (
        <TopAppBar
          title="Categories"
          subtitle="Thu/expense management"
          onBack={() => navigation.goBack()}
          rightIcon="add"
          onRightPress={openAdd}
        />
      ) : null}

      <View style={[styles.pageWrap, isDesktopWeb && styles.pageWrapWeb, { maxWidth: contentMaxWidth }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll} contentContainerStyle={styles.walletInner}>
        {wallets.map((w) => {
          const active = selectedWalletId === w.id;
          return (
            <TouchableOpacity
              key={w.id}
              style={[styles.walletChip, active && { backgroundColor: w.color, borderColor: w.color }]}
              onPress={() => setSelectedWalletId(w.id)}
            >
              <Text>{w.icon}</Text>
              <Text style={[styles.walletChipText, active && styles.walletChipTextActive]}>{w.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.toolbarRow}>
        <View style={styles.typeRow}>
          {[['expense', 'Chi'], ['income', 'Thu']].map(([type, label]) => {
            const active = catType === type;
            const activeColor = type === 'income' ? COLORS.income : COLORS.expense;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, active && { backgroundColor: activeColor }]}
                onPress={() => setCatType(type)}
              >
                <Text style={[styles.typeText, active && styles.typeTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {isDesktopWeb ? (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Thêm danh mục</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {categories.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>Chưa có danh mục</Text>
            <Text style={styles.emptySub}>Nhấn + để tạo danh mục mới.</Text>
          </SurfaceCard>
        ) : rootCategories.map((cat) => {
          const children = categories.filter((c) => c.parent_id === cat.id);
          return (
            <View key={cat.id}>
              <SurfaceCard style={styles.catCard}>
                <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}20` }]}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(cat)}>
                    <Ionicons name="pencil-outline" size={15} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => handleDelete(cat)}>
                    <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </SurfaceCard>
              {children.map((child) => (
                <SurfaceCard key={child.id} style={styles.childCard}>
                  <Text style={styles.childIcon}>{child.icon}</Text>
                  <Text style={styles.childName}>{child.name}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(child)}>
                      <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => handleDelete(child)}>
                      <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </SurfaceCard>
              ))}
            </View>
          );
        })}
      </ScrollView>
      </View>

      <Modal visible={showModal} transparent animationType={isDesktopWeb ? 'fade' : 'slide'}>
        <View style={[styles.overlay, isDesktopWeb && styles.overlayWeb]}>
          <SurfaceCard style={[styles.modal, isDesktopWeb && styles.modalWeb]}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{editCat ? 'Sửa danh mục' : 'Thêm danh mục mới'}</Text>

            <Text style={styles.label}>Tên danh mục</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Food, fuel"
              value={catName}
              onChangeText={setCatName}
              autoFocus
            />

            <Text style={styles.label}>Icon</Text>
            <TextInput
              style={[styles.input, styles.iconInput]}
              value={catIcon}
              onChangeText={setCatIcon}
              maxLength={2}
              placeholder="😊"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiChip, catIcon === emoji && styles.emojiActive]}
                  onPress={() => setCatIcon(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_SUGGESTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorDot, { backgroundColor: color }, catColor === color && styles.colorActive]}
                  onPress={() => setCatColor(color)}
                />
              ))}
            </View>

            {selectedWalletId === 3 ? (
              <View style={styles.parentSection}>
                <Text style={styles.label}>Danh mục cha (tùy chọn)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.emojiChip, !catParentId && styles.emojiActive]}
                    onPress={() => setCatParentId(null)}
                  >
                    <Text style={styles.parentLabel}>Đặt làm danh mục cha</Text>
                  </TouchableOpacity>
                  {categories
                    .filter((c) => !c.parent_id && c.id !== editCat?.id)
                    .map((parent) => (
                      <TouchableOpacity
                        key={parent.id}
                        style={[styles.emojiChip, catParentId === parent.id && styles.emojiActive]}
                        onPress={() => setCatParentId(parent.id)}
                      >
                        <Text style={styles.parentLabel}>{parent.icon} {parent.name}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: catColor }]} onPress={handleSave}>
                <Text style={styles.saveText}>{editCat ? 'Cập nhật' : 'Thêm'}</Text>
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
  pageWrap: { flex: 1, minHeight: 0 },
  pageWrapWeb: { width: '100%', alignSelf: 'center' },
  walletScroll: { maxHeight: 64, marginTop: 10 },
  walletInner: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingRight: 16 },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLowest,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  walletChipText: { color: COLORS.textSecondary, fontSize: 13, ...FONTS.semibold },
  walletChipTextActive: { color: '#fff' },
  addBtn: { height: 42, borderRadius: RADIUS.full, paddingHorizontal: 16, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtnText: { color: '#fff', ...FONTS.bold, fontSize: 12 },
  typeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.full,
    padding: 3,
  },
  typeBtn: { flex: 1, alignItems: 'center', borderRadius: RADIUS.full, paddingVertical: 9 },
  typeText: { color: COLORS.textSecondary, ...FONTS.semibold },
  typeTextActive: { color: '#fff' },
  listWrap: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 8 },
  emptyCard: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { marginTop: 8, color: COLORS.textPrimary, ...FONTS.bold },
  emptySub: { marginTop: 4, color: COLORS.textMuted, fontSize: 12 },
  catCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 30,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  catIconWrap: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 20 },
  catName: { flex: 1, color: COLORS.textPrimary, fontSize: 15, ...FONTS.semibold },
  childIcon: { fontSize: 17 },
  childName: { flex: 1, color: COLORS.textPrimary, fontSize: 13, ...FONTS.semibold },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { backgroundColor: COLORS.dangerLight },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  overlayWeb: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  modalWeb: { width: '100%', maxWidth: 760, borderRadius: RADIUS.xl, paddingBottom: 18 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold, marginBottom: 14 },
  label: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  iconInput: { fontSize: 24, textAlign: 'center' },
  emojiScroll: { marginBottom: 10 },
  emojiChip: { padding: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceLow, marginRight: 6 },
  emojiActive: { borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  emojiText: { fontSize: 20 },
  colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  parentSection: { marginTop: 4, marginBottom: 8 },
  parentLabel: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 13, alignItems: 'center', backgroundColor: COLORS.surfaceLow },
  saveBtn: { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 13, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, ...FONTS.semibold },
  saveText: { color: '#fff', ...FONTS.semibold },
});
