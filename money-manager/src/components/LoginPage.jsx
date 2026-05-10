import React, { useState } from 'react';
import { Wallet, KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  {
    label: 'User demo',
    email: 'user@example.com',
    password: 'user123456',
    note: 'Dùng để test dashboard, nhà trọ, giao dịch và kinh doanh.',
  },
  {
    label: 'Admin demo',
    email: 'admin@example.com',
    password: 'admin123456',
    note: 'Có thể dùng để test API role cao hơn nếu backend cần.',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Không thể đăng nhập. Kiểm tra lại backend local.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 lg:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-surface p-6 shadow-bento border border-border/40 lg:p-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
              <Wallet size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-text-primary">Money Manager</h1>
              <p className="mt-1 text-sm text-text-secondary">
                App vận hành tài chính, phòng trọ và nhập bán hàng.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => fillDemo(account)}
                className="rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-primary-light"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
                  <UserRound size={16} />
                  {account.label}
                </div>
                <div className="text-xs text-text-secondary">{account.email}</div>
                <div className="mt-1 text-xs text-text-muted">{account.note}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-primary-light p-4 text-sm text-primary">
            Flow đăng ký chưa được backend hỗ trợ. Màn này chỉ giữ lại luồng đăng nhập thật để tránh người dùng đi vào nhánh giả.
          </div>
        </section>

        <section className="rounded-2xl bg-surface p-6 shadow-bento border border-border/40 lg:p-8">
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-text-secondary">
              <KeyRound size={16} />
              Đăng nhập
            </div>
            <p className="text-sm text-text-muted">
              Dùng account demo hoặc nhập tài khoản API local.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-text-secondary">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-text-secondary">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-danger/20 bg-danger-light px-4 py-3 text-sm font-medium text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Đang đăng nhập...' : 'Vào ứng dụng'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
