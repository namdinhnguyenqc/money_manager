import React from 'react';
import { BarChart } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-black text-text-primary">Thống kê</h2>
        <p className="text-sm text-text-muted mt-0.5">Phân tích dòng tiền và xu hướng</p>
      </div>
      <div className="bento-card flex flex-col items-center justify-center py-20 text-text-muted gap-3">
        <BarChart size={48} className="opacity-20" />
        <p className="text-sm font-medium">Sắp ra mắt — Chức năng đang phát triển</p>
      </div>
    </div>
  );
}
