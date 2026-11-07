import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useTrading();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all transform animate-in slide-in-from-bottom-3 duration-200 ${
              isSuccess
                ? 'bg-[#0A1612]/95 border-emerald-500/40 text-emerald-300'
                : isError
                ? 'bg-[#1A0C10]/95 border-rose-500/40 text-rose-300'
                : 'bg-[#0D121D]/95 border-[#D4AF37]/40 text-white'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-[#D4AF37]" />}
            </div>

            <div className="flex-1 font-mono text-xs">
              <strong className="block text-sm font-semibold tracking-wide text-white mb-0.5">
                {toast.title}
              </strong>
              <p className="text-gray-300 text-xs leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
