import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SHADOW } from '../theme';
import { toISODate } from '../utils/format';
import { getTradingCategories } from '../database/queries';

export default function AddTradingItemBottomSheet({ visible, item, onClose, onSave, navigation }) {
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [importPrice, setImportPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [importDate, setImportDate] = useState(toISODate(new Date()));
  const [sellDate, setSellDate] = useState('');
  const [status, setStatus] = useState('available');
  const [isBatch, setIsBatch] = useState(false);
  const [subItems, setSubItems] = useState([{ name: 'sp 1', category: '' }]);
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    if (!visible) return;
    loadCategories();
    if (item) {
      setName(item.name);
      setCategory(item.category || '');
      setImportPrice(item.import_price.toString());
      setSellPrice(item.sell_price ? item.sell_price.toString() : '');
      setImportDate(item.import_date);
      setSellDate(item.sell_date || '');
      setStatus(item.status);
      setNote(item.note || '');
      return;
    }
    setName('');
    setCategory('');
    setImportPrice('');
    setSellPrice('');
    setImportDate(toISODate(new Date()));
    setSellDate('');
    setStatus('available');
    setNote('');
    setQuantity('1');
    setIsBatch(false);
    setSubItems([{ name: 'sp 1', category: '' }]);
  }, [item, visible]);

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const cats = await getTradingCategories();
      setCategories(cats);
      if (!item && cats.length > 0 && !category) {
        setCategory(cats[0].name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCats(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Loi', 'Nhap ten san pham');
      return;
    }
    const parsedImportPrice = parseInt(importPrice.replace(/[^0-9]/g, ''), 10);
    if (!parsedImportPrice || parsedImportPrice < 0) {
      Alert.alert('Loi', 'Gia nhap khong hop le');
      return;
    }

    const parsedSellPrice = parseInt(sellPrice.replace(/[^0-9]/g, ''), 10) || 0;
    const finalStatus = status;
    let finalSellDate = sellDate;
    if (finalStatus === 'sold') {
      if (parsedSellPrice === 0) {
        Alert.alert('Loi', 'San pham da ban can co gia ban');
        return;
      }
      if (!finalSellDate) finalSellDate = toISODate(new Date());
    } else {
      finalSellDate = '';
    }

    onSave({
      name: name.trim(),
      category,
      importPrice: parsedImportPrice,
      sellPrice: parsedSellPrice,
      importDate,
      sellDate: finalSellDate,
      status: finalStatus,
      note: note.trim(),
      quantity: parseInt(quantity, 10) || 1,
      subItems: isBatch ? subItems.map((si) => ({ ...si, category: si.category || category })) : [],
    });
  };

  const handleQtyChange = (value) => {
    setQuantity(value);
    const qty = parseInt(value, 10) || 1;
    if (isBatch) {
      const newItems = Array.from({ length: qty }, (_, i) => subItems[i] || { name: `sp ${i + 1}`, category });
      setSubItems(newItems);
    }
  };

  const toggleBatch = () => {
    const qty = parseInt(quantity, 10) || 1;
    if (!isBatch) {
      const newItems = Array.from({ length: qty }, (_, i) => ({ name: `sp ${i + 1}`, category }));
      setSubItems(newItems);
    }
    setIsBatch(!isBatch);
  };

  const isWeb = Platform.OS === 'web';
  const dialogWidth = width >= 1320 ? 980 : width >= 1024 ? 860 : Math.min(width - 24, 760);

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView style={[styles.keyboardWrap, isWeb && styles.keyboardWrapWeb]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, isWeb && styles.sheetWeb, { width: isWeb ? dialogWidth : '100%' }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{item ? 'Sua san pham' : 'Nhap hang moi'}</Text>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Ten san pham *</Text>
            <TextInput style={styles.input} placeholder="VD: LS2 FF327 Carbon" value={name} onChangeText={setName} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Gia nhap (d) *</Text>
                <TextInput style={styles.input} keyboardType="number-pad" placeholder="2400000" value={importPrice} onChangeText={setImportPrice} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Ngay nhap *</Text>
                <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={importDate} onChangeText={setImportDate} />
              </View>
            </View>

            {!item ? (
              <View style={{ marginBottom: 12 }}>
                <View style={styles.batchHeader}>
                  <Text style={styles.label}>So luong nhap *</Text>
                  <TouchableOpacity style={styles.batchToggle} onPress={toggleBatch}>
                    <Ionicons name={isBatch ? 'checkbox' : 'square-outline'} size={18} color={isBatch ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[styles.batchToggleText, isBatch && { color: COLORS.primary }]}>Nhieu san pham cung ma</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.input} keyboardType="number-pad" placeholder="1, 2, 3" value={quantity} onChangeText={handleQtyChange} />

                {isBatch ? (
                  <View style={styles.subItemsBox}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>Chi tiet tung mon (ten va phan loai):</Text>
                    {subItems.map((subItem, index) => (
                      <View key={index} style={{ marginBottom: 14 }}>
                        <View style={styles.subItemRow}>
                          <Text style={styles.subItemIndex}>#{index + 1}</Text>
                          <TextInput
                            style={styles.subItemInput}
                            value={subItem.name}
                            placeholder={`sp ${index + 1}`}
                            onChangeText={(value) => {
                              const updated = [...subItems];
                              updated[index] = { ...updated[index], name: value };
                              setSubItems(updated);
                            }}
                          />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 34, marginTop: 4 }}>
                          {categories.map((cat) => (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                styles.miniCategoryChip,
                                (subItem.category === cat.name || (!subItem.category && category === cat.name)) && { backgroundColor: cat.color || COLORS.primary },
                              ]}
                              onPress={() => {
                                const updated = [...subItems];
                                updated[index] = { ...updated[index], category: cat.name };
                                setSubItems(updated);
                              }}
                            >
                              <Text style={styles.miniCategoryIcon}>{cat.icon}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.label}>Trang thai</Text>
            <View style={styles.statusRow}>
              <TouchableOpacity style={[styles.statusBtn, status === 'available' && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} onPress={() => setStatus('available')}>
                <Text style={[styles.statusText, status === 'available' && { color: '#fff' }]}>Kho (chua ban)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statusBtn, status === 'sold' && { backgroundColor: COLORS.income, borderColor: COLORS.income }]} onPress={() => setStatus('sold')}>
                <Text style={[styles.statusText, status === 'sold' && { color: '#fff' }]}>Da ban</Text>
              </TouchableOpacity>
            </View>

            {status === 'sold' ? (
              <View style={styles.soldRowWrap}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Gia ban (d)</Text>
                  <TextInput style={[styles.input, { marginBottom: 0 }]} keyboardType="number-pad" placeholder="3300000" value={sellPrice} onChangeText={setSellPrice} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Ngay ban</Text>
                  <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="YYYY-MM-DD" value={sellDate} onChangeText={setSellDate} />
                </View>
              </View>
            ) : null}

            <Text style={[styles.label, { marginTop: 14 }]}>Phan loai san pham *</Text>
            <View style={styles.categoryWrap}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.name && { backgroundColor: cat.color || COLORS.primary, borderColor: cat.color || COLORS.primary },
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <Text style={[styles.categoryIcon, category === cat.name && { color: '#fff' }]}>{cat.icon}</Text>
                  <Text style={[styles.categoryText, category === cat.name && { color: '#fff' }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
              {categories.length === 0 && !loadingCats ? (
                <TouchableOpacity
                  style={styles.emptyCategoryHint}
                  onPress={() => {
                    onClose();
                    navigation.navigate('TradingCategories');
                  }}
                >
                  <Text style={styles.emptyCategoryHintText}>Chua co phan loai. Bam de tao ngay.</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Ghi chu (noi bo)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="VD: Size L, mau den mo"
              value={note}
              onChangeText={setNote}
              multiline
            />

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Huy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>{item ? 'Cap nhat' : 'Luu hang moi'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  overlayWeb: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  keyboardWrap: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  keyboardWrapWeb: { alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: COLORS.surfaceLowest,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
    maxHeight: '90%',
    minHeight: 0,
    flexShrink: 1,
    ...SHADOW.lg,
  },
  sheetWeb: {
    borderRadius: 26,
    maxHeight: '92%',
  },
  scrollArea: { flexGrow: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: COLORS.border, marginBottom: 14 },
  title: { color: COLORS.textPrimary, ...FONTS.bold, fontSize: 18, marginBottom: 14 },
  label: { color: COLORS.textSecondary, ...FONTS.semibold, fontSize: 12, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COLORS.surfaceLow,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  batchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batchToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  batchToggleText: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold },
  subItemsBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 10,
    backgroundColor: COLORS.surfaceLow,
  },
  subItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subItemIndex: { width: 24, color: COLORS.textMuted, ...FONTS.bold, fontSize: 12 },
  subItemInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 5,
    color: COLORS.textPrimary,
    ...FONTS.semibold,
  },
  miniCategoryChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  miniCategoryIcon: { fontSize: 12 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statusBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: 11, backgroundColor: COLORS.surfaceLow },
  statusText: { color: COLORS.textSecondary, ...FONTS.bold, fontSize: 12 },
  soldRowWrap: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLow,
  },
  categoryIcon: { fontSize: 13 },
  categoryText: { color: COLORS.textSecondary, ...FONTS.semibold, fontSize: 12 },
  emptyCategoryHint: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: 12,
    alignItems: 'center',
  },
  emptyCategoryHintText: { color: COLORS.primary, ...FONTS.semibold, fontSize: 12 },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLow },
  saveBtn: { flex: 1.5, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  cancelText: { color: COLORS.textSecondary, ...FONTS.semibold },
  saveText: { color: '#fff', ...FONTS.semibold },
});
