import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import apiClient from '../../services/apiClient';
import TransactionModal from '../TransactionModal';

const fmt = (n) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n || 0))} ₫`;

export default function TransactionsPage({ navigate }) {
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const walletsRes = await apiClient.get('/wallets');
      const walletRows = walletsRes?.data || [];
      setWallets(walletRows);

      const txEndpoint =
        selectedWalletId !== 'all'
          ? `/transactions?walletId=${selectedWalletId}&limit=50`
          : '/transactions?limit=50';
      const txRes = await apiClient.get(txEndpoint);
      setTransactions(txRes?.data || []);
    } catch (e) {
      setError(e.message || 'Không tải được giao dịch.');
    } finally {
      setLoading(false);
    }
  }, [selectedWalletId]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount || 0);
        if (tx.type === 'income') acc.income += amount;
        else acc.expense += amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await apiClient.delete(`/transactions/${id}`);
      await load();
    } catch (e) {
      setError(e.message || 'Không xoá được giao dịch.');
    } finally {
      setDeletingId(null);
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
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-text-primary">Giao dịch</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Theo dõi dòng tiền thực tế theo ví.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Làm mới
          </button>
          <button
            onClick={() => setIsTxModalOpen(true)}
            disabled={wallets.length === 0}
            className="btn-primary flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Thêm giao dịch
          </button>
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="bento-card flex flex-col items-start gap-3 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
            <Wallet size={18} />
          </div>
          <div>
            <div className="font-bold text-text-primary">Chưa có ví nào để ghi nhận giao dịch</div>
            <div className="mt-1 text-sm text-text-muted">
              Tạo ít nhất một ví trước khi nhập thu chi.
            </div>
          </div>
          <button onClick={() => navigate?.('settings')} className="btn-primary text-sm">
            Đi tới thiết lập ví
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="bento-card">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Lọc theo ví</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWalletId('all')}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    selectedWalletId === 'all'
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-text-secondary'
                  }`}
                >
                  Tất cả
                </button>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => setSelectedWalletId(String(wallet.id))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      String(selectedWalletId) === String(wallet.id)
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-background text-text-secondary'
                    }`}
                  >
                    {wallet.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="bento-card">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Tổng thu</div>
              <div className="text-2xl font-black text-success">+{fmt(summary.income)}</div>
            </div>
            <div className="bento-card">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Tổng chi</div>
              <div className="text-2xl font-black text-danger">-{fmt(summary.expense)}</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="bento-card py-10 text-center text-sm text-text-muted">
              Chưa có giao dịch nào trong phạm vi đang lọc.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="bento-card">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
                        tx.type === 'income' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                      }`}
                    >
                      {tx.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="truncate font-bold text-text-primary">
                            {tx.description || 'Giao dịch'}
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {tx.date} · {tx.wallet_name || 'Không rõ ví'}
                            {tx.category_name ? ` · ${tx.category_name}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className={`text-right text-sm font-black ${
                              tx.type === 'income' ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {fmt(tx.amount)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            disabled={deletingId === tx.id}
                            className="rounded-lg border border-border p-2 text-text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
                            aria-label="Xoá giao dịch"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        wallets={wallets}
        onSuccess={load}
      />
    </div>
  );
}
