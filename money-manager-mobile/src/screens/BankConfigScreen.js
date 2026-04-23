import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, RADIUS, FONTS } from '../theme';
import { getBankConfig, updateBankConfig } from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function BankConfigScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [bankId, setBankId] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [qrUri, setQrUri] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getBankConfig();
      if (config) {
        setBankId(config.bank_id || '');
        setAccountNo(config.account_no || '');
        setAccountName(config.account_name || '');
        setQrUri(config.qr_uri || null);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể tải cài đặt ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần cấp quyền thư viện ảnh để tải mã QR');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      try {
        const filename = `qr_code_${Date.now()}.png`;
        const dest = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({ from: selectedUri, to: dest });
        setQrUri(dest);
      } catch (e) {
        console.error(e);
        setQrUri(selectedUri);
      }
    }
  };

  const handleSave = async () => {
    if (!bankId || !accountNo || !accountName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin ngân hàng');
      return;
    }

    setSaving(true);
    try {
      await updateBankConfig({
        bank_id: bankId.trim(),
        account_no: accountNo.trim(),
        account_name: accountName.trim(),
        qr_uri: qrUri,
      });
      Alert.alert('Thành công', 'Đã lưu cài đặt tài khoản nhận tiền', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? 980 : width >= 1024 ? 860 : 760;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {!isDesktopWeb ? <TopAppBar title="Tài khoản nhận tiền" subtitle="Cài đặt" onBack={() => navigation.goBack()} /> : null}

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]} showsVerticalScrollIndicator={false}>
        {isDesktopWeb ? (
          <View style={styles.webActionRow}>
            <TouchableOpacity style={styles.webGhostBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.webGhostBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.webPrimaryBtn, saving && styles.saveDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.webPrimaryBtnText}>Lưu cài đặt</Text>}
            </TouchableOpacity>
          </View>
        ) : null}
        <SurfaceCard>
          <Text style={styles.sectionTitle}>Thông tin ngân hàng</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên ngân hàng (VD: ACB, VCB)</Text>
            <TextInput style={styles.input} value={bankId} onChangeText={setBankId} placeholder="ACB" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số tài khoản</Text>
            <TextInput
              style={styles.input}
              value={accountNo}
              onChangeText={setAccountNo}
              placeholder="252369089"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên chủ tài khoản</Text>
            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="NGUYEN DINH HA NAM"
              autoCapitalize="characters"
            />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Mã QR thanh toán</Text>
          <Text style={styles.note}>Tải ảnh QR tĩnh để người thuê quét và thanh toán nhanh.</Text>

          <View style={styles.qrBox}>
            {qrUri ? (
              <View style={styles.qrContent}>
                <Image source={{ uri: qrUri }} style={styles.qrPreview} />
                <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.changeText}>Đổi ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setQrUri(null)} style={styles.removeWrap}>
                  <Text style={styles.removeText}>Xóa ảnh (dùng WalletetQR tự động)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.upload} onPress={pickImage}>
                <Ionicons name="image-outline" size={42} color={COLORS.outline} />
                <Text style={styles.uploadTitle}>Nhấn để tải ảnh QR</Text>
                <Text style={styles.uploadSub}>Định dạng .jpg, .png</Text>
              </TouchableOpacity>
            )}
          </View>
        </SurfaceCard>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu cài đặt</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  contentWeb: { width: '100%', alignSelf: 'center' },
  webActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  webGhostBtn: { height: 44, paddingHorizontal: 18, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  webGhostBtnText: { color: COLORS.textSecondary, ...FONTS.bold },
  webPrimaryBtn: { minWidth: 160, height: 44, paddingHorizontal: 18, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  webPrimaryBtnText: { color: '#fff', ...FONTS.bold },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, ...FONTS.bold, marginBottom: 8 },
  note: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  inputGroup: { marginBottom: 12 },
  label: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceLowest,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    ...FONTS.semibold,
  },
  qrBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: 16,
    backgroundColor: COLORS.surfaceLowest,
  },
  qrContent: { alignItems: 'center' },
  qrPreview: { width: 180, height: 180, borderRadius: RADIUS.lg },
  changeBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changeText: { color: COLORS.primary, fontSize: 12, ...FONTS.bold },
  removeWrap: { marginTop: 8 },
  removeText: { color: COLORS.danger, fontSize: 12 },
  upload: { alignItems: 'center', paddingVertical: 20 },
  uploadTitle: { marginTop: 10, color: COLORS.textSecondary, ...FONTS.bold },
  uploadSub: { marginTop: 4, color: COLORS.textMuted, fontSize: 12 },
  saveBtn: { marginTop: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, alignItems: 'center', paddingVertical: 15 },
  saveDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 15, ...FONTS.bold },
});
