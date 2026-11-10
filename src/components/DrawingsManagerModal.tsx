import React, { useState } from 'react';
import {
  X,
  Trash2,
  Lock,
  Unlock,
  Plus,
  ArrowDownToLine,
  ArrowUpToLine,
  Minus,
  TrendingUp,
  Download,
  Upload,
  Check,
} from 'lucide-react';
import { ChartDrawing, DrawingLineStyle } from '../types/drawings.ts';

interface DrawingsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  drawings: ChartDrawing[];
  onAddManualLevel: (type: 'support' | 'resistance' | 'horizontal', price: number, color?: string) => void;
  onDeleteDrawing: (id: string) => void;
  onToggleLock: (id: string) => void;
  onClearAll: () => void;
  onImportDrawings: (imported: ChartDrawing[]) => void;
}

export const DrawingsManagerModal: React.FC<DrawingsManagerModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  drawings,
  onAddManualLevel,
  onDeleteDrawing,
  onToggleLock,
  onClearAll,
  onImportDrawings,
}) => {
  const [manualPrice, setManualPrice] = useState<string>(currentPrice.toString());
  const [manualType, setManualType] = useState<'support' | 'resistance' | 'horizontal'>('support');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(manualPrice);
    if (isNaN(p) || p <= 0) return;
    onAddManualLevel(manualType, p);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(drawings, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    });
  };

  const handleImportSubmit = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed)) {
        onImportDrawings(parsed);
        setShowImportBox(false);
        setImportText('');
      } else {
        alert('Invalid drawing format. Expected JSON array.');
      }
    } catch {
      alert('Failed to parse JSON. Please verify copied structure.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0C101A] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#0F1422]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>{symbol} Chart Drawings</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A2338] text-gray-300 font-normal">
                  {drawings.length} {drawings.length === 1 ? 'line' : 'lines'}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Persistent in local storage • Auto-saved across browser reloads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Quick Manual Level Adder */}
          <form
            onSubmit={handleAddSubmit}
            className="p-3.5 bg-[#121826] border border-[#1E293B] rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-medium text-gray-300">
              <span>Quick Add Exact Price Level</span>
              <span className="text-[11px] text-gray-400 font-mono">
                Current: <strong className="text-[#D4AF37]">${currentPrice.toLocaleString()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setManualType('support')}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 border transition-all ${
                  manualType === 'support'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-[#090D14] text-gray-400 border-[#1E293B] hover:text-white'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Support
              </button>
              <button
                type="button"
                onClick={() => setManualType('resistance')}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 border transition-all ${
                  manualType === 'resistance'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
                    : 'bg-[#090D14] text-gray-400 border-[#1E293B] hover:text-white'
                }`}
              >
                <ArrowUpToLine className="w-3.5 h-3.5" />
                Resistance
              </button>
              <button
                type="button"
                onClick={() => setManualType('horizontal')}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 border transition-all ${
                  manualType === 'horizontal'
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50 shadow-sm'
                    : 'bg-[#090D14] text-gray-400 border-[#1E293B] hover:text-white'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                Pivot Line
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="Price level..."
                  className="w-full bg-[#090D14] border border-[#1E293B] focus:border-[#D4AF37] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black font-semibold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Level
              </button>
            </div>
          </form>

          {/* Active Drawings List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                Saved Drawings ({drawings.length})
              </span>
              {drawings.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="text-[11px] text-gray-400 hover:text-[#D4AF37] font-mono flex items-center gap-1 transition-colors"
                    title="Copy drawings JSON to clipboard"
                  >
                    {copiedNotification ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowImportBox(!showImportBox)}
                    className="text-[11px] text-gray-400 hover:text-[#D4AF37] font-mono flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import</span>
                  </button>
                </div>
              )}
            </div>

            {showImportBox && (
              <div className="mb-3 p-3 bg-[#0A0E17] border border-[#1E293B] rounded-xl space-y-2 animate-fadeIn">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste drawings JSON here..."
                  className="w-full h-20 bg-[#06080E] border border-[#1E293B] rounded-lg p-2 text-[11px] font-mono text-gray-300 focus:outline-none focus:border-[#D4AF37]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowImportBox(false)}
                    className="px-2.5 py-1 text-xs text-gray-400 hover:text-white font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportSubmit}
                    className="px-3 py-1 bg-[#D4AF37] text-black text-xs font-bold rounded-lg font-mono hover:bg-[#F3E5AB]"
                  >
                    Load Drawings
                  </button>
                </div>
              </div>
            )}

            {drawings.length === 0 ? (
              <div className="text-center py-8 bg-[#0E1422] border border-[#1A2234] rounded-xl">
                <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-mono">No manual lines drawn yet for {symbol}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Use the chart drawing toolbar or add an exact price level above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {drawings.map((drawing) => {
                  return (
                    <div
                      key={drawing.id}
                      className="flex items-center justify-between p-2.5 bg-[#0E1422] hover:bg-[#121A2C] border border-[#1A2234] rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Line Color & Style Pill */}
                        <div
                          className="w-3 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${drawing.color}30`, border: `2px solid ${drawing.color}` }}
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono uppercase">
                              {drawing.label || drawing.type}
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase"
                              style={{
                                color: drawing.color,
                                backgroundColor: `${drawing.color}15`,
                                border: `1px solid ${drawing.color}30`,
                              }}
                            >
                              {drawing.type}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                            {drawing.type === 'trendline' && drawing.p2 ? (
                              <span>
                                ${drawing.p1.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} →{' '}
                                ${drawing.p2.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span>
                                Price Level: <strong className="text-gray-200">${drawing.p1.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleLock(drawing.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            drawing.locked
                              ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                          }`}
                          title={drawing.locked ? 'Unlock line' : 'Lock line'}
                        >
                          {drawing.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => onDeleteDrawing(drawing.id)}
                          disabled={drawing.locked}
                          className={`p-1.5 rounded-lg transition-colors ${
                            drawing.locked
                              ? 'text-gray-600 cursor-not-allowed'
                              : 'text-gray-400 hover:text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title="Delete line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#1E293B] bg-[#0F1422] flex items-center justify-between">
          <div>
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-mono">Delete all {drawings.length} lines?</span>
                <button
                  onClick={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                  }}
                  className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold rounded font-mono transition-colors"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[11px] rounded font-mono"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={drawings.length === 0}
                className={`text-xs font-mono flex items-center gap-1.5 transition-colors ${
                  drawings.length === 0
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All {symbol} Drawings
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#2A374F] text-white text-xs font-semibold rounded-lg font-mono transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
