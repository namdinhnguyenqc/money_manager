import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Plus, RefreshCw, Save, Wallet } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_WALLETS = [
  { name: 'Ví cá nhân', type: 'personal' },
  { name: 'Quỹ nhà trọ', type: 'rental' },
  { name: 'Vốn nhập hàng', type: 'trading' },
];

const BANK_OPTIONS = [
  { id: '970436', label: 'Vietcombank' },
  { id: '970418', label: 'BIDV' },
  { id: '970422', label: 'MB Bank' },
  { id: '970407', label: 'Techcombank' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [bankConfig, setBankConfig] = useState({
    bank_id: BANK_OPTIONS[0].id,
    account_no: '',
    account_name: '',
    qr_uri: '',
  });
  const [newWallet, setNewWallet] = useState({ name: '', type: 'personal' });
  const [loading, setLoading] = useState(true);
  const [savingWallet, setSavingWallet] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [walletsRes, bankRes] = await Promise.all([
        apiClient.get('/wallets'),
        apiClient.get('/bank-config'),
      ]);
      setWallets(walletsRes?.data || []);
      if (bankRes?.data) {
        setBankConfig({
          bank_id: bankRes.data.bank_id || BANK_OPTIONS[0].id,
          account_no: bankRes.data.account_no || '',
          account_name: bankRes.data.account_name || '',
          qr_uri: bankRes.data.qr_uri || '',
        });
      }
    } catch (e) {
      setError(e.message || 'Không tải được cấu hình.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const missingWalletTypes = useMemo(() => {
    const existingTypes = new Set(wallets.map((wallet) => wallet.type));
    return DEFAULT_WALLETS.filter((wallet) => !existingTypes.has(wallet.type));
  }, [wallets]);

  const handleCreateWallet = async (payload) => {
    await apiClient.post('/wallets', payload);
    await load();
  };

  const bootstrapWallets = async () => {
    try {
      setSavingWallet(true);
      setError('');
      setSuccess('');
      for (const wallet of missingWalletTypes) {
        // eslint-disable-next-line no-await-in-loop
        await handleCreateWallet(wallet);
      }
      setSuccess('Đã khởi tạo bộ ví mặc định.');
    } catch (e) {
      setError(e.message || 'Không tạo được bộ ví mặc định.');
    } finally {
      setSavingWallet(false);
    }
  };

  const submitWallet = async (e) => {
    e.preventDefault();
    try {
      setSavingWallet(true);
      setError('');
      setSuccess('');
      await handleCreateWallet(newWallet);
      setNewWallet({ name: '', type: 'personal' });
      setSuccess('Đã tạo ví mới.');
    } catch (e) {
      setError(e.message || 'Không tạo được ví.');
    } finally {
      setSavingWallet(false);
    }
  };

  const submitBankConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingBank(true);
      setError('');
      setSuccess('');
      await apiClient.put('/bank-config', {
        ...bankConfig,
        qr_uri: bankConfig.qr_uri || null,
      });
      setSuccess('Đã lưu cấu hình thanh toán.');
    } catch (e) {
      setError(e.message || 'Không lưu được cấu hình ngân hàng.');
    } finally {
      setSavingBank(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-text-primary">Thiết lập</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Cấu hình ví, tài khoản nhận tiền và môi trường vận hành.
          </p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {(error || success) && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            error
              ? 'border border-danger/20 bg-danger-light text-danger'
              : 'border border-success/20 bg-success-light text-success'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-4">
          <div className="bento-card">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
              <Wallet size={16} />
              Ví hiện có
            </div>
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
                  <div>
                    <div className="font-semibold text-text-primary">{wallet.name}</div>
                    <div className="text-xs uppercase tracking-wide text-text-muted">{wallet.type}</div>
                  </div>
                  <div className="text-sm font-bold text-text-secondary">
                    {new Intl.NumberFormat('vi-VN').format(Math.round(wallet.balance || 0))} ₫
                  </div>
                </div>
              ))}
            </div>

            {missingWalletTypes.length > 0 && (
              <button
                type="button"
                onClick={bootstrapWallets}
                disabled={savingWallet}
                className="btn-primary mt-4 w-full text-sm disabled:opacity-50"
              >
                {savingWallet ? 'Đang khởi tạo...' : 'Khởi tạo bộ ví mặc định'}
              </button>
            )}
          </div>

          <form onSubmit={submitWallet} className="bento-card">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
              <Plus size={16} />
              Tạo ví mới
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                type="text"
                value={newWallet.name}
                onChange={(e) => setNewWallet((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tên ví"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={newWallet.type}
                onChange={(e) => setNewWallet((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="personal">Cá nhân</option>
                <option value="rental">Nhà trọ</option>
                <option value="trading">Kinh doanh</option>
              </select>
            </div>
            <button type="submit" disabled={savingWallet} className="btn-primary mt-4 w-full text-sm disabled:opacity-50">
              {savingWallet ? 'Đang tạo...' : 'Thêm ví'}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="bento-card">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
              <Landmark size={16} />
              Tài khoản nhận tiền
            </div>
            <form onSubmit={submitBankConfig} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-secondary">Ngân hàng</label>
                <select
                  value={bankConfig.bank_id}
                  onChange={(e) => setBankConfig((prev) => ({ ...prev, bank_id: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-secondary">Số tài khoản</label>
                <input
                  type="text"
                  value={bankConfig.account_no}
                  onChange={(e) => setBankConfig((prev) => ({ ...prev, account_no: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-secondary">Tên chủ tài khoản</label>
                <input
                  type="text"
                  value={bankConfig.account_name}
                  onChange={(e) => setBankConfig((prev) => ({ ...prev, account_name: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-secondary">QR tĩnh (tuỳ chọn)</label>
                <input
                  type="url"
                  value={bankConfig.qr_uri}
                  onChange={(e) => setBankConfig((prev) => ({ ...prev, qr_uri: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button type="submit" disabled={savingBank} className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:opacity-50">
                <Save size={16} />
                {savingBank ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </form>
          </div>

          <div className="bento-card">
            <div className="mb-2 text-sm font-bold text-text-primary">Tài khoản hiện tại</div>
            <div className="text-sm text-text-secondary">{user?.email}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">{user?.role || 'USER'}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
