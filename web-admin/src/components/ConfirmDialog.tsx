"use client";
import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }: Props) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 'min(90vw, 520px)', background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 14px rgba(0,0,0,0.2)' }}>
        {title && <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>}
        <div style={{ marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
