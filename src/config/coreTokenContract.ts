export interface TokenAllocationItem {
  label: string;
  percentage: number;
  amount: number;
  color: string;
  description: string;
}

export interface SepoliaChainTelemetry {
  online: boolean;
  chainId: number;
  networkName: string;
  blockNumber: number | null;
  gasPriceGwei: string | null;
  rpcEndpoint: string;
  contractDeployedOnChain: boolean;
  onChainTotalSupplyCt: string | null;
  error?: string;
}

export const REOWN_WALLETCONNECT_PAY = {
  provider: 'Reown (WalletConnect Pay)',
  pid: 'pay_43a2ecc101M7B6TPZE4YQS22QA9QJGCAW2',
  url: 'https://pay.walletconnect.com/?pid=pay_43a2ecc101M7B6TPZE4YQS22QA9QJGCAW2',
  protocol: 'WalletConnect v2 / EIP-681',
  supportedWallets: ['MetaMask Mobile', 'Trust Wallet', 'Coinbase Wallet', 'Rainbow', 'Ledger Live'],
} as const;

export const CORETOKEN_SPEC = {
  name: 'CoreToken',
  symbol: 'CT',
  decimals: 18,
  standard: 'ERC-20 (OpenZeppelin v5 + EIP-2612 Permit)',
  // Valid EIP-55 checksummed contract address staged for Ethereum Sepolia Testnet
  contractAddress: '0xc07E97021A8F4B2b8D1c63e4f8A91D52e7B3a901',
  treasuryAddress: '0x71C8F79963503D002778A699b0cE433c2C5349A2',
  maxSupply: 100_000_000,
  circulatingDemoSupply: 18_450_000,
  chain: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Ethereum Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SepoliaETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.drpc.org',
    ],
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  logoPath: '/assets/aistudio/WorldCore_Sovereign_Relic__937021.png__1__a71ea953.jpg',
  deploymentStatus: 'Sepolia Testnet Prepared (Auto-Deploy Disabled)',
  allocations: [
    {
      label: 'Ecosystem & Trading Rewards',
      percentage: 35,
      amount: 35_000_000,
      color: '#D4AF37',
      description: 'Campaign quests, VIP rebate tiers, and referral emissions',
    },
    {
      label: 'Liquidity & Market Making',
      percentage: 25,
      amount: 25_000_000,
      color: '#10B981',
      description: 'CT/USDT & CT/ETH pool depth and institutional order book reserves',
    },
    {
      label: 'Protocol Treasury Reserve',
      percentage: 20,
      amount: 20_000_000,
      color: '#38BDF8',
      description: 'Multi-sig governance reserve for EtherPulse infrastructure',
    },
    {
      label: 'Staking & Sovereign Vault',
      percentage: 15,
      amount: 15_000_000,
      color: '#F59E0B',
      description: 'Yield boosts tied to WorldCore Sovereign Relic NFT multipliers',
    },
    {
      label: 'Genesis Contributors',
      percentage: 5,
      amount: 5_000_000,
      color: '#A855F7',
      description: 'Time-locked core engineering & security audit allocation',
    },
  ] as TokenAllocationItem[],
};

export const CORETOKEN_ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_SUPPLY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'value', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'spender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
] as const;

export const CORETOKEN_SOLIDITY_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CoreToken (CT)
 * @notice Ecosystem utility token for WORLCORE TRADE & EtherPulse.
 * @dev Prepared for Ethereum Sepolia Testnet (Chain ID: 11155111).
 */
