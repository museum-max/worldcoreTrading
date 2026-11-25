import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Link2,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Network,
  Coins,
  RefreshCw,
  Download,
  Clock,
  Trash2,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import {
  CORETOKEN_SPEC,
  REOWN_WALLETCONNECT_PAY,
  SepoliaChainTelemetry,
  fetchSepoliaChainTelemetry,
  fetchWalletOnChainBalances,
  switchToSepoliaNetwork,
  addCoreTokenToMetaMask,
  formatShortAddress,
} from '../config/coreTokenContract.ts';

type PaymentAsset = 'ETH' | 'CT' | 'USDC';
type QrMode = 'reown' | 'eip681';
type TargetChain = 'sepolia' | 'mainnet';
type SessionStatus = 'Initiated' | 'Awaiting Signature' | 'Verified Externally' | 'Cancelled';

interface ReownPaymentSession {
  id: string;
  createdAt: string;
  asset: PaymentAsset;
  amount: string;
  network: TargetChain;
  recipient: string;
  memo: string;
  mode: QrMode;
  status: SessionStatus;
}

const SEPOLIA_USDC_REF = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const MAINNET_USDC_REF = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

function toBaseUnits(amountStr: string, decimals: number): string {
  const cleaned = amountStr.trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return '0';
  const [whole, frac = ''] = cleaned.split('.');
  const paddedFrac = (frac + '0'.repeat(decimals)).slice(0, decimals);
  try {
    const raw = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFrac || '0');
    return raw.toString();
  } catch {
    return '0';
  }
}

