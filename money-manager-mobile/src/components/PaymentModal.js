import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

export default function PaymentModal({
  visible,
  invoice,
  onClose,
  onConfirm,
}) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible && invoice) {
      const remaining = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
      setAmount(remaining.toString());
    }
  }, [visible, invoice]);

  const handleConfirm = () => {
    const num = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;
    onConfirm(num);
  };

  if (!invoice) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={s.overlay}>
          <View style={s.card}>
            <Text style={s.title}>Thu tiền phòng</Text>
            <Text style={s.sub}>Phòng {invoice.room_name} · Tháng {invoice.month}/{invoice.year}</Text>
            
            <View style={s.inputWrap}>
              <Text style={s.label}>Số tiền thu (VND)</Text>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN') : ''}
                onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
                autoFocus
              />
            </View>

            <View style={s.actions}>
              <TouchableOpacity style={s.btnCancel} onPress={onClose}>
                <Text style={s.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnConfirm} onPress={handleConfirm}>
                <Text style={s.btnConfirmText}>Xác nhận thu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 24, ...SHADOW.lg },
  title: { fontSize: 18, ...FONTS.bold, color: COLORS.textPrimary },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },
  inputWrap: { gap: 8, marginBottom: 24 },
  label: { fontSize: 12, color: COLORS.textMuted, ...FONTS.semibold },
  input: {
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    fontSize: 20,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  actions: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { color: COLORS.textSecondary, ...FONTS.bold },
  btnConfirm: { flex: 1.5, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  btnConfirmText: { color: '#fff', ...FONTS.bold },
});
