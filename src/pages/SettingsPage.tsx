import React, { useState } from 'react';
import { Settings as SettingsIcon, Volume2, VolumeX, DollarSign, Sliders, ShieldCheck } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';

export const SettingsPage: React.FC = () => {
  const { soundEnabled, setSoundEnabled, currency, setCurrency, addToast } = useTrading();
  const [slippage, setSlippage] = useState<string>('0.1');
  const [leverage, setLeverage] = useState<string>('1x');

  const handleSave = () => {
    addToast('success', 'Preferences Saved', 'Terminal trading preferences and risk constraints updated.');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span>Execution & Interface Customization</span>
        </div>
        <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
          Platform <span className="gold-gradient-text">Settings</span>
        </h1>
        <p className="text-xs font-mono text-gray-400 mt-1">
          Configure currency displays, sound fx, order presets, and paper execution parameters
        </p>
      </div>

      <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 sm:p-8 shadow-xl space-y-8 font-mono text-xs">
        {/* Currency Display */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-brand flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
            <span>Display Currency</span>
          </h3>
          <p className="text-gray-400 mb-3 text-[11px]">
            Choose your preferred currency unit across quotes and balance metrics.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {(['USD', 'EUR', 'GBP'] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrency(curr)}
                className={`py-2.5 rounded-xl font-bold uppercase transition-all border ${
                  currency === curr
                    ? 'bg-[#182030] border-[#D4AF37] text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                    : 'bg-[#0D121D] border-[#1A2234] text-gray-400 hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Effects */}
        <div className="pt-6 border-t border-[#1A2234]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-brand flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#D4AF37]" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
            <span>Execution Audio Effects</span>
          </h3>
          <p className="text-gray-400 mb-3 text-[11px]">
            Auditory feedback chimes when paper orders are simulated and filled.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(true)}
              className={`px-4 py-2 rounded-xl transition-all border ${
                soundEnabled
                  ? 'bg-[#182030] border-[#D4AF37] text-[#D4AF37] font-bold'
                  : 'bg-[#0D121D] border-[#1A2234] text-gray-400'
              }`}
            >
              Sound Enabled
            </button>
            <button
              onClick={() => setSoundEnabled(false)}
              className={`px-4 py-2 rounded-xl transition-all border ${
                !soundEnabled
                  ? 'bg-[#182030] border-[#D4AF37] text-[#D4AF37] font-bold'
                  : 'bg-[#0D121D] border-[#1A2234] text-gray-400'
              }`}
            >
              Muted
            </button>
          </div>
        </div>

        {/* Slippage Tolerance */}
        <div className="pt-6 border-t border-[#1A2234]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-brand flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#D4AF37]" />
            <span>Simulated Slippage Tolerance</span>
          </h3>
          <p className="text-gray-400 mb-3 text-[11px]">
            Maximum price divergence allowed during paper order market execution.
          </p>
          <div className="flex gap-3 max-w-sm">
            {['0.1', '0.5', '1.0'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setSlippage(val)}
                className={`flex-1 py-2 rounded-xl transition-all border ${
                  slippage === val
                    ? 'bg-[#182030] border-[#D4AF37] text-[#D4AF37] font-bold'
                    : 'bg-[#0D121D] border-[#1A2234] text-gray-400'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Theme Information */}
        <div className="pt-6 border-t border-[#1A2234]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-brand flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Visual Theme Engine</span>
          </h3>
          <p className="text-gray-400 mb-3 text-[11px]">
            Institutional Luxury Black & Gold theme with anti-glare high-contrast dark palette.
          </p>
          <div className="p-3 bg-[#0D121D] rounded-xl border border-[#1A2234] inline-flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-[#07090E] border border-[#D4AF37]" />
            <span className="text-white font-bold">Black & Gold Institutional (Active)</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-6 border-t border-[#1A2234]">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:from-[#E6BE44] hover:to-[#FBBF24] transition-all"
          >
            Save Trading Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
