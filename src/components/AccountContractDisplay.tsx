import React from 'react';
import {
  Check,
  Copy,
  Cpu,
  ExternalLink,
  History,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { CORETOKEN_SPEC } from '../config/coreTokenContract.ts';
import { TradeOrder } from '../types/index.ts';

interface AccountContractDisplayProps {
  userUid?: string;
  accountLabel: string;
  userCtContractAddress: string;
  walletAddress: string;
  hasCtTrades: boolean;
  ctOrders: TradeOrder[];
  loadingCtContract: boolean;
  provisioningCt: boolean;
  copiedField: string | null;
  onCopy: (label: string, value: string) => void;
  onProvisionCtContract: () => void;
  onConnectWallet: () => void;
  onTradeCt: () => void;
  onViewInAppHistory: () => void;
}

export const AccountContractDisplay: React.FC<AccountContractDisplayProps> = ({
  userUid,
  accountLabel,
  userCtContractAddress,
  walletAddress,
  hasCtTrades,
  ctOrders,
  loadingCtContract,
  provisioningCt,
  copiedField,
  onCopy,
  onProvisionCtContract,
  onConnectWallet,
  onTradeCt,
  onViewInAppHistory,
}) => {
  const explorerBase = CORETOKEN_SPEC.chain.explorerUrl;
  const latestCtOrder = ctOrders[0];

  return (
    <section
      aria-labelledby="account-contract-registry-heading"
      className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1A2234]">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-mono text-gray-400">
            Account: <span className="text-gray-200">{accountLabel}</span>
            <span aria-hidden="true"> · </span>
            <span>{CORETOKEN_SPEC.chain.name}</span>
            <span aria-hidden="true"> · </span>
            <span className="tabular-nums">{ctOrders.length} CT Trades Recorded</span>
          </p>
          <h2
            id="account-contract-registry-heading"
            className="font-brand text-xl font-bold text-white"
          >
            Linked Account Contract Addresses &amp; Explorer History
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs shrink-0">
          {userCtContractAddress && (
            <a
              href={`${explorerBase}/address/${userCtContractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E6BE44] text-black font-bold rounded-xl inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <span>View Transactions on Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onViewInAppHistory}
            className="px-4 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <History className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>In-App Ledger</span>
          </button>
        </div>
      </div>

      {/* Hairline-divided rows: Zero nested cards */}
      <div className="divide-y divide-[#1A2234] font-mono text-xs">
        {/* Row 1: User-Specific CT Trader Contract */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-sm font-semibold text-white">
                Your Account CT Trader Contract Address
              </span>
              <span className="text-gray-400">
                <span aria-hidden="true">· </span>
                {hasCtTrades
                  ? 'Active CT Vault Binding'
                  : 'Staged Sepolia CREATE2 · Paper Settlement'}
              </span>
            </div>

            {loadingCtContract && !userCtContractAddress ? (
              <div className="flex items-center gap-2 text-gray-400 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Resolving contract address bound to your account...</span>
              </div>
            ) : userCtContractAddress ? (
              <>
                <p className="text-sm sm:text-base font-bold text-cyan-300 break-all tabular-nums">
                  {userCtContractAddress}
                </p>
                <p className="text-[11px] text-gray-400 tabular-nums">
                  Derived deterministically for UID{' '}
                  <span className="text-gray-300">{userUid || 'guest'}</span>
                  {latestCtOrder?.createdAt && (
                    <>
                      <span aria-hidden="true"> · </span>
                      Last CT Execution:{' '}
                      {new Date(latestCtOrder.createdAt).toLocaleString()}
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="text-gray-400 leading-relaxed max-w-2xl">
                No CT trader contract address is assigned to this account yet. Execute a CT/USDT trade or generate your deterministic contract address now.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {userCtContractAddress ? (
              <>
                <button
                  type="button"
                  onClick={() => onCopy('Account CT Contract', userCtContractAddress)}
                  className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedField === 'Account CT Contract' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{copiedField === 'Account CT Contract' ? 'Copied' : 'Copy Address'}</span>
                </button>
                <a
                  href={`${explorerBase}/address/${userCtContractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-cyan-500/40 text-cyan-300 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explorer Tx History</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`${explorerBase}/address/${userCtContractAddress}#tokentxns`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-300 hover:text-white rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>ERC-20 Transfers</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onProvisionCtContract}
                  disabled={provisioningCt}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {provisioningCt ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cpu className="w-3.5 h-3.5" />
                  )}
                  <span>{provisioningCt ? 'Generating...' : 'Generate Contract Address'}</span>
                </button>
                <button
                  type="button"
                  onClick={onTradeCt}
                  className="px-4 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Trade CT/USDT</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Connected Web3 Wallet Address */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-sm font-semibold text-white">
                Linked Web3 Signer Address
              </span>
              <span className="text-gray-400">
                <span aria-hidden="true">· </span>
                MetaMask / EIP-1193
              </span>
            </div>
            {walletAddress ? (
              <p className="text-sm font-bold text-white break-all tabular-nums">
                {walletAddress}
              </p>
            ) : (
              <p className="text-gray-400">
                No external Web3 wallet address is linked to this profile yet.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {walletAddress ? (
              <>
                <button
                  type="button"
                  onClick={() => onCopy('Linked Web3 Wallet', walletAddress)}
                  className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedField === 'Linked Web3 Wallet' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{copiedField === 'Linked Web3 Wallet' ? 'Copied' : 'Copy Address'}</span>
                </button>
                <a
                  href={`${explorerBase}/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-sky-500/40 text-sky-300 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explorer Tx History</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={onConnectWallet}
                className="px-4 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-sky-300 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect Web3 Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Master CoreToken (CT) ERC-20 Reference Contract */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span className="text-sm font-semibold text-white">
                CoreToken (CT) Protocol ERC-20 Contract
              </span>
              <span className="text-gray-400">
                <span aria-hidden="true">· </span>
                {CORETOKEN_SPEC.standard}
              </span>
            </div>
            <p className="text-sm font-bold text-[#D4AF37] break-all tabular-nums">
              {CORETOKEN_SPEC.contractAddress}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onCopy('Protocol CT Contract', CORETOKEN_SPEC.contractAddress)}
              className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#1A2234] text-gray-200 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedField === 'Protocol CT Contract' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
              )}
              <span>{copiedField === 'Protocol CT Contract' ? 'Copied' : 'Copy Address'}</span>
            </button>
            <a
              href={`${explorerBase}/token/${CORETOKEN_SPEC.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-[#0D121D] hover:bg-[#141C2C] border border-[#D4AF37]/40 text-[#D4AF37] rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Explorer Token &amp; Txs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="px-6 py-3.5 bg-[#0D121D] border-t border-[#1A2234] font-mono text-[11px] text-gray-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          Explorer links open Ethereum Sepolia Testnet ({explorerBase.replace('https://', '')}). Paper CT trade executions are settled in the platform ledger with live deployment disabled.
        </span>
        <span className="text-gray-500 whitespace-nowrap shrink-0">Chain ID 11155111</span>
      </div>
    </section>
  );
};
