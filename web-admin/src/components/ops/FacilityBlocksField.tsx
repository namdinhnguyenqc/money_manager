"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

type FacilityBlocksFieldProps = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Compact spacing for use inside a dialog rather than a full page. */
  dense?: boolean;
};

/**
 * The "dãy trọ" (block/wing) list used while creating a facility.
 *
 * Extracted so the full-page create form and the in-tab dialog share one
 * implementation. They were drifting: the page form offered blocks and the
 * dialog did not, which quietly removed the ability to split a facility into
 * wings depending on which entry point the owner happened to use.
 *
 * Blocks are optional and are only collected at creation time — renaming them
 * or moving rooms between them happens on the rooms screen, where the rooms are
 * actually visible.
 */
export default function FacilityBlocksField({ value, onChange, dense = false }: FacilityBlocksFieldProps) {
  const add = () => onChange([...value, ""]);
  const update = (index: number, name: string) => onChange(value.map((item, i) => (i === index ? name : item)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className={`border-t border-slate-200 ${dense ? "pt-4" : "pt-5"}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className={`font-bold text-slate-900 ${dense ? "text-sm font-semibold text-slate-800" : "text-base"}`}>
            Dãy trọ <span className="font-medium text-slate-400">— tùy chọn</span>
          </h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Bỏ qua nếu cơ sở không cần phân dãy. Bạn luôn có thể thêm hoặc chuyển phòng vào dãy sau này.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          <Plus size={16} />
          Thêm dãy
        </button>
      </div>

      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((name, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="input flex-1"
                value={name}
                onChange={(event) => update(index, event.target.value)}
                // A, B, C… matches how owners normally label wings.
                placeholder={`Ví dụ: Dãy ${String.fromCharCode(65 + index)}`}
              />
              <button
                type="button"
                aria-label="Xóa dãy"
                onClick={() => remove(index)}
                className="rounded-[8px] p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Creates the blocks a facility was set up with.
 *
 * The facility already exists by the time this runs, so a failure here is a
 * partial success, not a failed creation — callers should surface it as such
 * rather than telling the owner the facility could not be created.
 */
export async function createFacilityBlocks(
  facilityId: string,
  names: string[],
  createBlock: (facilityId: string, name: string) => Promise<unknown>,
) {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  await Promise.all(cleaned.map((name) => createBlock(facilityId, name)));
}
