import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DEMO_ACCOUNTS = [
  {
    label: 'Tài khoản demo',
    email: 'user@example.com',
    password: 'user123456',
    note: 'Dùng để khám phá dashboard, nhà trọ, hóa đơn.',
  },
];

export default function LoginModal({ onClose }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể đăng nhập. Kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.25)] w-full max-w-md overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-blue-600 to-cyan-500" />

          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/transparent/trocare-symbol-tc-transparent-64.png"
                  alt="TrọCare"
                  className="h-10 w-10"
                />
                <div>
                  <h2 id="login-modal-title" className="text-lg font-black text-slate-900">Đăng nhập TrọCare</h2>
                  <p className="text-xs text-slate-500">Quản lý nhà trọ của bạn</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {/* Demo account */}
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => { setEmail(account.email); setPassword(account.password); setError(''); }}
                className="w-full mb-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1">
                  <UserRound size={15} className="text-blue-600" />
                  {account.label}
                </div>
                <div className="text-xs text-slate-500">{account.email}</div>
                <div className="text-xs text-slate-400 mt-0.5">{account.note}</div>
              </button>
            ))}

            {/* Login form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600" htmlFor="login-password">Mật khẩu</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                id="login-submit-btn"
                className="mt-1 flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold text-white rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-[0_4px_14px_rgba(37,99,235,0.4)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <KeyRound size={16} />
                {loading ? 'Đang đăng nhập...' : 'Vào ứng dụng'}
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
