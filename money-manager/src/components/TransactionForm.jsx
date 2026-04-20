import React, { useState } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { compressImage } from '../utils/imageUtils';
import { Camera, Loader2 } from 'lucide-react';

export default function TransactionForm({ onClose }) {
  const { addTransaction, profiles } = useTransactions();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [profileId, setProfileId] = useState(profiles[0]?.id || '');
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const base64 = await compressImage(file);
      if (base64) {
        setImagePreview(base64);
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !description || !profileId) return;

    addTransaction({
      type,
      amount: parseFloat(amount),
      description,
      profileId,
      image: imagePreview
    });

    // Reset or Close
    if(onClose) onClose();
    else {
      setAmount('');
      setDescription('');
      setImagePreview(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass bg-white p-6 rounded-3xl shadow-xl space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Thêm Giao Dịch Mới</h2>
      </div>

      {/* Tabs Type */}
      <div className="flex p-1 bg-slate-100 rounded-xl">
        <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>
          Khoản Chi
        </button>
        <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
          Khoản Thu
        </button>
      </div>

      {/* Profile Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Ai là người thực hiện?</label>
        <div className="flex space-x-3">
          {profiles.map(p => (
             <button
                type="button"
                key={p.id}
                onClick={() => setProfileId(p.id)}
                className={`flex-1 py-2 px-3 border rounded-xl flex items-center justify-center gap-2 transition-all ${profileId === p.id ? `border-${p.color.split('-')[1]}-500 bg-${p.color.split('-')[1]}-50 shadow-sm` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
             >
                <div className={`w-3 h-3 rounded-full ${p.color}`}></div>
                <span className={`font-medium ${profileId === p.id ? 'text-slate-800' : 'text-slate-500'}`}>{p.name}</span>
             </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Số tiền</label>
            <div className="relative">
              <input 
                type="number" required min="0" step="1000"
                value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-lg rounded-xl px-4 py-3 pb-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                placeholder="Ví dụ: 50000"
              />
              <span className="absolute right-4 top-3 text-slate-400 font-medium">VND</span>
            </div>
        </div>
        
        <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Mô tả ngắn</label>
            <input 
              type="text" required
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
              placeholder="Ăn sáng, Đổ xăng, Lương..."
            />
        </div>
      </div>

      {/* Image Upload */}
      <div>
         <label className="block text-sm font-medium text-slate-600 mb-2">Hóa đơn / Chứng từ (Tùy chọn)</label>
         <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-300 transition-all">
               {isCompressing ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
               <span className="text-sm font-medium">{isCompressing ? 'Đang nén...' : 'Chụp/Chọn ảnh'}</span>
               <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isCompressing} />
            </label>
            {imagePreview && (
               <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <button type="button" onClick={() => setImagePreview(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
               </div>
            )}
         </div>
         <p className="text-xs text-slate-400 mt-2">Ảnh được tự động nén dẹt siêu nhỏ để tiết kiệm bộ nhớ.</p>
      </div>

      <button type="submit" disabled={isCompressing} className="w-full py-4 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-transform active:scale-[0.98]">
        Lưu Giao Dịch
      </button>
    </form>
  );
}
