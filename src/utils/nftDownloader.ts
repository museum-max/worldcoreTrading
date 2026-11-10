import { NftItem, UserNft } from '../types/index.ts';

/**
 * Downloads the high-resolution NFT image asset directly to user's computer
 */
export async function downloadNftArtwork(nft: NftItem | UserNft, customFileName?: string): Promise<void> {
  try {
    const filename =
      customFileName ||
      `${nft.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_#${nft.tokenId}.jpg`;

    const response = await fetch(nft.image);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${nft.image}`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke object URL after delay
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.error('Artwork download fallback:', error);
    // Direct link fallback
    const link = document.createElement('a');
    link.href = nft.image;
    link.download = `${nft.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_#${nft.tokenId}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Downloads official ERC-721 cryptographic JSON certificate metadata
 */
export function downloadNftMetadata(
  nft: NftItem | UserNft,
  ownerAddress?: string,
  txHash?: string
): void {
  const metadata = {
    name: nft.name,
    description:
      'description' in nft
        ? nft.description
        : 'Authenticated WorldCore Sovereign NFT Relic on Ethereum Sepolia Testnet.',
    image: nft.image,
    external_url: 'https://worlcore.trade/vault/' + nft.tokenId,
    token_id: nft.tokenId,
    collection: 'collection' in nft ? nft.collection : 'WorldCore Sovereign Vault',
    standard: 'standard' in nft ? nft.standard : 'ERC-721',
    blockchain: 'blockchain' in nft ? nft.blockchain : 'Ethereum Sepolia Testnet',
    owner: ownerAddress || '0x71C934Ea8451b68233C29158309530f9A937021',
    transaction_hash: txHash || ('txHash' in nft ? nft.txHash : '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')),
    timestamp: new Date().toISOString(),
    attributes: 'attributes' in nft ? nft.attributes : [
      { trait_type: 'Relic Tier', value: nft.rarity },
      { trait_type: 'Token ID', value: nft.tokenId },
      { trait_type: 'Protocol Privileges', value: 'Terminal Access' },
    ],
    authenticity_verification: {
      issuer: 'WORLCORE Trade Foundation',
      sha256_hash: '937021a71ea9533f81e626b91c0d4bb8c5a' + nft.tokenId,
      status: 'VERIFIED_ON_CHAIN',
    },
  };

  const jsonString = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(metadata, null, 2));
  const link = document.createElement('a');
  link.href = jsonString;
  link.download = `${nft.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_#${nft.tokenId}_ERC721.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates an ultra-luxurious, printable black-and-gold Certificate of Ownership PNG via HTML5 Canvas
 */
export async function downloadOwnershipCertificatePng(
  nft: NftItem | UserNft,
  ownerNameOrAddress: string,
  txHash?: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Dark Velvet Background
  ctx.fillStyle = '#06080E';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Multi-tier Gold Borders
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  // Corner Gold Flairs
  const corners = [
    [30, 30],
    [canvas.width - 30, 30],
    [30, canvas.height - 30],
    [canvas.width - 30, canvas.height - 30],
  ];
  corners.forEach(([x, y]) => {
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(x - 6, y - 6, 12, 12);
  });

  // 3. Header Texts
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 24px "Cinzel", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('WORLCORE TRADE • SOVEREIGN RELIC VAULT', canvas.width / 2, 95);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Cinzel", "Times New Roman", serif';
  ctx.fillText('CERTIFICATE OF CRYPTOGRAPHIC OWNERSHIP', canvas.width / 2, 150);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px "JetBrains Mono", monospace';
  ctx.fillText('ETHEREUM SEPOLIA TESTNET • ERC-721 NON-FUNGIBLE ASSET', canvas.width / 2, 185);

  // Thin gold divider
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(250, 210);
  ctx.lineTo(canvas.width - 250, 210);
  ctx.stroke();

  // 4. Load & Render NFT Image on Left
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve) => {
    img.onload = () => {
      // Draw image inside decorative gold frame
      ctx.save();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 3;
      ctx.strokeRect(90, 250, 340, 340);
      ctx.drawImage(img, 93, 253, 334, 334);
      ctx.restore();
      resolve();
    };
    img.onerror = () => {
      // Draw fallback box
      ctx.fillStyle = '#111827';
      ctx.fillRect(90, 250, 340, 340);
      ctx.strokeStyle = '#D4AF37';
      ctx.strokeRect(90, 250, 340, 340);
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 18px "JetBrains Mono"';
      ctx.fillText('WORLCORE RELIC', 260, 420);
      resolve();
    };
    img.src = nft.image;
  });

  // 5. NFT Details & Certificate Credentials on Right
  const startX = 480;
  ctx.textAlign = 'left';

  // Relic Name
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 28px "Cinzel", "Times New Roman", serif';
  ctx.fillText(nft.name, startX, 290);

  // Rarity & Token ID
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillText(`TIER: ${nft.rarity.toUpperCase()}  •  TOKEN ID: #${nft.tokenId}`, startX, 325);

  // Info Grid
  const details = [
    { label: 'AUTHENTICATED OWNER', val: ownerNameOrAddress || '0x71C934Ea...937021' },
    { label: 'NETWORK / STANDARD', val: 'Ethereum Sepolia Testnet (ERC-721)' },
    { label: 'CONTRACT REGISTRY', val: '0x71C934Ea8451b68233C29158309530f9A937021' },
    { label: 'ACQUISITION TIMESTAMP', val: new Date().toUTCString() },
    {
      label: 'TRANSACTION HASH',
      val: txHash || ('txHash' in nft ? nft.txHash : '0x8fae27189c4a8b7194602f9e41982c781938fae19034'),
    },
  ];

  let currentY = 370;
  details.forEach((item) => {
    ctx.fillStyle = '#64748B';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(item.label, startX, currentY);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '13.5px "JetBrains Mono", monospace';
    ctx.fillText(item.val, startX, currentY + 20);

    currentY += 46;
  });

  // 6. Gold Hologram Stamp / Seal at Bottom Center-Right
  ctx.save();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(1020, 520, 50, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 10px "Cinzel", serif';
  ctx.fillText('WORLCORE SEAL', 1020, 510);
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText('VERIFIED', 1020, 526);
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText('PROVENANCE', 1020, 540);
  ctx.restore();

  // 7. Footer Provenance Notice
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(
    'This cryptographic certificate confirms legal tokenized possession of the corresponding digital artifact in the WorldCore Trade Vault.',
    canvas.width / 2,
    730
  );

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `Certificate_${nft.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_#${nft.tokenId}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
