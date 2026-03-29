import { useMemo, useState } from 'react';
import { ShoppingListItem, GrocerySection } from '../types';
import { generateGroceryExport, formatGroceryExportText } from '../utils/groceryNormalizer';
import { GROCERY_SECTION_ICONS } from '../utils/grocerySections';

// ============================================================
// SmartExportModal — shows the grocery-friendly export view
//   Opens as a modal overlay from the Shopping List page.
//   Provides Copy and Download .txt options.
// ============================================================

interface SmartExportModalProps {
  items: ShoppingListItem[];
  onClose: () => void;
}

export default function SmartExportModal({ items, onClose }: SmartExportModalProps) {
  const [copied, setCopied] = useState(false);

  // Build the grouped, normalized export data
  const grouped = useMemo(() => generateGroceryExport(items), [items]);

  const handleCopy = () => {
    const text = formatGroceryExportText(items);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = () => {
    const text = formatGroceryExportText(items);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grocery-list.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    /* Backdrop — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-slide-up bg-white rounded-2xl shadow-card-lg w-full max-w-md max-h-[85vh] flex flex-col">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-lg font-bold text-stone-800">
              🛍️ Grocery-Friendly List
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400
                         hover:bg-stone-100 hover:text-stone-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Simplified for real shopping — prep notes removed, pantry staples cleaned up.
          </p>
        </div>

        {/* ── List content ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {grouped.size === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No items to export.</p>
          ) : (
            Array.from(grouped.entries()).map(([section, lines]) => (
              <div key={section}>
                {/* Section heading */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base leading-none">
                    {GROCERY_SECTION_ICONS[section as GrocerySection]}
                  </span>
                  <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                    {section}
                  </h3>
                </div>

                {/* Item lines */}
                <ul className="space-y-1.5 pl-6">
                  {lines.map((line, i) => (
                    <li key={i} className="text-sm text-stone-700 leading-relaxed">
                      <span className="text-stone-300 mr-2 select-none">—</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="px-5 py-4 border-t border-stone-100 flex gap-2">
          <button
            onClick={handleCopy}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150
                        active:scale-[0.98] flex items-center justify-center gap-1.5 ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold
                       hover:bg-stone-200 transition-all duration-150 active:scale-[0.98]
                       flex items-center justify-center gap-1.5"
          >
            ⬇️ Save .txt
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-primary-500 text-white text-sm font-semibold
                       hover:bg-primary-600 transition-all duration-150 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