export const ReownPayPage: React.FC = () => {
  const { user, web3Account, linkWeb3Wallet } = useAuth();
  const { markets, addToast, setActivePage } = useTrading();

  const activeAddress = user?.walletAddress || web3Account?.address || '';
  const storageKey = `worlcore_reown_sessions_v1_${user?.uid || 'guest'}`;

  const [asset, setAsset] = useState<PaymentAsset>('CT');
  const [amount, setAmount] = useState<string>('500');
  const [targetChain, setTargetChain] = useState<TargetChain>('sepolia');
  const [recipient, setRecipient] = useState<string>(CORETOKEN_SPEC.treasuryAddress);
  const [memo, setMemo] = useState<string>('CoreToken Ecosystem Gateway');
  const [qrMode, setQrMode] = useState<QrMode>('reown');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [telemetry, setTelemetry] = useState<SepoliaChainTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState<boolean>(true);
  const [onChainBalances, setOnChainBalances] = useState<{ ethBalance: string; ctOnChainBalance: string }>({
    ethBalance: '0.0000',
    ctOnChainBalance: '0.00',
  });
  const [walletBusy, setWalletBusy] = useState<boolean>(false);

  const [sessions, setSessions] = useState<ReownPaymentSession[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setSessions(saved ? JSON.parse(saved) : []);
    } catch {
      setSessions([]);
    }
  }, [storageKey]);

  const persistSessions = (next: ReownPaymentSession[]) => {
    setSessions(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 25)));
    } catch {
      // Ignore storage quota errors
    }
  };

  const loadTelemetry = async () => {
    setTelemetryLoading(true);
    try {
      const data = await fetchSepoliaChainTelemetry();
      setTelemetry(data);
      if (activeAddress) {
        const bal = await fetchWalletOnChainBalances(activeAddress);
        setOnChainBalances(bal);
      }
    } finally {
      setTelemetryLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, [activeAddress]);

  const ctPrice = markets.find((m) => m.symbol === 'CT/USDT')?.price || 1.84;
  const ethPrice = markets.find((m) => m.symbol === 'ETH/USDT')?.price || 3410.8;

  const estimatedUsd = useMemo(() => {
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return 0;
    if (asset === 'CT') return num * ctPrice;
    if (asset === 'ETH') return num * ethPrice;
    return num;
  }, [amount, asset, ctPrice, ethPrice]);

  const isRecipientValid = /^0x[0-9a-fA-F]{40}$/.test(recipient.trim());
  const chainId = targetChain === 'sepolia' ? 11155111 : 1;

  const eip681Uri = useMemo(() => {
    const safeRecipient = isRecipientValid ? recipient.trim() : CORETOKEN_SPEC.treasuryAddress;
    if (asset === 'ETH') {
      const wei = toBaseUnits(amount, 18);
      return `ethereum:${safeRecipient}@${chainId}?value=${wei}`;
    }
    if (asset === 'CT') {
      const baseUnits = toBaseUnits(amount, 18);
      return `ethereum:${CORETOKEN_SPEC.contractAddress}@${chainId}/transfer?address=${safeRecipient}&uint256=${baseUnits}`;
    }
    const usdcContract = targetChain === 'sepolia' ? SEPOLIA_USDC_REF : MAINNET_USDC_REF;
    const baseUnits = toBaseUnits(amount, 6);
    return `ethereum:${usdcContract}@${chainId}/transfer?address=${safeRecipient}&uint256=${baseUnits}`;
  }, [asset, amount, chainId, targetChain, recipient, isRecipientValid]);

  const activeQrPayload = qrMode === 'reown' ? REOWN_WALLETCONNECT_PAY.url : eip681Uri;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(activeQrPayload, {
      width: 280,
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
        console.warn('QR generation error:', err);
      });
    return () => {
      active = false;
    };
  }, [activeQrPayload]);

  const handleCopy = (field: string, label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    addToast('info', 'Copied to Clipboard', `${label} copied.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAssetChange = (next: PaymentAsset) => {
    setAsset(next);
    if (next === 'ETH') setAmount('0.1');
    else if (next === 'CT') setAmount('500');
    else setAmount('100');
  };

  const recordSession = (mode: QrMode, status: SessionStatus = 'Initiated') => {
    if (!isRecipientValid) {
      addToast('error', 'Invalid Ethereum Address', 'Please enter a valid 0x40-hex recipient address.');
      return;
    }
    const numAmt = parseFloat(amount);
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      addToast('error', 'Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }

    const entry: ReownPaymentSession = {
      id: `RWN-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      asset,
      amount: amount.trim(),
      network: targetChain,
      recipient: recipient.trim(),
      memo: memo.trim() || 'Reown Gateway Session',
      mode,
      status,
    };

    persistSessions([entry, ...sessions]);
    addToast(
      'success',
      'Payment Session Logged',
      `${entry.id}: ${entry.amount} ${entry.asset} intent recorded.`
    );
  };

  const updateSessionStatus = (id: string, status: SessionStatus) => {
    const next = sessions.map((s) => (s.id === id ? { ...s, status } : s));
    persistSessions(next);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `reown_${qrMode}_${asset.toLowerCase()}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'QR Code Downloaded', `Saved ${qrMode.toUpperCase()} QR image.`);
  };

  const handleConnectWallet = async () => {
    setWalletBusy(true);
    try {
      await linkWeb3Wallet();
      addToast('success', 'Web3 Wallet Connected', 'Address synced for Sepolia telemetry.');
    } catch (err: any) {
      addToast('error', 'Connection Failed', err?.message || 'Could not connect Web3 wallet.');
    } finally {
      setWalletBusy(false);
    }
  };

  const handleSwitchSepolia = async () => {
    setWalletBusy(true);
    try {
      const res = await switchToSepoliaNetwork();
      addToast(res.switched ? 'success' : 'info', 'Network Check', res.message);
      await loadTelemetry();
    } catch (err: any) {
      addToast('error', 'Switch Failed', err?.message || 'Wallet rejected network switch.');
    } finally {
      setWalletBusy(false);
    }
  };

  const handleImportCt = async () => {
    setWalletBusy(true);
    try {
      const res = await addCoreTokenToMetaMask();
      addToast(res.added ? 'success' : 'info', 'MetaMask Token Watch', res.message);
    } catch (err: any) {
      addToast('error', 'Import Failed', err?.message || 'Could not prompt MetaMask.');
    } finally {
      setWalletBusy(false);
    }
  };

  const presets =
    asset === 'ETH'
      ? ['0.05', '0.1', '0.5', '1.0']
      : asset === 'CT'
      ? ['100', '500', '1000', '5000']
      : ['25', '100', '500', '1000'];

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F182D] via-[#0A101E] to-[#07090E] border border-sky-500/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-300 font-bold">
                <Link2 className="w-3.5 h-3.5" />
                REOWN WALLETCONNECT PAY
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {REOWN_WALLETCONNECT_PAY.protocol}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                PID: {formatShortAddress(REOWN_WALLETCONNECT_PAY.pid, 10, 6)}
              </span>
            </div>

            <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white tracking-wide">
              Reown <span className="text-sky-400">WalletConnect</span> Payment Portal
            </h1>
            <p className="text-xs sm:text-sm font-mono text-gray-300 leading-relaxed">
              Dedicated non-custodial gateway for WalletConnect mobile QR checkout, EIP-681 Sepolia payment URIs, and CoreToken (CT) ERC-20 verification.
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {REOWN_WALLETCONNECT_PAY.supportedWallets.map((w) => (
                <span
                  key={w}
                  className="px-2.5 py-1 rounded-lg bg-[#0B111E] border border-[#1E293B] text-[10px] font-mono text-gray-300"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>

          {/* Primary Launch CTA Column */}
          <div className="flex flex-col gap-2.5 min-w-[260px] font-mono text-xs">
            <a
              href={REOWN_WALLETCONNECT_PAY.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordSession('reown', 'Initiated')}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Link2 className="w-4 h-4" />
              <span>Launch Reown Checkout</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCopy('hero-url', 'Reown Pay URL', REOWN_WALLETCONNECT_PAY.url)}
                className="py-2.5 px-3 bg-[#0D1424] hover:bg-[#162036] border border-[#1E293B] text-gray-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedField === 'hero-url' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>Copy Pay URL</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('token')}
                className="py-2.5 px-3 bg-[#0D1424] hover:bg-[#162036] border border-[#D4AF37]/40 text-[#D4AF37] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>CT Contract</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Non-Custodial Security Notice */}
      <div className="p-4 bg-[#0B1220] border border-sky-500/30 rounded-2xl flex items-start gap-3.5 font-mono text-xs text-gray-300">
        <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-sky-300 block">
            ISOLATED NON-CUSTODIAL GATEWAY • PAPER TRADING BOUNDARY
          </strong>
          <p className="leading-relaxed text-gray-400">
            Reown WalletConnect sessions open directly inside your chosen external mobile or browser wallet. WORLCORE TRADE never requests seed phrases or private keys, never auto-submits on-chain transactions, and keeps Cloud SQL paper demo credits separate from external Web3 transfers.
          </p>
        </div>
      </div>

      {/* Main Two-Column Gateway Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Interactive Payment Intent Builder + Session Log */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1A2234]">
              <div>
                <h2 className="font-brand text-lg font-bold text-white">
                  Configure Payment Request &amp; EIP-681 Intent
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Build an exact transfer payload or launch hosted Reown WalletConnect Pay
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#111828] border border-[#1E293B] text-[#D4AF37] font-bold text-[10px]">
                ≈ ${estimatedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} REF USD
              </span>
            </div>

            {/* Asset & Network Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-gray-400 block">Payment Asset</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CT', 'ETH', 'USDC'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleAssetChange(item)}
                      className={`py-2 rounded-xl border font-bold transition-all ${
                        asset === item
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                          : 'bg-[#0D121D] border-[#1A2234] text-gray-400 hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-gray-400 block">Target Network</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetChain('sepolia')}
                    className={`py-2 px-2 rounded-xl border font-bold transition-all ${
                      targetChain === 'sepolia'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#0D121D] border-[#1A2234] text-gray-400 hover:text-white'
                    }`}
                  >
                    Sepolia (11155111)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetChain('mainnet')}
                    className={`py-2 px-2 rounded-xl border font-bold transition-all ${
                      targetChain === 'mainnet'
                        ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                        : 'bg-[#0D121D] border-[#1A2234] text-gray-400 hover:text-white'
                    }`}
                  >
                    Mainnet Ref (1)
                  </button>
                </div>
              </div>
            </div>

            {/* Amount + Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase text-gray-400">Amount ({asset})</label>
                <div className="flex items-center gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                        amount === preset
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 font-bold'
                          : 'bg-[#0D121D] border-[#1A2234] text-gray-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-[#07090E] border border-[#1A2234] focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none"
              />
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[10px] uppercase text-gray-400">
                  Recipient / Settlement Address
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRecipient(CORETOKEN_SPEC.treasuryAddress)}
                    className="px-2 py-0.5 rounded bg-[#141C2C] hover:bg-[#1E283D] border border-[#D4AF37]/30 text-[10px] text-[#D4AF37]"
                  >
                    Treasury
                  </button>
                  {activeAddress && (
                    <button
                      type="button"
                      onClick={() => setRecipient(activeAddress)}
                      className="px-2 py-0.5 rounded bg-[#141C2C] hover:bg-[#1E283D] border border-sky-500/30 text-[10px] text-sky-300"
                    >
                      My Wallet
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className={`w-full bg-[#07090E] border rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none ${
                  isRecipientValid
                    ? 'border-[#1A2234] focus:border-sky-400'
                    : 'border-rose-500/70 focus:border-rose-400'
                }`}
              />
              {!isRecipientValid && (
                <p className="text-[10px] text-rose-400">
                  Must be a valid 42-character Ethereum address starting with 0x.
                </p>
              )}
            </div>

            {/* Memo / Reference */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-gray-400 block">
                Reference / Settlement Memo
              </label>
              <input
                type="text"
                maxLength={80}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Optional reference label"
                className="w-full bg-[#07090E] border border-[#1A2234] focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none"
              />
            </div>

            {/* Generated EIP-681 URI Preview */}
            <div className="p-3.5 bg-[#0D121D] border border-[#1A2234] rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-gray-400">
                  EIP-681 Wallet Request URI
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('eip681', 'EIP-681 Request URI', eip681Uri)}
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                >
                  {copiedField === 'eip681' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedField === 'eip681' ? 'Copied URI' : 'Copy URI'}</span>
                </button>
              </div>
              <p className="text-[11px] text-sky-300 break-all leading-relaxed">{eip681Uri}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={REOWN_WALLETCONNECT_PAY.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordSession('reown', 'Initiated')}
                className="flex-1 min-w-[210px] py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Link2 className="w-4 h-4" />
                <span>Pay with Reown &amp; Log</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => recordSession(qrMode, 'Awaiting Signature')}
                className="px-4 py-3 bg-[#141C2C] hover:bg-[#1E283D] border border-[#D4AF37]/40 text-[#D4AF37] font-bold rounded-xl flex items-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Payment Intent</span>
              </button>
            </div>
          </div>

          {/* Local Payment Session History */}
          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl font-mono text-xs">
            <div className="p-4 bg-[#0D121D] border-b border-[#1A2234] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <h3 className="font-brand text-sm font-bold text-white uppercase tracking-wider">
                  Reown Session Reference Log ({sessions.length})
                </h3>
              </div>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => persistSessions([])}
                  className="text-[11px] text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Log</span>
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-1.5">
                <QrCode className="w-6 h-6 text-gray-500 mx-auto" />
                <p>No gateway sessions recorded yet. Launch Reown Checkout or save an intent above.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1A2234]/60 max-h-80 overflow-y-auto">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02]"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">{sess.id}</span>
                        <span className="px-2 py-0.5 rounded bg-[#141C2C] text-[#D4AF37] font-bold text-[10px]">
                          {sess.amount} {sess.asset}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase">{sess.network}</span>
                        <span className="text-[10px] text-sky-400 uppercase">[{sess.mode}]</span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        To {formatShortAddress(sess.recipient)} • {sess.memo}
                      </p>
                      <span className="text-[10px] text-gray-500 block">
                        {new Date(sess.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={sess.status}
                        onChange={(e) =>
                          updateSessionStatus(sess.id, e.target.value as SessionStatus)
                        }
                        className="bg-[#0D121D] border border-[#1A2234] rounded-lg px-2 py-1 text-[11px] text-gray-200 focus:border-sky-400 focus:outline-none"
                      >
                        <option value="Initiated">Initiated</option>
                        <option value="Awaiting Signature">Awaiting Signature</option>
                        <option value="Verified Externally">Verified Externally</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <a
                        href={`${
                          sess.network === 'sepolia'
                            ? CORETOKEN_SPEC.chain.explorerUrl
                            : 'https://etherscan.io'
                        }/address/${sess.recipient}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] rounded-lg text-sky-400"
                        title="Inspect Recipient on Etherscan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Scannable QR Gateway + Web3 Wallet & Sepolia Status */}
        <div className="lg:col-span-5 space-y-6 font-mono text-xs">
          {/* Dynamic QR Display Card */}
          <div className="bg-[#090D14] border border-sky-500/40 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-400" />
                <h2 className="font-brand text-base font-bold text-white">WalletConnect QR Terminal</h2>
              </div>
              <div className="inline-flex p-1 rounded-lg bg-[#0D121D] border border-[#1A2234]">
                <button
                  type="button"
                  onClick={() => setQrMode('reown')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                    qrMode === 'reown' ? 'bg-sky-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Reown Pay
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('eip681')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                    qrMode === 'eip681' ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  EIP-681 URI
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-[#0D121D] border border-[#1A2234] rounded-2xl space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-2xl">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${qrMode}`}
                    className="w-52 h-52 block"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-gray-500">
                    Generating QR...
                  </div>
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-semibold flex items-center justify-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {qrMode === 'reown'
                      ? 'Scan with Reown / WalletConnect Mobile App'
                      : `Scan EIP-681 Request (${amount || '0'} ${asset})`}
                  </span>
                </p>
                <p className="text-[10px] text-gray-400 break-all px-2">
                  {qrMode === 'reown' ? REOWN_WALLETCONNECT_PAY.url : eip681Uri}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'qr-payload',
                    qrMode === 'reown' ? 'Reown Checkout URL' : 'EIP-681 URI',
                    activeQrPayload
                  )
                }
                className="py-2.5 px-3 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-gray-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedField === 'qr-payload' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{copiedField === 'qr-payload' ? 'Copied' : 'Copy Active URI'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadQr}
                className="py-2.5 px-3 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-gray-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Download QR</span>
              </button>
            </div>

            <div className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase block">Reown Partner PID</span>
                <span className="text-[#D4AF37] font-bold break-all">{REOWN_WALLETCONNECT_PAY.pid}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('pid', 'Reown Partner ID', REOWN_WALLETCONNECT_PAY.pid)}
                className="p-2 bg-[#141C2C] hover:bg-[#1E283D] rounded-lg text-sky-400 shrink-0"
                title="Copy Partner ID"
              >
                {copiedField === 'pid' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Connected Web3 Wallet & Sepolia Telemetry */}
          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-brand text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#D4AF37]" />
                <span>Web3 Wallet &amp; Sepolia Bridge</span>
              </h3>
              <button
                type="button"
                onClick={loadTelemetry}
                disabled={telemetryLoading}
                className="p-1.5 bg-[#0D121D] border border-[#1A2234] hover:border-[#D4AF37]/40 rounded-lg text-gray-300"
                title="Refresh Sepolia Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${telemetryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {activeAddress ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                  <span className="text-[10px] text-gray-400 uppercase block">Bound Address</span>
                  <span className="text-white font-bold break-all">{activeAddress}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                    <span className="text-[10px] text-gray-400 uppercase block">SepoliaETH</span>
                    <span className="text-white font-bold text-sm">{onChainBalances.ethBalance} ETH</span>
                  </div>
                  <div className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                    <span className="text-[10px] text-gray-400 uppercase block">On-Chain CT</span>
                    <span className="text-[#D4AF37] font-bold text-sm">{onChainBalances.ctOnChainBalance} CT</span>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={walletBusy}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {walletBusy ? 'Connecting...' : 'Connect MetaMask / Web3 Wallet'}
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSwitchSepolia}
                disabled={walletBusy}
                className="py-2 px-3 bg-[#0D121D] hover:bg-[#141C2C] border border-sky-500/35 text-sky-300 rounded-xl flex items-center justify-center gap-1.5"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Sepolia Switch</span>
              </button>
              <button
                type="button"
                onClick={handleImportCt}
                disabled={walletBusy}
                className="py-2 px-3 bg-[#0D121D] hover:bg-[#141C2C] border border-[#D4AF37]/35 text-[#D4AF37] rounded-xl flex items-center justify-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Watch CT</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#1A2234] flex items-center justify-between text-[11px] text-gray-400">
              <span>Sepolia Block:</span>
              <span className="text-emerald-400 font-bold">
                {telemetry?.blockNumber ? `#${telemetry.blockNumber.toLocaleString()}` : telemetry?.online ? 'Online' : 'Standby'}
                {telemetry?.gasPriceGwei ? ` • ${telemetry.gasPriceGwei} Gwei` : ''}
              </span>
            </div>

            <div className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl text-[11px] text-gray-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                CoreToken (CT) uses an immutable fixed-supply ERC-20 contract (100,000,000 CT, no mint/burn/admin privileges).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
