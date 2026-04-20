import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { toISODate } from '../utils/format';
import {
  addCategory,
  addTransaction,
  getCategories,
  getWallets,
  updateTransaction,
} from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

const stripToDigits = (text) => text.replace(/[^0-9]/g, '');
const displayAmount = (raw) => {
  if (!raw || raw === '0') return '';
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('vi-VN');
};

export default function AddTransactionScreen({ navigation, route }) {
  const isDesktopWeb = Platform.OS === 'web';
  const editTx = route?.params?.editTx || null;
  const [type, setType] = useState(editTx?.type || 'expense');
  const [amountRaw, setAmountRaw] = useState(editTx?.amount ? String(Math.round(editTx.amount)) : '');
  const [description, setDescription] = useState(editTx?.description || '');
  const [walletId, setWalletId] = useState(editTx?.wallet_id || route?.params?.walletId || null);
  const [categoryId, setCategoryId] = useState(editTx?.category_id || null);
  const [imageUri, setImageUri] = useState(editTx?.image_uri || null);
  const [date] = useState(editTx?.date || toISODate(new Date()));

  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadWallets(); }, []);
  useEffect(() => { if (walletId) loadCategories(); }, [walletId, type]);

  const loadWallets = async () => {
    const ws = await getWallets();
    setWallets(ws || []);
    if (!walletId && ws.length > 0) setWalletId(ws[0].id);
  };

  const loadCategories = async () => {
    const cats = await getCategories(type, walletId);
    setCategories(cats || []);
    if (!editTx && cats.length > 0) setCategoryId(cats[0].id);
  };

  const saveImage = async (uri) => {
    const filename = `receipt_${Date.now()}.jpg`;
    const dir = `${FileSystem.documentDirectory}receipts/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.copyAsync({ from: uri, to: `${dir}${filename}` });
    setImageUri(`receipts/${filename}`);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Loi', 'Can cap quyen thu vien anh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) await saveImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Loi', 'Can cap quyen camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) await saveImage(result.assets[0].uri);
  };

  const validateAndSave = async () => {
    const amount = parseInt(amountRaw, 10);
    if (!amountRaw || Number.isNaN(amount) || amount < 1000) {
      Alert.alert('Loi', 'So tien toi thieu 1.000d');
      return;
    }
    if (!walletId) {
      Alert.alert('Loi', 'Vui long chon so');
      return;
    }

    setSaving(true);
    try {
      const payload = { type, amount, description, categoryId, walletId, imageUri, date };
      if (editTx) await updateTransaction(editTx.id, payload);
      else await addTransaction(payload);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Loi', e.message || 'Khong the luu giao dich');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await addCategory(newCatName.trim(), '💬', COLORS.textMuted, type, walletId);
    await loadCategories();
    setNewCatName('');
    setShowCatModal(false);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {!isDesktopWeb ? (
        <TopAppBar
          title={editTx ? 'Sua giao dich' : 'Them giao dich'}
          subtitle="Quan ly thu chi"
          onBack={() => navigation.goBack()}
          rightIcon="checkmark"
          onRightPress={validateAndSave}
          light
        />
      ) : null}

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {isDesktopWeb ? (
          <View style={styles.webActionRow}>
            <TouchableOpacity style={styles.webGhostBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.webGhostBtnText}>Huy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.webPrimaryBtn, saving && { opacity: 0.7 }]} disabled={saving} onPress={validateAndSave}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.webPrimaryBtnText}>{saving ? 'Dang luu...' : (editTx ? 'Cap nhat' : 'Luu giao dich')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.typeRow}>
          {['expense', 'income'].map((t) => (
            <TouchableOpacity key={t} style={[styles.typeBtn, type === t && styles.typeBtnActive(t)]} onPress={() => { setType(t); setCategoryId(null); }}>
              <Ionicons name={t === 'income' ? 'arrow-up-circle' : 'arrow-down-circle'} size={18} color={type === t ? '#fff' : COLORS.textSecondary} />
              <Text style={[styles.typeTxt, type === t && { color: '#fff' }]}>{t === 'income' ? 'Khoan thu' : 'Khoan chi'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SurfaceCard tone="lowest" style={styles.amountBox}>
          <Text style={styles.currency}>₫</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
            placeholder="0"
            value={displayAmount(amountRaw)}
            onChangeText={(t) => setAmountRaw(stripToDigits(t))}
          />
        </SurfaceCard>

        <Text style={styles.label}>So quan ly</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {wallets.map((w) => (
            <TouchableOpacity key={w.id} style={[styles.walletChip, walletId === w.id && { backgroundColor: w.color, borderColor: w.color }]} onPress={() => { setWalletId(w.id); setCategoryId(null); }}>
              <Text>{w.icon || '💼'}</Text>
              <Text style={[styles.walletChipTxt, walletId === w.id && { color: '#fff' }]}>{w.name || 'Vi'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHead}>
          <Text style={styles.label}>Danh muc</Text>
          <TouchableOpacity style={styles.inlineBtn} onPress={() => setShowCatModal(true)}>
            <Ionicons name="add" size={14} color={COLORS.primary} />
            <Text style={styles.inlineTxt}>Them</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.catGrid}>
          {categories.map((c) => (
            <TouchableOpacity key={c.id} style={[styles.catChip, categoryId === c.id && { borderColor: c.color, backgroundColor: `${c.color}20` }]} onPress={() => setCategoryId(c.id)}>
              <Text style={styles.catIcon}>{c.icon || '📦'}</Text>
              <Text style={[styles.catName, categoryId === c.id && { color: c.color }]}>{c.name || 'Danh muc'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Ghi chu</Text>
        <TextInput
          style={styles.noteInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Mo ta giao dich..."
          multiline
        />

        <Text style={styles.label}>Anh chung tu</Text>
        <View style={styles.imageRow}>
          <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.imageBtnTxt}>Chup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.imageBtnTxt}>Thu vien</Text>
          </TouchableOpacity>
          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri.startsWith('file://') ? imageUri : `${FileSystem.documentDirectory}${imageUri}` }} style={styles.previewImg} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImageUri(null)}>
                <Ionicons name="close-circle" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} disabled={saving} onPress={validateAndSave}>
          <Text style={styles.saveTxt}>{saving ? 'Dang luu...' : (editTx ? 'Cap nhat' : 'Luu giao dich')}</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      <Modal visible={showCatModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Them danh muc</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ten danh muc"
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
              onSubmitEditing={handleAddCategory}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowCatModal(false); setNewCatName(''); }}>
                <Text style={styles.modalCancelTxt}>Huy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddCategory}>
                <Text style={styles.modalSaveTxt}>Them</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  webActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 14 },
  webGhostBtn: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 18,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webGhostBtnText: { color: COLORS.textSecondary, ...FONTS.bold },
  webPrimaryBtn: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.sm,
  },
  webPrimaryBtnText: { color: '#fff', ...FONTS.bold },
  typeRow: { flexDirection: 'row', borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceLow, padding: 6, marginBottom: 14 },
  typeBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  typeBtnActive: (t) => ({ backgroundColor: t === 'income' ? COLORS.secondary : COLORS.danger }),
  typeTxt: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  amountBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  currency: { fontSize: 28, color: COLORS.primary, ...FONTS.bold, marginRight: 10 },
  amountInput: { flex: 1, fontSize: 34, color: COLORS.textPrimary, ...FONTS.black },
  label: { ...TYPOGRAPHY.label, color: COLORS.textMuted, marginBottom: 8 },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: COLORS.surfaceLowest, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 14 },
  walletChipTxt: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surfaceLow },
  inlineTxt: { fontSize: 11, color: COLORS.primary, ...FONTS.bold },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceLowest },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.medium },
  noteInput: { minHeight: 96, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceLowest, padding: 12, fontSize: 14, color: COLORS.textPrimary, marginBottom: 14, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 },
  imageBtn: { height: 40, borderRadius: 12, paddingHorizontal: 12, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  imageBtnTxt: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  previewWrap: { position: 'relative' },
  previewImg: { width: 70, height: 70, borderRadius: 10 },
  removeImg: { position: 'absolute', right: -8, top: -8, backgroundColor: '#fff', borderRadius: 10 },
  saveBtn: { height: 48, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },
  saveTxt: { color: '#fff', ...FONTS.bold },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 18 },
  modalTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 10 },
  modalInput: { height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, height: 42, borderRadius: 12, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  modalSave: { flex: 1.4, height: 42, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  modalCancelTxt: { color: COLORS.textSecondary, ...FONTS.bold },
  modalSaveTxt: { color: '#fff', ...FONTS.bold },
});
