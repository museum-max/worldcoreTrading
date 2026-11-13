import React, { useEffect, useState } from 'react';
import {
  Coins,
  Copy,
  Check,
  ExternalLink,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  FileCode2,
  Braces,
  RefreshCw,
  ArrowUpRight,
  Download,
  QrCode,
  Sparkles,
  Activity,
  Gift,
  Network,
  Link2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import {
  CORETOKEN_SPEC,
  CORETOKEN_ERC20_ABI,
  CORETOKEN_SOLIDITY_SOURCE,
  REOWN_WALLETCONNECT_PAY,
  SepoliaChainTelemetry,
  fetchSepoliaChainTelemetry,
  fetchWalletOnChainBalances,
  addCoreTokenToMetaMask,
  switchToSepoliaNetwork,
  formatShortAddress,
} from '../config/coreTokenContract.ts';
import { ReownWalletConnectCard } from '../components/ReownWalletConnectCard.tsx';

export const CoreTokenPage: React.FC = () => {
  const { user, web3Account, linkWeb3Wallet } = useAuth();
  const { addToast, setActivePage, setActiveSymbol, markets } = useTrading();

  const [activeTab, setActiveTab] = useState<'wallet' | 'receive' | 'contract'>('wallet');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<SepoliaChainTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState<boolean>(true);
  const [onChainBalances, setOnChainBalances] = useState<{ ethBalance: string; ctOnChainBalance: string }>({
    ethBalance: '0.0000',
    ctOnChainBalance: '0.00',
  });
  const [walletActionLoading, setWalletActionLoading] = useState<boolean>(false);

  const activeAddress = user?.walletAddress || web3Account?.address || '';
  const ctMarket = markets.find((m) => m.symbol === 'CT/USDT');
  const ctPrice = ctMarket?.price || 1.84;
  const demoCtBalance = parseFloat(user?.demoCtBalance || '25000');
  const demoEthBalance = parseFloat(user?.demoEthBalance || '10');
  const demoUsdBalance = parseFloat(user?.demoUsdBalance || '100000');

  const loadTelemetry = async () => {
    setTelemetryLoading(true);
    try {
      const data = await fetchSepoliaChainTelemetry();
      setTelemetry(data);
      if (activeAddress) {
        const balances = await fetchWalletOnChainBalances(activeAddress);
        setOnChainBalances(balances);
      }
    } finally {
      setTelemetryLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, [activeAddress]);

  const handleCopy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    addToast('info', 'Copied to Clipboard', `${label} copied successfully.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddToMetaMask = async () => {
    setWalletActionLoading(true);
    try {
      const res = await addCoreTokenToMetaMask();
      addToast(res.added ? 'success' : 'info', 'MetaMask Asset Watch', res.message);
    } catch (err: any) {
      addToast('error', 'MetaMask Import Error', err?.message || 'Could not prompt MetaMask token import.');
    } finally {
      setWalletActionLoading(false);
    }
  };

  const handleSwitchSepolia = async () => {
    setWalletActionLoading(true);
    try {
      const res = await switchToSepoliaNetwork();
      addToast(res.switched ? 'success' : 'info', 'Ethereum Network', res.message);
      await loadTelemetry();
    } catch (err: any) {
      addToast('error', 'Network Switch Failed', err?.message || 'MetaMask network switch was rejected.');
    } finally {
      setWalletActionLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setWalletActionLoading(true);
    try {
      await linkWeb3Wallet();
      addToast('success', 'Web3 Wallet Connected', 'Sepolia address synchronized to your profile.');
    } catch (err: any) {
      addToast('error', 'Wallet Connection Failed', err?.message || 'Could not connect Web3 wallet.');
    } finally {
      setWalletActionLoading(false);
    }
  };

  const handleDownloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'File Exported', `Downloaded ${filename}`);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#141C2E] via-[#0B101B] to-[#07090E] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#182032] border border-[#D4AF37]/50 text-[#D4AF37] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                ERC-20 UTILITY ASSET
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sepolia Testnet (Chain 11155111)
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-xl shadow-[#D4AF37]/30 bg-black shrink-0">
                <img
                  src={CORETOKEN_SPEC.logoPath}
                  alt="CoreToken (CT)"
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <div>
                <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white tracking-wide">
                  CoreToken <span className="gold-gradient-text">(CT)</span> Contract & Wallet
                </h1>
                <p className="text-xs sm:text-sm font-mono text-gray-300 mt-1">
                  OpenZeppelin ERC-20 Smart Contract Specification • Live Spot Reference: <strong className="text-[#D4AF37]">${ctPrice.toFixed(4)}</strong>
                </p>
              </div>
            </div>

            {/* Official Contract Address Bar */}
            <div className="p-3.5 bg-[#07090E]/90 border border-[#1E293B] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block">
                  CoreToken (CT) ERC-20 Contract Address (EIP-55 Verified Format)
                </span>
                <div className="text-sm sm:text-base font-bold text-[#D4AF37] break-all">
                  {CORETOKEN_SPEC.contractAddress}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy('Contract Address', CORETOKEN_SPEC.contractAddress)}
                  className="px-3 py-2 bg-[#141C2C] hover:bg-[#1E283D] border border-[#D4AF37]/40 text-white rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  {copiedField === 'Contract Address' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>{copiedField === 'Contract Address' ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={`${CORETOKEN_SPEC.chain.explorerUrl}/token/${CORETOKEN_SPEC.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-[#141C2C] hover:bg-[#1E283D] border border-[#1A2234] text-sky-400 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <span>Etherscan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Quick Wallet Actions */}
          <div className="flex flex-col gap-2.5 min-w-[250px] font-mono text-xs">
            <button
              onClick={handleAddToMetaMask}
              disabled={walletActionLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:from-[#E6BE44] hover:to-[#FBBF24] text-black font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              <span>Add CT Token to MetaMask</span>
            </button>

            <button
              onClick={handleSwitchSepolia}
              disabled={walletActionLoading}
              className="w-full py-2.5 px-4 bg-[#121A2B] hover:bg-[#1B263E] border border-sky-500/40 text-sky-300 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Network className="w-4 h-4" />
              <span>Switch Wallet to Sepolia</span>
            </button>

            <a
              href={REOWN_WALLETCONNECT_PAY.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-600/30 border border-sky-400/50 text-sky-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Link2 className="w-4 h-4 text-sky-400" />
              <span>Reown WalletConnect Pay</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            </a>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveSymbol('CT/USDT');
                  setActivePage('terminal');
                }}
                className="py-2 px-3 bg-[#0D121D] hover:bg-[#161F30] border border-[#1A2234] text-gray-200 rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <span>Trade CT</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37]" />
              </button>
              <button
                onClick={() => setActivePage('rewards')}
                className="py-2 px-3 bg-[#0D121D] hover:bg-[#161F30] border border-[#1A2234] text-gray-200 rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <Gift className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Earn CT</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Regulatory Distinction Banner */}
      <div className="p-4 bg-[#0D1422] border border-sky-500/30 rounded-2xl flex items-start gap-3.5 font-mono text-xs text-gray-300">
        <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-sky-300 block">
            PAPER DEMO CREDITS vs ETHEREUM SEPOLIA ERC-20 TESTNET CONTRACT:
          </strong>
          <p className="leading-relaxed text-gray-300">
            Your platform balances (<strong>{demoCtBalance.toLocaleString()} CT</strong> & <strong>{demoEthBalance.toFixed(2)} ETH</strong>) are simulated demo credits stored in Cloud SQL for paper trading and rewards testing. Real token deployment from this web interface and real-money deposits remain disabled; MetaMask integration uses standard EIP-1193 <code className="text-[#D4AF37]">wallet_watchAsset</code> and read-only Sepolia JSON-RPC inspection.
          </p>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1A2234] pb-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${
              activeTab === 'wallet'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'bg-[#090D14] text-gray-400 hover:text-white border border-[#1A2234]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>CoreToken Wallet & Telemetry</span>
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${
              activeTab === 'receive'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'bg-[#090D14] text-gray-400 hover:text-white border border-[#1A2234]'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Receive & Import Token</span>
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${
              activeTab === 'contract'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'bg-[#090D14] text-gray-400 hover:text-white border border-[#1A2234]'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Solidity Contract, ABI & Tokenomics</span>
          </button>
        </div>

        <button
          onClick={loadTelemetry}
          disabled={telemetryLoading}
          className="px-3 py-1.5 bg-[#090D14] hover:bg-[#141B2B] border border-[#1A2234] text-gray-300 rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${telemetryLoading ? 'animate-spin' : ''}`} />
          <span>Sync Sepolia RPC</span>
        </button>
      </div>

      {/* TAB 1: WALLET & TELEMETRY */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Paper Ledger + Connected Web3 Wallet */}
          <div className="lg:col-span-7 space-y-6">
            {/* Demo Paper Balances */}
            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-brand text-lg font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#D4AF37]" />
                  <span>Paper Ecosystem Wallet Ledger</span>
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  DEMO CREDITS ONLY
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-[#0D121D] border border-[#D4AF37]/30 rounded-xl">
                  <span className="text-[10px] text-gray-400 uppercase block">CoreToken (CT)</span>
                  <span className="text-xl font-bold text-[#D4AF37] mt-1 block">
                    {demoCtBalance.toLocaleString()} CT
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">
                    ≈ ${(demoCtBalance * ctPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} Paper USD
                  </span>
                </div>

                <div className="p-4 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                  <span className="text-[10px] text-gray-400 uppercase block">Demo Ethereum (ETH)</span>
                  <span className="text-xl font-bold text-sky-400 mt-1 block">
                    {demoEthBalance.toFixed(4)} ETH
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">Simulated Pair Collateral</span>
                </div>

                <div className="p-4 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                  <span className="text-[10px] text-gray-400 uppercase block">Demo Cash (USD)</span>
                  <span className="text-xl font-bold text-emerald-400 mt-1 block">
                    ${demoUsdBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">Paper Trading Liquidity</span>
                </div>
              </div>
            </div>

            {/* Connected Web3 Wallet On-Chain Reader */}
            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-brand text-lg font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-sky-400" />
                  <span>Connected Web3 Address (Sepolia Read-Only)</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  EIP-1193
                </span>
              </div>

              {activeAddress ? (
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-3.5 bg-[#0D121D] border border-[#1A2234] rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-400 uppercase block">Bound Ethereum Address</span>
                      <span className="text-white font-bold break-all">{activeAddress}</span>
                    </div>
                    <button
                      onClick={() => handleCopy('Wallet Address', activeAddress)}
                      className="p-2 bg-[#141C2C] hover:bg-[#1E283D] rounded-lg text-[#D4AF37] shrink-0"
                      title="Copy Wallet Address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                      <span className="text-[10px] text-gray-400 uppercase block">On-Chain SepoliaETH</span>
                      <span className="text-lg font-bold text-white mt-1 block">
                        {onChainBalances.ethBalance} SepoliaETH
                      </span>
                      <span className="text-[10px] text-gray-500">Live eth_getBalance query</span>
                    </div>
                    <div className="p-3.5 bg-[#0D121D] border border-[#1A2234] rounded-xl">
                      <span className="text-[10px] text-gray-400 uppercase block">On-Chain CT balanceOf()</span>
                      <span className="text-lg font-bold text-[#D4AF37] mt-1 block">
                        {onChainBalances.ctOnChainBalance} CT
                      </span>
                      <span className="text-[10px] text-gray-500">Contract {formatShortAddress(CORETOKEN_SPEC.contractAddress)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-[#0D121D] border border-[#1A2234] rounded-xl text-center space-y-3 font-mono text-xs">
                  <p className="text-gray-400">
                    Connect MetaMask or bind an Ethereum address to inspect live Sepolia balances alongside your paper account.
                  </p>
                  <button
                    onClick={handleConnectWallet}
                    disabled={walletActionLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold rounded-xl shadow-lg"
                  >
                    {walletActionLoading ? 'Connecting Wallet...' : 'Connect MetaMask / Web3 Wallet'}
                  </button>
                </div>
              )}

              <ReownWalletConnectCard variant="compact" />
            </div>
          </div>

          {/* Right Column: Live Sepolia JSON-RPC Telemetry */}
          <div className="lg:col-span-5 bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-brand text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span>Sepolia Network Telemetry</span>
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  telemetry?.online
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {telemetry?.online ? 'RPC ONLINE' : 'STANDBY'}
              </span>
            </div>

            <div className="divide-y divide-[#1A2234]">
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Target Blockchain:</span>
                <span className="text-white font-bold">{CORETOKEN_SPEC.chain.name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Chain ID:</span>
                <span className="text-[#D4AF37] font-bold">
                  {CORETOKEN_SPEC.chain.chainId} ({CORETOKEN_SPEC.chain.chainIdHex})
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Latest Sepolia Block:</span>
                <span className="text-emerald-400 font-bold">
                  {telemetry?.blockNumber ? `#${telemetry.blockNumber.toLocaleString()}` : 'Querying...'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Base Gas Fee:</span>
                <span className="text-white font-bold">
                  {telemetry?.gasPriceGwei ? `${telemetry.gasPriceGwei} Gwei` : '—'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Token Standard:</span>
                <span className="text-white font-bold">ERC-20 / EIP-2612</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Decimals:</span>
                <span className="text-white font-bold">{CORETOKEN_SPEC.decimals}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Max Hard Cap:</span>
                <span className="text-[#D4AF37] font-bold">
                  {CORETOKEN_SPEC.maxSupply.toLocaleString()} CT
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400">Contract Bytecode:</span>
                <span className="text-sky-300 font-bold">
                  {telemetry?.contractDeployedOnChain ? 'Live on Sepolia' : 'Staged for Sepolia Deploy'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl text-[11px] text-gray-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Deployment Guard Active</span>
              </div>
              <p>
                Private keys are never handled on client or server. Automated contract broadcast remains disabled until institutional governance sign-off.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVE & IMPORT TOKEN */}
      {activeTab === 'receive' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="font-brand text-lg font-bold text-white">Receive Testnet Assets</h2>
            </div>

            <div className="p-4 bg-[#0D121D] border border-[#1A2234] rounded-xl space-y-2">
              <span className="text-[10px] uppercase text-gray-400 block">Your Connected Receive Address</span>
              <p className="text-sm font-bold text-white break-all">
                {activeAddress || 'No Web3 wallet bound yet — connect MetaMask below'}
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                {activeAddress ? (
                  <button
                    onClick={() => handleCopy('Receive Address', activeAddress)}
                    className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Wallet Address</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect MetaMask</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 leading-relaxed">
              <strong>Testnet Only Notice:</strong> Only use Ethereum Sepolia Testnet (Chain ID 11155111). Never send real mainnet ETH or mainnet ERC-20 tokens to testing addresses.
            </div>
          </div>

          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="font-brand text-lg font-bold text-white">Custom Token Import Specs</h2>
            </div>

            <div className="space-y-2.5 bg-[#0D121D] border border-[#1A2234] rounded-xl p-4">
              <div className="flex justify-between items-center gap-2">
                <span className="text-gray-400">Token Contract Address:</span>
                <button
                  onClick={() => handleCopy('CT Contract', CORETOKEN_SPEC.contractAddress)}
                  className="text-[#D4AF37] hover:underline font-bold truncate max-w-[230px]"
                >
                  {CORETOKEN_SPEC.contractAddress}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token Symbol:</span>
                <span className="text-white font-bold">{CORETOKEN_SPEC.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token Precision (Decimals):</span>
                <span className="text-white font-bold">{CORETOKEN_SPEC.decimals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network / Chain ID:</span>
                <span className="text-emerald-400 font-bold">Sepolia (11155111)</span>
              </div>
            </div>

            <button
              onClick={handleAddToMetaMask}
              disabled={walletActionLoading}
              className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              <span>1-Click Import CT via EIP-747 (wallet_watchAsset)</span>
            </button>
          </div>

          <div className="md:col-span-2">
            <ReownWalletConnectCard variant="full" />
          </div>
        </div>
      )}

      {/* TAB 3: SOLIDITY CONTRACT, ABI & TOKENOMICS */}
      {activeTab === 'contract' && (
        <div className="space-y-6">
          {/* Tokenomics Allocation Matrix */}
          <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="font-brand text-lg font-bold text-white">
                CoreToken (CT) Allocation Architecture (100,000,000 CT Cap)
              </h2>
              <span className="text-xs font-mono text-[#D4AF37]">
                Genesis Circulating Supply: {CORETOKEN_SPEC.circulatingDemoSupply.toLocaleString()} CT
              </span>
            </div>

            <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[#141C2C]">
              {CORETOKEN_SPEC.allocations.map((alloc) => (
                <div
                  key={alloc.label}
                  style={{ width: `${alloc.percentage}%`, backgroundColor: alloc.color }}
                  title={`${alloc.label}: ${alloc.percentage}%`}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs pt-2">
              {CORETOKEN_SPEC.allocations.map((alloc) => (
                <div key={alloc.label} className="p-3 bg-[#0D121D] border border-[#1A2234] rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alloc.color }} />
                    <span className="font-bold text-white">{alloc.percentage}%</span>
                  </div>
                  <p className="font-bold text-white text-[11px] leading-snug">{alloc.label}</p>
                  <p className="text-[#D4AF37] font-semibold">{alloc.amount.toLocaleString()} CT</p>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed">{alloc.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Solidity + ABI Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
            {/* Solidity Source */}
            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl flex flex-col">
              <div className="p-4 bg-[#0D121D] border-b border-[#1A2234] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-bold text-white">contracts/CoreToken.sol</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy('Solidity Source', CORETOKEN_SOLIDITY_SOURCE)}
                    className="px-2.5 py-1 bg-[#141C2C] hover:bg-[#1E283D] rounded-lg text-gray-200 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3 text-[#D4AF37]" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => handleDownloadFile('CoreToken.sol', CORETOKEN_SOLIDITY_SOURCE, 'text/plain')}
                    className="px-2.5 py-1 bg-[#D4AF37] text-black font-bold rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>.sol</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 text-[11px] leading-relaxed text-gray-300 overflow-x-auto max-h-96">
                {CORETOKEN_SOLIDITY_SOURCE}
              </pre>
            </div>

            {/* ERC-20 ABI */}
            <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl flex flex-col">
              <div className="p-4 bg-[#0D121D] border-b border-[#1A2234] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Braces className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-white">CoreToken ERC-20 ABI</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy('ERC-20 ABI', JSON.stringify(CORETOKEN_ERC20_ABI, null, 2))}
                    className="px-2.5 py-1 bg-[#141C2C] hover:bg-[#1E283D] rounded-lg text-gray-200 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3 text-sky-400" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadFile(
                        'CoreToken.abi.json',
                        JSON.stringify(CORETOKEN_ERC20_ABI, null, 2),
                        'application/json'
                      )
                    }
                    className="px-2.5 py-1 bg-sky-500 text-black font-bold rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>.json</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 text-[11px] leading-relaxed text-sky-200/90 overflow-x-auto max-h-96">
                {JSON.stringify(CORETOKEN_ERC20_ABI, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
