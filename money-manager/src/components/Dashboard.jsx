import React, { useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

export default function Dashboard() {
  const { transactions, profiles } = useTransactions();

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byProfile = {};
    profiles.forEach(p => byProfile[p.id] = { income: 0, expense: 0 });

    transactions.forEach(t => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += amount;
        if (byProfile[t.profileId]) byProfile[t.profileId].income += amount;
      } else {
        expense += amount;
        if (byProfile[t.profileId]) byProfile[t.profileId].expense += amount;
      }
    });

    return { income, expense, balance: income - expense, byProfile };
  }, [transactions, profiles]);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-6 flex items-center space-x-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
          <div className="p-3 bg-white/20 rounded-xl"><Wallet size={32} /></div>
          <div>
            <p className="text-blue-100 font-medium test-sm">Tổng Số Dư</p>
            <h3 className="text-2xl font-bold">{formatCurrency(stats.balance)}</h3>
          </div>
        </div>
        
        <div className="glass rounded-2xl p-6 flex items-center space-x-4 bg-white/90">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><ArrowUpCircle size={32} /></div>
          <div>
            <p className="text-slate-500 font-medium test-sm">Tổng Thu</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.income)}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 flex items-center space-x-4 bg-white/90">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><ArrowDownCircle size={32} /></div>
          <div>
            <p className="text-slate-500 font-medium test-sm">Tổng Chi</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.expense)}</h3>
          </div>
        </div>
      </div>

      {/* Profiles Breakdown */}
      <h3 className="text-lg font-bold text-slate-700 mt-8 mb-4">Chi tiết theo Thành viên</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {profiles.map(p => {
          const pStats = stats.byProfile[p.id];
          if(!pStats) return null;
          return (
            <div key={p.id} className="glass rounded-2xl p-5 border-l-4" style={{borderLeftColor: p.color.replace('bg-', '') || '#ccc'}}>
              <div className="flex justify-between items-center mb-3">
                 <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${p.color}`}></div>
                    {p.name}
                 </h4>
              </div>
              <div className="flex justify-between text-sm">
                 <div>
                    <p className="text-slate-400">Thu vào</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(pStats.income)}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-slate-400">Chi ra</p>
                    <p className="font-semibold text-rose-600">{formatCurrency(pStats.expense)}</p>
                 </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
