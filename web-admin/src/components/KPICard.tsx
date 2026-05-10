"use client";
import React from 'react'

type Props = {
  title: string
  value: React.ReactNode
  suffix?: string
  color?: string
  delta?: string
}

export default function KPICard({ title, value, suffix, color = 'bg-white', delta }: Props) {
  return (
    <div className={`rounded-[8px] border border-slate-200 p-4 shadow-sm ${color}`}>
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}{suffix ?? ''}</div>
      {delta !== undefined && (
        <div className="mt-2 text-xs text-slate-500">Delta: {delta}</div>
      )}
    </div>
  )
}
