import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { getDeposits, addReservation, getTotalDeposit } from '../database/repositories/DepositRepository';
import { getRooms } from '../database/repositories/RentalRepository';
import { formatCurrency } from '../utils/format';

const DepositScreen = () => {
  const [deposits, setDeposits] = useState([]);
  const [total, setTotal] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    roomId: '',
    tenantName: '',
    tenantPhone: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [data, totalAmt, roomList] = await Promise.all([
      getDeposits(),
      getTotalDeposit(),
      getRooms()
    ]);
    setDeposits(data);
    setTotal(totalAmt);
    setRooms(roomList.filter(r => r.status === 'vacant'));
  };

  const handleAdd = async () => {
    if (!form.roomId || !form.amount || !form.tenantName) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    await addReservation({ ...form, amount: parseFloat(form.amount) });
    setShowModal(false);
    loadData();
    Alert.alert("Thành công", "Đã ghi nhận cọc giữ phòng");
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.roomName}>{item.room_name}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
      <Text style={styles.tenantInfo}>{item.tenant_name} - {item.tenant_phone}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        <Text style={styles.date}>{item.recorded_at}</Text>
      </View>
    </View>
  );

  const getStatusText = (s) => {
    const map = { active: 'Đã cọc giữ phòng', transferred: 'Đã vào HĐ', refunded: 'Đã hoàn cọc', cancelled: 'Đã hủy cọc' };
    return map[s] || s;
  };

  const getStatusColor = (s) => {
    const map = { active: '#FF9800', transferred: '#4CAF50', refunded: '#2196F3', cancelled: '#F44336' };
    return map[s] || '#000';
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Tổng tiền cọc hiện tại</Text>
        <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
      </View>

      <FlatList
        data={deposits}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+ Ghi nhận cọc</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Ghi nhận cọc giữ phòng</Text>
          
          <Text style={styles.label}>Chọn phòng</Text>
          <View style={styles.roomGrid}>
            {rooms.map(r => (
              <TouchableOpacity 
                key={r.id} 
                style={[styles.roomBtn, form.roomId === r.id && styles.roomBtnActive]}
                onPress={() => setForm({...form, roomId: r.id})}
              >
                <Text style={form.roomId === r.id ? styles.whiteText : {}}>{r.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput placeholder="Tên khách hàng" style={styles.input} value={form.tenantName} onChangeText={t => setForm({...form, tenantName: t})} />
          <TextInput placeholder="Số điện thoại" style={styles.input} keyboardType="phone-pad" value={form.tenantPhone} onChangeText={t => setForm({...form, tenantPhone: t})} />
          <TextInput placeholder="Số tiền cọc" style={styles.input} keyboardType="numeric" value={form.amount} onChangeText={t => setForm({...form, amount: t})} />
          <TextInput placeholder="Ghi chú" style={[styles.input, {height: 80}]} multiline value={form.note} onChangeText={t => setForm({...form, note: t})} />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setShowModal(false)}>
              <Text>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSubmit} onPress={handleAdd}>
              <Text style={styles.whiteText}>Ghi nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  summaryBox: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  roomName: { fontSize: 18, fontWeight: 'bold' },
  status: { fontSize: 12, fontWeight: 'bold' },
  tenantInfo: { color: '#666', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eee', paddingTop: 8 },
  amount: { fontSize: 16, fontWeight: 'bold', color: '#2196F3' },
  date: { color: '#999' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2196F3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 4 },
  fabText: { color: '#fff', fontWeight: 'bold' },
  modalContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { marginBottom: 8, color: '#666' },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  roomBtn: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 4, marginRight: 8, marginBottom: 8 },
  roomBtnActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 12, marginBottom: 16 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btnCancel: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, backgroundColor: '#eee', borderRadius: 4 },
  btnSubmit: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#2196F3', borderRadius: 4 },
  whiteText: { color: '#fff', fontWeight: 'bold' }
});

export default DepositScreen;
