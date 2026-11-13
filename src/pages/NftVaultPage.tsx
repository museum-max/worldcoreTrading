import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Download,
  Gem,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Coins,
  Wallet,
  FileJson,
  FileImage,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  Lock,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTrading } from '../context/TradingContext.tsx';
import { NFT_CATALOG } from '../data/nftCatalog.ts';
import { NftItem, UserNft } from '../types/index.ts';
import {
  downloadNftArtwork,
  downloadNftMetadata,
  downloadOwnershipCertificatePng,
} from '../utils/nftDownloader.ts';
import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase.ts';

const USER_NFTS_STORAGE_KEY = 'worlcore_user_nfts_';

export const NftVaultPage: React.FC = () => {
  const { user, getAuthHeader, updateBalancesLocally } = useAuth();
  const { addToast, resetBalances, setAuthModalOpen } = useTrading();

  const [activeTab, setActiveTab] = useState<'catalog' | 'my_nfts'>('catalog');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // User's acquired NFTs list (persisted in localStorage + synced with Firestore/DB)
  const [userNfts, setUserNfts] = useState<UserNft[]>([]);

  // Modals state
  const [inspectNft, setInspectNft] = useState<NftItem | UserNft | null>(null);
  const [purchaseNft, setPurchaseNft] = useState<NftItem | null>(null);
  const [purchaseCurrency, setPurchaseCurrency] = useState<'CT' | 'ETH'>('CT');
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [purchaseSuccessItem, setPurchaseSuccessItem] = useState<UserNft | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load user NFTs from local storage on mount / user change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userUid = user?.uid || 'guest';
    try {
      const raw = localStorage.getItem(`${USER_NFTS_STORAGE_KEY}${userUid}`);
      if (raw) {
        setUserNfts(JSON.parse(raw));
      } else {
        setUserNfts([]);
      }
    } catch {
      setUserNfts([]);
    }
  }, [user?.uid]);

  // Persist user NFTs to localStorage
  const saveUserNftsLocally = (nfts: UserNft[]) => {
    if (typeof window === 'undefined') return;
    const userUid = user?.uid || 'guest';
    try {
      localStorage.setItem(`${USER_NFTS_STORAGE_KEY}${userUid}`, JSON.stringify(nfts));
    } catch (e) {
      console.warn('Failed to save NFTs locally:', e);
    }
  };

  // Filtered Catalog
  const filteredCatalog = NFT_CATALOG.filter((item) => {
    const matchesRarity = selectedRarity === 'all' || item.rarity.toLowerCase() === selectedRarity.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tokenId.includes(searchQuery) ||
      item.collection.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRarity && matchesSearch;
  });

  // Handle NFT Purchase
  const handleConfirmPurchase = async () => {
    if (!purchaseNft) return;

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const currentCt = parseFloat(user.demoCtBalance || '0');
    const currentEth = parseFloat(user.demoEthBalance || '0');

    if (purchaseCurrency === 'CT' && currentCt < purchaseNft.priceCt) {
      addToast(
        'error',
        'Insufficient CT Balance',
        `You need ${purchaseNft.priceCt} CT, but currently have ${currentCt.toFixed(2)} CT.`
      );
      return;
    }

    if (purchaseCurrency === 'ETH' && currentEth < purchaseNft.priceEth) {
      addToast(
        'error',
        'Insufficient ETH Balance',
        `You need ${purchaseNft.priceEth} ETH, but currently have ${currentEth.toFixed(4)} ETH.`
      );
      return;
    }

    setIsPurchasing(true);

    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/nft/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          nftId: purchaseNft.id,
          currency: purchaseCurrency,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purchase failed');
      }

      const data = await res.json();
      const newUserNft: UserNft = data.userNft;

      // Update local balances immediately
      if (purchaseCurrency === 'CT') {
        updateBalancesLocally({ demoCtBalance: (currentCt - purchaseNft.priceCt).toFixed(2) });
      } else {
        updateBalancesLocally({ demoEthBalance: (currentEth - purchaseNft.priceEth).toFixed(4) });
      }

      // Sync with Firestore if active
      try {
        if (user.uid) {
          const nftDocRef = doc(firestoreDb, 'user_nfts', newUserNft.id);
          await setDoc(nftDocRef, {
            ...newUserNft,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (firestoreErr) {
        console.warn('Firestore NFT backup notice:', firestoreErr);
      }

      // Update local array & storage
      const updatedList = [newUserNft, ...userNfts];
      setUserNfts(updatedList);
      saveUserNftsLocally(updatedList);

      // Gold Celebration Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#F3E5AB', '#10B981', '#06B6D4'],
        });
      } catch {}

      setPurchaseSuccessItem(newUserNft);
      setPurchaseNft(null);
      addToast('success', 'Relic Acquired!', `Successfully minted ${newUserNft.name}`);
    } catch (err: any) {
      console.error('Purchase error:', err);
      // Client-side demo fallback if offline
      const pricePaid = purchaseCurrency === 'CT' ? `${purchaseNft.priceCt} CT` : `${purchaseNft.priceEth} ETH`;
      const fallbackNft: UserNft = {
        id: `nft_${Date.now()}`,
        userUid: user.uid,
        tokenId: purchaseNft.tokenId,
        name: purchaseNft.name,
        edition: purchaseNft.edition,
        collection: purchaseNft.collection,
        image: purchaseNft.image,
        rarity: purchaseNft.rarity,
        pricePaid,
        currency: purchaseCurrency,
        txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        ownerAddress: user.walletAddress || '0x71C934eA8451b68233C29158309530f9A9370210',
        acquiredAt: new Date().toISOString(),
      };

      if (purchaseCurrency === 'CT') {
        updateBalancesLocally({ demoCtBalance: Math.max(0, currentCt - purchaseNft.priceCt).toFixed(2) });
      } else {
        updateBalancesLocally({ demoEthBalance: Math.max(0, currentEth - purchaseNft.priceEth).toFixed(4) });
      }

      const updatedList = [fallbackNft, ...userNfts];
      setUserNfts(updatedList);
      saveUserNftsLocally(updatedList);

      setPurchaseSuccessItem(fallbackNft);
      setPurchaseNft(null);
      addToast('success', 'Relic Acquired!', `Successfully minted ${fallbackNft.name}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Download Handlers
  const handleDownloadArtwork = async (item: NftItem | UserNft) => {
    setDownloadingId(item.tokenId);
    addToast('info', 'Downloading Artwork...', `Preparing high-res file for ${item.name}`);
    try {
      await downloadNftArtwork(item);
      addToast('success', 'Download Complete', 'Saved original NFT asset to your computer');
    } catch (err) {
      console.error(err);
      addToast('error', 'Download Failed', 'Could not save image file');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadMetadata = (item: NftItem | UserNft) => {
    try {
      downloadNftMetadata(item, user?.walletAddress || user?.email);
      addToast('success', 'Metadata Exported', 'Saved ERC-721 JSON certificate');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadCertificatePng = async (item: NftItem | UserNft) => {
    setDownloadingId(item.tokenId);
    addToast('info', 'Rendering Certificate...', 'Generating cryptographic Certificate of Ownership');
    try {
      await downloadOwnershipCertificatePng(
        item,
        user?.walletAddress || user?.displayName || user?.email || 'Institutional Holder'
      );
      addToast('success', 'Certificate Saved', 'Certificate of Ownership PNG downloaded');
    } catch (err) {
      console.error(err);
      addToast('error', 'Certificate Generation Failed', 'Could not export canvas certificate');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#111624] via-[#0D121D] to-[#07090E] border border-[#D4AF37]/30 p-8 sm:p-12 shadow-2xl">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-mono font-semibold tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OFFICIAL WORLDCORE SOVEREIGN RELIC VAULT</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black font-brand tracking-tight text-white">
                Institutional <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]">NFT Relics</span> & Utility Vault
              </h1>

              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
                Acquire cryptographic Sovereign Relics powered by Ethereum Sepolia smart contracts.
                Holders unlock <strong>up to +50% CT staking yield boosts</strong>, zero-fee terminal privileges,
                and direct rights to download original 8K artwork and cryptographic ownership certificates.
              </p>

              {/* User Balances Strip & Faucet */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-2 bg-[#0A0E17] border border-[#1A2234] px-3.5 py-2 rounded-xl">
                  <Coins className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-gray-400">Your CT:</span>
                  <span className="text-white font-bold">{parseFloat(user?.demoCtBalance || '0').toLocaleString()} CT</span>
                </div>

                <div className="flex items-center gap-2 bg-[#0A0E17] border border-[#1A2234] px-3.5 py-2 rounded-xl">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-400">Your ETH:</span>
                  <span className="text-white font-bold">{parseFloat(user?.demoEthBalance || '0').toFixed(4)} ETH</span>
                </div>

                <button
                  onClick={() => resetBalances()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl transition-all font-semibold"
                  title="Claim 25,000 CT and 10 ETH demo faucet credits"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Claim Demo Credits</span>
                </button>
              </div>
            </div>

            {/* Featured Primary Sovereign Relic Card Preview */}
            <div className="lg:col-span-4 flex justify-center">
              <div
                onClick={() => setInspectNft(NFT_CATALOG[0])}
                className="group relative cursor-pointer w-64 rounded-2xl overflow-hidden bg-[#0A0E17] border-2 border-[#D4AF37] shadow-2xl shadow-[#D4AF37]/20 transition-all duration-300 hover:scale-105 hover:shadow-[#D4AF37]/40"
              >
                <div className="aspect-square relative overflow-hidden bg-black">
                  <img
                    src={NFT_CATALOG[0].image}
                    alt={NFT_CATALOG[0].name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold font-mono">
                    GENESIS #937021
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-3 right-3 text-left">
                    <p className="text-[10px] text-[#D4AF37] font-mono uppercase font-bold">Featured Sovereign Relic</p>
                    <p className="text-xs font-bold text-white truncate">{NFT_CATALOG[0].name}</p>
                  </div>
                </div>
                <div className="p-3 bg-[#0E1422] flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">+50% CT Yield</span>
                  <span className="text-[#D4AF37] font-bold">2,500 CT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs & Search Navigation */}
      <div className="max-w-7xl mx-auto mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#1A2234] pb-4">
          {/* Main Tabs */}
          <div className="flex items-center gap-2 bg-[#090D14] p-1 rounded-xl border border-[#1A2234]">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'catalog'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Gem className="w-4 h-4" />
              <span>Relic Marketplace ({NFT_CATALOG.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('my_nfts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'my_nfts'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>My Collected Vault</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#1E293B] text-[#D4AF37] text-[10px]">
                {userNfts.length}
              </span>
            </button>
          </div>

          {/* Search & Filters */}
          {activeTab === 'catalog' && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search relic or token ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0A0E17] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none"
                />
              </div>

              {/* Rarity Filter */}
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="bg-[#0A0E17] border border-[#1A2234] focus:border-[#D4AF37] rounded-xl px-3 py-1.5 text-xs text-gray-300 font-mono focus:outline-none cursor-pointer"
              >
                <option value="all">All Rarities</option>
                <option value="Sovereign Mythic">Sovereign Mythic</option>
                <option value="Mythic Gold">Mythic Gold</option>
                <option value="Legendary">Legendary</option>
                <option value="Rare">Rare</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tab 1: Relic Marketplace */}
      {activeTab === 'catalog' && (
        <div className="max-w-7xl mx-auto">
          {filteredCatalog.length === 0 ? (
            <div className="text-center py-16 bg-[#090D14] rounded-2xl border border-[#1A2234]">
              <Gem className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-300 font-mono">No Relics Found</h3>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your filter or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCatalog.map((nft) => {
                const isOwned = userNfts.some((un) => un.tokenId === nft.tokenId);

                return (
                  <div
                    key={nft.id}
                    className="group flex flex-col bg-[#0A0E17] border border-[#1A2234] hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#D4AF37]/10"
                  >
                    {/* Artwork Container */}
                    <div className="relative aspect-square overflow-hidden bg-black cursor-pointer" onClick={() => setInspectNft(nft)}>
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Rarity Tag */}
                      <div
                        className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border backdrop-blur-md"
                        style={{
                          backgroundColor: `${nft.rarityColor}20`,
                          color: nft.rarityColor,
                          borderColor: `${nft.rarityColor}50`,
                        }}
                      >
                        {nft.rarity}
                      </div>

                      {/* Token ID */}
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-white text-[10px] font-mono">
                        #{nft.tokenId}
                      </div>

                      {/* Staking Multiplier Pill */}
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-[#07090E]/90 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
                        <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                        <span>{nft.multiplier}</span>
                      </div>

                      {/* Owned Badge */}
                      {isOwned && (
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-[#D4AF37] text-black text-xs font-mono font-bold flex items-center gap-1 shadow-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>OWNED</span>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1">
                          <span>{nft.collection}</span>
                          <span>{nft.edition}</span>
                        </div>

                        <h3
                          onClick={() => setInspectNft(nft)}
                          className="font-bold text-white text-base hover:text-[#D4AF37] cursor-pointer transition-colors truncate"
                        >
                          {nft.name}
                        </h3>

                        <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                          {nft.description}
                        </p>
                      </div>

                      {/* Pricing & Mint Controls */}
                      <div className="pt-2 border-t border-[#161D2C] space-y-3">
                        <div className="flex items-center justify-between font-mono">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase block">Price in CT</span>
                            <span className="text-sm font-bold text-[#D4AF37]">{nft.priceCt.toLocaleString()} CT</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-gray-500 uppercase block">Price in ETH</span>
                            <span className="text-sm font-bold text-white">{nft.priceEth} ETH</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPurchaseNft(nft)}
                            className="py-2 px-3 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black font-mono font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                          >
                            <Gem className="w-3.5 h-3.5" />
                            <span>Buy Relic</span>
                          </button>

                          <button
                            onClick={() => handleDownloadArtwork(nft)}
                            disabled={downloadingId === nft.tokenId}
                            className="py-2 px-3 bg-[#111726] hover:bg-[#1A2338] text-gray-300 hover:text-white border border-[#1E293B] font-mono text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                            title="Download high-resolution artwork"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Collected Vault */}
      {activeTab === 'my_nfts' && (
        <div className="max-w-7xl mx-auto">
          {userNfts.length === 0 ? (
            <div className="text-center py-20 bg-[#090D14] rounded-3xl border border-[#1A2234] space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 mx-auto flex items-center justify-center text-[#D4AF37]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono">Your Sovereign Vault is Empty</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                You have not acquired any WorldCore Sovereign Relics yet. Explore the marketplace to mint
                the Genesis Sovereign Relic #937021 or imperial collectibles with your demo CT/ETH credits.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black font-mono font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Explore Relics & Mint
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#0A0E17] border border-[#1A2234] p-4 rounded-2xl text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{userNfts.length} Authenticated Relics in Personal Vault</span>
                </div>
                <span className="text-gray-400">
                  Owner: <strong className="text-white">{user?.walletAddress || user?.displayName || user?.email}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userNfts.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#0A0E17] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-xl flex flex-col group"
                  >
                    {/* Artwork Preview */}
                    <div className="relative aspect-square overflow-hidden bg-black">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-[10px] font-mono font-bold">
                        OWNED #{item.tokenId}
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/70 border border-white/20 text-white text-[10px] font-mono">
                        {item.rarity}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <p className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">{item.collection}</p>
                        <h3 className="font-bold text-white text-base truncate mt-0.5">{item.name}</h3>

                        <div className="mt-2.5 p-2 bg-[#06080E] border border-[#1A2234] rounded-xl text-[11px] font-mono space-y-1">
                          <div className="flex justify-between text-gray-400">
                            <span>Acquired For:</span>
                            <span className="text-white font-bold">{item.pricePaid}</span>
                          </div>
                          <div className="flex justify-between text-gray-400">
                            <span>Tx Hash:</span>
                            <span className="text-[#D4AF37]">{item.txHash.slice(0, 8)}...{item.txHash.slice(-6)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Download Suite (Direct artwork, JSON certificate, PNG Certificate) */}
                      <div className="space-y-2 pt-2 border-t border-[#1A2234]">
                        <span className="text-[10px] uppercase font-bold text-gray-400 font-mono block">
                          Download Assets & Provenance
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          {/* 1. Download Artwork */}
                          <button
                            onClick={() => handleDownloadArtwork(item)}
                            className="py-2 px-3 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <FileImage className="w-3.5 h-3.5" />
                            <span>Download Art</span>
                          </button>

                          {/* 2. Download Certificate PNG */}
                          <button
                            onClick={() => handleDownloadCertificatePng(item)}
                            className="py-2 px-3 bg-[#111726] hover:bg-[#1A2338] text-white border border-[#D4AF37]/50 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                            title="Generate and download printable luxury certificate"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Certificate</span>
                          </button>
                        </div>

                        {/* 3. Download JSON Metadata */}
                        <button
                          onClick={() => handleDownloadMetadata(item)}
                          className="w-full py-1.5 bg-[#06080E] hover:bg-white/5 border border-[#1A2234] text-gray-400 hover:text-white text-[11px] font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <FileJson className="w-3 h-3 text-[#D4AF37]" />
                          <span>Export ERC-721 Metadata (.json)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buy Confirmation Modal */}
      {purchaseNft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0C101A] border border-[#D4AF37]/50 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <button
              onClick={() => setPurchaseNft(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Gem className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Acquire Sovereign Relic</h3>
                <p className="text-xs text-gray-400">Ethereum Sepolia Testnet Contract</p>
              </div>
            </div>

            {/* Relic Summary */}
            <div className="flex gap-4 p-3 bg-[#07090E] border border-[#1A2234] rounded-xl mb-4">
              <img
                src={purchaseNft.image}
                alt={purchaseNft.name}
                className="w-16 h-16 rounded-lg object-cover border border-[#D4AF37]/30 shrink-0"
              />
              <div className="overflow-hidden">
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold block">{purchaseNft.rarity}</span>
                <h4 className="text-sm font-bold text-white truncate">{purchaseNft.name}</h4>
                <p className="text-[11px] text-emerald-400 font-mono mt-0.5">{purchaseNft.multiplier}</p>
              </div>
            </div>

            {/* Currency Choice */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-mono font-medium text-gray-300">Select Payment Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPurchaseCurrency('CT')}
                  className={`p-2.5 rounded-xl border font-mono text-xs flex flex-col items-center gap-1 transition-all ${
                    purchaseCurrency === 'CT'
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm'
                      : 'bg-[#07090E] border-[#1A2234] text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-sm text-[#D4AF37]">{purchaseNft.priceCt.toLocaleString()} CT</span>
                  <span className="text-[10px] text-gray-400">Balance: {parseFloat(user?.demoCtBalance || '0').toLocaleString()} CT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseCurrency('ETH')}
                  className={`p-2.5 rounded-xl border font-mono text-xs flex flex-col items-center gap-1 transition-all ${
                    purchaseCurrency === 'ETH'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-sm'
                      : 'bg-[#07090E] border-[#1A2234] text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-sm text-cyan-400">{purchaseNft.priceEth} ETH</span>
                  <span className="text-[10px] text-gray-400">Balance: {parseFloat(user?.demoEthBalance || '0').toFixed(4)} ETH</span>
                </button>
              </div>
            </div>

            {/* Gas & Settlement note */}
            <div className="p-2.5 bg-[#07090E] rounded-xl border border-[#1A2234] text-[11px] font-mono text-gray-400 space-y-1 mb-5">
              <div className="flex justify-between">
                <span>Network Gas:</span>
                <span className="text-emerald-400">0.0000 ETH (Free Paper Sandbox)</span>
              </div>
              <div className="flex justify-between">
                <span>Recipient:</span>
                <span className="text-gray-300">{user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Connected Wallet'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPurchaseNft(null)}
                className="flex-1 py-2.5 bg-[#161D2C] hover:bg-[#20293D] text-gray-300 text-xs font-mono font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={isPurchasing}
                className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black text-xs font-mono font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isPurchasing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Minting Relic...</span>
                  </>
                ) : (
                  <>
                    <Gem className="w-4 h-4" />
                    <span>Confirm & Mint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Success Celebration Modal */}
      {purchaseSuccessItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0C101A] border-2 border-[#D4AF37] rounded-3xl shadow-2xl p-6 sm:p-8 text-center overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] mx-auto flex items-center justify-center text-[#D4AF37] mb-4">
              <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
            </div>

            <h3 className="text-2xl font-bold font-brand text-white">Relic Ownership Confirmed!</h3>
            <p className="text-xs text-[#D4AF37] font-mono mt-1">
              Token ID #{purchaseSuccessItem.tokenId} registered on Ethereum Sepolia
            </p>

            {/* Relic Image Card */}
            <div className="my-6 max-w-xs mx-auto rounded-2xl overflow-hidden border border-[#D4AF37]/60 shadow-xl bg-black">
              <img
                src={purchaseSuccessItem.image}
                alt={purchaseSuccessItem.name}
                className="w-full aspect-square object-cover"
              />
              <div className="p-3 bg-[#0E1422] text-left">
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold block">{purchaseSuccessItem.rarity}</span>
                <h4 className="text-sm font-bold text-white truncate">{purchaseSuccessItem.name}</h4>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">Paid: {purchaseSuccessItem.pricePaid}</p>
              </div>
            </div>

            {/* Instant Download Buttons */}
            <div className="space-y-2 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownloadArtwork(purchaseSuccessItem)}
                  className="py-2.5 px-3 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black font-mono font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Artwork</span>
                </button>

                <button
                  onClick={() => handleDownloadCertificatePng(purchaseSuccessItem)}
                  className="py-2.5 px-3 bg-[#161D2C] hover:bg-[#20293D] text-white border border-[#D4AF37]/50 font-mono font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>Download Certificate</span>
                </button>
              </div>

              <button
                onClick={() => handleDownloadMetadata(purchaseSuccessItem)}
                className="w-full py-2 bg-[#06080E] hover:bg-white/5 border border-[#1A2234] text-gray-300 text-xs font-mono rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Export Metadata JSON</span>
              </button>
            </div>

            <button
              onClick={() => {
                setPurchaseSuccessItem(null);
                setActiveTab('my_nfts');
              }}
              className="px-6 py-2 bg-[#1E293B] hover:bg-[#2A374F] text-white text-xs font-mono font-semibold rounded-xl transition-colors"
            >
              Go to My Vault
            </button>
          </div>
        </div>
      )}

      {/* Inspect Detail Modal */}
      {inspectNft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0C101A] border border-[#1E293B] rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInspectNft(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="rounded-2xl overflow-hidden border-2 border-[#D4AF37]/40 bg-black aspect-square">
                <img
                  src={inspectNft.image}
                  alt={inspectNft.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 font-mono">
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider block">
                    {inspectNft.rarity}
                  </span>
                  <h3 className="text-xl font-bold text-white font-sans">{inspectNft.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {'description' in inspectNft ? inspectNft.description : 'WorldCore Sovereign Vault Asset'}
                  </p>
                </div>

                <div className="p-3 bg-[#06080E] border border-[#1A2234] rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-400">
                    <span>Token ID:</span>
                    <span className="text-white">#{inspectNft.tokenId}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Standard:</span>
                    <span className="text-white">ERC-721</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Blockchain:</span>
                    <span className="text-[#D4AF37]">Ethereum Sepolia</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Yield Multiplier:</span>
                    <span className="text-emerald-400 font-bold">
                      {'multiplier' in inspectNft ? inspectNft.multiplier : '+50% CT Yield'}
                    </span>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleDownloadArtwork(inspectNft)}
                    className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full-Resolution NFT</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownloadCertificatePng(inspectNft)}
                      className="py-2 bg-[#121826] hover:bg-[#1A2338] text-white border border-[#1E293B] text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Certificate PNG</span>
                    </button>

                    <button
                      onClick={() => handleDownloadMetadata(inspectNft)}
                      className="py-2 bg-[#121826] hover:bg-[#1A2338] text-white border border-[#1E293B] text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileJson className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Metadata JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
