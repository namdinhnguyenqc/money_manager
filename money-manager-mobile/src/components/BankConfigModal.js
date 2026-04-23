import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import TopAppBar from './ui/TopAppBar';
import { getBankConfig, saveBankConfig } from '../database/queries';

export default function BankConfigModal({ visible, onClose }) {
  const [bankId, setBankId] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadConfig();
    }
  }, [visible]);

  const loadConfig = async () => {
    try {
      const cfg = await getBankConfig();
      if (cfg) {
        setBankId(cfg.bank_id || '');
        setAccountNo(cfg.account_no || '');
        setAccountName(cfg.account_name || '');
      }
    } catch (e) {
      console.error('Lỗi tải cấu hình bank:', e);
    }
  };

  const handleSave = async () => {
    if (!bankId || !accountNo || !accountName) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Tên ngân hàng, Số TK và Chủ TK');
      return;
    }
    setLoading(true);
    try {
      await saveBankConfig(bankId.trim(), accountNo.trim(), accountName.toUpperCase().trim(), null);
      Alert.alert('Thành công', 'Đã lưu cấu hình tài khoản nhận tiền');
      onClose();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === 'web';
  const modalMaxWidth = isWeb ? 480 : '100%';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.container, { maxWidth: modalMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <TopAppBar
            title="Tài Khoản Nhận Tiền"
            subtitle="Cấu hình QR Hóa đơn"
            onBack={onClose}
            light
          />
          <View style={styles.form}>
            <Text style={styles.helpText}>Thông tin này sẽ được in lên hóa đơn thu tiền phòng dạng chữ và dạng QR chuyển khoản (VietQR).</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ngân hàng (Ví dụ: VCB, MB, TPB...)</Text>
              <TextInput
                style={styles.input}
                placeholder="Mã/Tên Ngân Hàng"
                value={bankId}
                onChangeText={setBankId}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số tài khoản</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số tài khoản"
                keyboardType="number-pad"
                value={accountNo}
                onChangeText={setAccountNo}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chủ tài khoản</Text>
              <TextInput
                style={styles.input}
                placeholder="Tên in hoa không dấu"
                autoCapitalize="characters"
                value={accountName}
                onChangeText={setAccountName}
              />
            </View>
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSave} 
              disabled={loading}
            >
              <Text style={styles.saveText}>{loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    marginTop: Platform.OS === 'web' ? 40 : 0,
    marginBottom: Platform.OS === 'web' ? 40 : 0,
    borderRadius: Platform.OS === 'web' ? RADIUS.xl : 0,
    overflow: 'hidden',
  },
  form: {
    padding: 20,
    gap: 16,
  },
  helpText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    lineHeight: 20,
    marginBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  input: {
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#000',
  },
  saveBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...SHADOW.sm,
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    ...FONTS.bold,
  },
});