contract CoreToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
    uint256 public constant INITIAL_GENESIS_ALLOCATION = 18_450_000 * 10 ** 18;

    address public rewardsTreasury;

    event RewardsTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event EcosystemRewardMinted(address indexed recipient, uint256 amount, string campaignKey);

    constructor(address initialOwner, address initialTreasury)
        ERC20("CoreToken", "CT")
        ERC20Permit("CoreToken")
        Ownable(initialOwner)
    {
        require(initialTreasury != address(0), "CoreToken: zero treasury address");
        rewardsTreasury = initialTreasury;
        _mint(initialTreasury, INITIAL_GENESIS_ALLOCATION);
    }

    function setRewardsTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "CoreToken: zero treasury address");
        address oldTreasury = rewardsTreasury;
        rewardsTreasury = newTreasury;
        emit RewardsTreasuryUpdated(oldTreasury, newTreasury);
    }

    function mintRewardAllocation(
        address recipient,
        uint256 amount,
        string calldata campaignKey
    ) external onlyOwner {
        require(recipient != address(0), "CoreToken: zero recipient");
        require(totalSupply() + amount <= MAX_SUPPLY, "CoreToken: max supply exceeded");
        _mint(recipient, amount);
        emit EcosystemRewardMinted(recipient, amount, campaignKey);
    }
}`;

export function formatShortAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length < start + end) return address || '';
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

async function sepoliaRpcCall(rpcUrl: string, method: string, params: unknown[] = []): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'RPC error');
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSepoliaChainTelemetry(): Promise<SepoliaChainTelemetry> {
  for (const rpcUrl of CORETOKEN_SPEC.chain.rpcUrls) {
    try {
      const [blockHex, gasHex, codeHex] = await Promise.all([
        sepoliaRpcCall(rpcUrl, 'eth_blockNumber'),
        sepoliaRpcCall(rpcUrl, 'eth_gasPrice'),
        sepoliaRpcCall(rpcUrl, 'eth_getCode', [CORETOKEN_SPEC.contractAddress, 'latest']),
      ]);

      const blockNumber = blockHex ? parseInt(blockHex, 16) : null;
      const gasWei = gasHex ? BigInt(gasHex) : 0n;
      const gasPriceGwei = (Number(gasWei) / 1e9).toFixed(2);
      const contractDeployedOnChain = Boolean(codeHex && codeHex !== '0x' && codeHex.length > 2);

      let onChainTotalSupplyCt: string | null = null;
      if (contractDeployedOnChain) {
        try {
          // totalSupply() selector: 0x18160ddd
          const supplyHex = await sepoliaRpcCall(rpcUrl, 'eth_call', [
            { to: CORETOKEN_SPEC.contractAddress, data: '0x18160ddd' },
            'latest',
          ]);
          if (supplyHex && supplyHex !== '0x') {
            const rawSupply = BigInt(supplyHex);
            onChainTotalSupplyCt = (rawSupply / 10n ** 18n).toString();
          }
        } catch {
          onChainTotalSupplyCt = null;
        }
      }

      return {
        online: true,
        chainId: CORETOKEN_SPEC.chain.chainId,
        networkName: CORETOKEN_SPEC.chain.name,
        blockNumber,
        gasPriceGwei,
        rpcEndpoint: rpcUrl,
        contractDeployedOnChain,
        onChainTotalSupplyCt,
      };
    } catch {
      continue;
    }
  }

  return {
    online: false,
    chainId: CORETOKEN_SPEC.chain.chainId,
    networkName: CORETOKEN_SPEC.chain.name,
    blockNumber: null,
    gasPriceGwei: null,
    rpcEndpoint: CORETOKEN_SPEC.chain.rpcUrls[0],
    contractDeployedOnChain: false,
    onChainTotalSupplyCt: null,
    error: 'Sepolia public RPC temporarily unreachable',
  };
}

export async function fetchWalletOnChainBalances(walletAddress: string): Promise<{
  ethBalance: string;
  ctOnChainBalance: string;
}> {
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return { ethBalance: '0.0000', ctOnChainBalance: '0.00' };
  }

  for (const rpcUrl of CORETOKEN_SPEC.chain.rpcUrls) {
    try {
      const ethHex = await sepoliaRpcCall(rpcUrl, 'eth_getBalance', [walletAddress, 'latest']);
      const ethWei = ethHex ? BigInt(ethHex) : 0n;
      const ethFormatted = (Number(ethWei) / 1e18).toFixed(4);

      let ctFormatted = '0.00';
      try {
        // balanceOf(address) selector: 0x70a08231 + 32-byte padded address
        const paddedAddr = walletAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
        const callData = `0x70a08231${paddedAddr}`;
        const ctHex = await sepoliaRpcCall(rpcUrl, 'eth_call', [
          { to: CORETOKEN_SPEC.contractAddress, data: callData },
          'latest',
        ]);
        if (ctHex && ctHex !== '0x' && ctHex.length >= 66) {
          const ctWei = BigInt(ctHex);
          ctFormatted = (Number(ctWei / 10n ** 16n) / 100).toFixed(2);
        }
      } catch {
        ctFormatted = '0.00';
      }

      return { ethBalance: ethFormatted, ctOnChainBalance: ctFormatted };
    } catch {
      continue;
    }
  }

  return { ethBalance: '0.0000', ctOnChainBalance: '0.00' };
}

export async function switchToSepoliaNetwork(): Promise<{ switched: boolean; message: string }> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return { switched: false, message: 'MetaMask or an injected Web3 wallet was not detected in this browser.' };
  }

  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CORETOKEN_SPEC.chain.chainIdHex }],
    });
    return { switched: true, message: 'Wallet switched to Ethereum Sepolia Testnet (11155111).' };
  } catch (switchErr: any) {
    if (switchErr?.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: CORETOKEN_SPEC.chain.chainIdHex,
            chainName: CORETOKEN_SPEC.chain.name,
            nativeCurrency: CORETOKEN_SPEC.chain.nativeCurrency,
            rpcUrls: CORETOKEN_SPEC.chain.rpcUrls,
            blockExplorerUrls: [CORETOKEN_SPEC.chain.explorerUrl],
          },
        ],
      });
      return { switched: true, message: 'Ethereum Sepolia Testnet added and activated in wallet.' };
    }
    throw switchErr;
  }
}

export async function addCoreTokenToMetaMask(): Promise<{ added: boolean; message: string }> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return {
      added: false,
      message: 'MetaMask extension not detected. Copy the contract address below to import manually.',
    };
  }

  const ethereum = (window as any).ethereum;
  const origin = window.location.origin;
  const tokenImage = `${origin}${CORETOKEN_SPEC.logoPath}`;

  const wasAdded = await ethereum.request({
    method: 'wallet_watchAsset',
    params: {
      type: 'ERC20',
      options: {
        address: CORETOKEN_SPEC.contractAddress,
        symbol: CORETOKEN_SPEC.symbol,
        decimals: CORETOKEN_SPEC.decimals,
        image: tokenImage,
      },
    },
  });

  if (wasAdded) {
    return {
      added: true,
      message: `CoreToken (${CORETOKEN_SPEC.symbol}) has been imported into your MetaMask watchlist.`,
    };
  }
  return {
    added: false,
    message: 'Token import was cancelled in MetaMask.',
  };
}
