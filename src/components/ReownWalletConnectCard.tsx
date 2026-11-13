import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import { REOWN_WALLETCONNECT_PAY } from '../config/coreTokenContract.ts';
import { useTrading } from '../context/TradingContext.tsx';

interface ReownWalletConnectCardProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export const ReownWalletConnectCard: React.FC<ReownWalletConnectCardProps> = ({
  variant = 'full',
  className = '',
}) => {
  const { addToast } = useTrading();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<'url' | 'pid' | null>(null);
  const [showCompactQr, setShowCompactQr] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(REOWN_WALLETCONNECT_PAY.url, {
      width: 240,
      margin: 2,
      color: {
        dark: '#07090E',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn('Could not render WalletConnect QR code:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = (field: 'url' | 'pid', label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    addToast('info', 'Copied to Clipboard', `${label} copied successfully.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (variant === 'compact') {
    return (
      <div
        className={`p-4 bg-[#0D121D] border border-sky-500/35 rounded-2xl font-mono text-xs space-y-3 ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-xs">
                  {REOWN_WALLETCONNECT_PAY.provider}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase font-bold">
                  Gateway Active
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                PID: <span className="text-[#D4AF37]">{REOWN_WALLETCONNECT_PAY.pid}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCompactQr((prev) => !prev)}
              className="px-2.5 py-1.5 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-gray-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{showCompactQr ? 'Hide QR' : 'Scan QR'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleCopy('url', 'Reown WalletConnect URL', REOWN_WALLETCONNECT_PAY.url)
              }
              className="px-2.5 py-1.5 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-gray-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copiedField === 'url' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{copiedField === 'url' ? 'Copied' : 'Copy Link'}</span>
            </button>
            <a
              href={REOWN_WALLETCONNECT_PAY.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-all"
            >
              <span>Open Reown Pay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {showCompactQr && (
          <div className="pt-3 border-t border-[#1A2234] flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Reown WalletConnect QR Code"
                  className="w-28 h-28 block"
                />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center text-gray-500 text-[10px]">
                  Generating QR...
                </div>
              )}
            </div>
            <div className="space-y-1.5 text-[11px] text-gray-300">
              <p className="text-white font-semibold flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>Scan with WalletConnect Mobile Wallet</span>
              </p>
              <p className="text-gray-400 leading-relaxed">
                Supports {REOWN_WALLETCONNECT_PAY.supportedWallets.join(', ')}. Non-custodial gateway — private keys remain strictly inside your wallet.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleCopy('pid', 'Reown Partner ID', REOWN_WALLETCONNECT_PAY.pid)
                }
                className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                {copiedField === 'pid' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy PID: {REOWN_WALLETCONNECT_PAY.pid}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-[#090D14] border border-sky-500/35 rounded-2xl p-6 shadow-xl font-mono text-xs space-y-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-brand text-lg font-bold text-white">
              Reown / WalletConnect Pay Gateway
            </h2>
            <p className="text-[11px] text-gray-400">
              {REOWN_WALLETCONNECT_PAY.protocol} • Mobile & Hardware Wallet Bridge
            </p>
          </div>
        </div>
        <span className="self-start sm:self-center px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold uppercase">
          WalletConnect Integrated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* QR Code Column */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#0D121D] border border-[#1A2234] rounded-2xl space-y-2.5">
          <div className="p-2.5 bg-white rounded-xl shadow-lg">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan Reown WalletConnect Pay"
                className="w-36 h-36 block"
              />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center text-gray-500 text-xs">
                Generating QR...
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400 text-center flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span>Scan with Mobile Wallet</span>
          </span>
        </div>

        {/* Details & Actions Column */}
        <div className="md:col-span-8 space-y-3.5">
          <div className="p-3.5 bg-[#0D121D] border border-[#1A2234] rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase text-gray-400">Reown Partner / Pay ID (pid)</span>
              <button
                type="button"
                onClick={() => handleCopy('pid', 'Reown Pay ID', REOWN_WALLETCONNECT_PAY.pid)}
                className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                {copiedField === 'pid' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedField === 'pid' ? 'Copied PID' : 'Copy PID'}</span>
              </button>
            </div>
            <p className="text-white font-bold break-all text-xs">
              {REOWN_WALLETCONNECT_PAY.pid}
            </p>
          </div>

          <div className="p-3.5 bg-[#0D121D] border border-[#1A2234] rounded-xl space-y-1.5">
            <span className="text-[10px] uppercase text-gray-400 block">
              Hosted WalletConnect Pay Endpoint
            </span>
            <p className="text-sky-300 break-all text-[11px] leading-relaxed">
              {REOWN_WALLETCONNECT_PAY.url}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {REOWN_WALLETCONNECT_PAY.supportedWallets.map((wallet) => (
              <span
                key={wallet}
                className="px-2 py-0.5 rounded bg-[#141C2C] border border-[#1E293B] text-[10px] text-gray-300"
              >
                {wallet}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href={REOWN_WALLETCONNECT_PAY.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[200px] py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Link2 className="w-4 h-4" />
              <span>Launch Reown WalletConnect Pay</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() =>
                handleCopy('url', 'Reown WalletConnect URL', REOWN_WALLETCONNECT_PAY.url)
              }
              className="py-3 px-4 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-gray-200 rounded-xl flex items-center gap-2 transition-colors"
            >
              {copiedField === 'url' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-[#D4AF37]" />
              )}
              <span>{copiedField === 'url' ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl text-[11px] text-gray-400 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Reown WalletConnect opens in an isolated external session without exposing private keys or seed phrases. Simulated Cloud SQL paper demo credits remain independent from external Web3 sessions.
        </p>
      </div>
    </div>
  );
};
