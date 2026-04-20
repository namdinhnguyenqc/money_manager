import React, { useState } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { format, parseISO } from 'date-fns';
import { Trash2, Image as ImageIcon, X } from 'lucide-react';

export default function TransactionList() {
  const { transactions, profiles, deleteTransaction } = useTransactions();
  const [selectedImage, setSelectedImage] = useState(null);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-6">
        <p className="text-slate-500 font-medium">Chưa có giao dịch nào.</p>
      </div>
    );
  }

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-bold text-slate-700 mb-4">Giao dịch gần đây</h3>
      
      {transactions.map(t => {
        const profile = profiles.find(p => p.id === t.profileId);
        const isIncome = t.type === 'income';

        return (
          <div key={t.id} className="glass bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold bg-slate-50 ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                 {isIncome ? '+' : '-'}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{t.description}</p>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                   <span>{format(parseISO(t.createdAt), 'dd.MM - HH:mm')}</span>
                   {profile && (
                     <span className="flex items-center gap-1 bg-slate-100 px-2 flex-nowrap rounded-md text-xs font-semibold">
                        <span className={`w-2 h-2 rounded-full ${profile.color}`}></span>
                        {profile.name}
                     </span>
                   )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 text-right">
               <span className={`font-bold text-lg ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
               </span>
               <div className="flex items-center gap-2">
                 {t.image && (
                    <button onClick={() => setSelectedImage(t.image)} className="text-slate-400 hover:text-primary transition-colors" title="Xem hóa đơn">
                       <ImageIcon size={18} />
                    </button>
                 )}
                 <button onClick={() => deleteTransaction(t.id)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100" title="Xóa">
                    <Trash2 size={18} />
                 </button>
               </div>
            </div>
          </div>
        );
      })}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedImage(null)}>
           <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
              <button 
                className="absolute -top-10 right-0 text-white hover:text-rose-400 bg-black/50 rounded-full p-1"
                onClick={() => setSelectedImage(null)}
              >
                 <X size={24} />
              </button>
              <img src={selectedImage} alt="Hóa đơn" className="w-full h-auto rounded-xl object-contain max-h-[80vh] shadow-2xl" />
           </div>
        </div>
      )}
    </div>
  );
}
