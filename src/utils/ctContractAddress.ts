import { CORETOKEN_SPEC } from '../config/coreTokenContract.ts';

// Pure TypeScript Keccak-256 (Ethereum original 0x01 padding) for deterministic CREATE2 & EIP-55 checksums
const KECCAK_ROUNDS = 24;
const KECCAK_RC: bigint[] = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

const KECCAK_ROTC = [
  1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44,
];

const KECCAK_PILN = [
  10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1,
];

const MASK_64 = 0xffffffffffffffffn;

function rotl64(x: bigint, n: number): bigint {
  const shift = BigInt(n);
  return ((x << shift) | (x >> (64n - shift))) & MASK_64;
}

function keccakF1600(state: bigint[]): void {
  const bc = new Array<bigint>(5).fill(0n);
  for (let round = 0; round < KECCAK_ROUNDS; round++) {
    for (let i = 0; i < 5; i++) {
      bc[i] = state[i] ^ state[i + 5] ^ state[i + 10] ^ state[i + 15] ^ state[i + 20];
    }
    for (let i = 0; i < 5; i++) {
      const t = bc[(i + 4) % 5] ^ rotl64(bc[(i + 1) % 5], 1);
      for (let j = 0; j < 25; j += 5) {
        state[j + i] = (state[j + i] ^ t) & MASK_64;
      }
    }
    let t = state[1];
    for (let i = 0; i < 24; i++) {
      const j = KECCAK_PILN[i];
      bc[0] = state[j];
      state[j] = rotl64(t, KECCAK_ROTC[i]);
      t = bc[0];
    }
    for (let j = 0; j < 25; j += 5) {
      for (let i = 0; i < 5; i++) bc[i] = state[j + i];
      for (let i = 0; i < 5; i++) {
        state[j + i] = (bc[i] ^ ((~bc[(i + 1) % 5] & MASK_64) & bc[(i + 2) % 5])) & MASK_64;
      }
    }
    state[0] = (state[0] ^ KECCAK_RC[round]) & MASK_64;
  }
}

export function keccak256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const rateBytes = 136; // 1088 bits for Keccak-256
  const state = new Array<bigint>(25).fill(0n);

  let offset = 0;
  while (offset + rateBytes <= bytes.length) {
    for (let i = 0; i < rateBytes / 8; i++) {
      let lane = 0n;
      for (let b = 0; b < 8; b++) {
        lane |= BigInt(bytes[offset + i * 8 + b]) << BigInt(b * 8);
      }
      state[i] ^= lane;
    }
    keccakF1600(state);
    offset += rateBytes;
  }

  const block = new Uint8Array(rateBytes);
  const rem = bytes.length - offset;
  block.set(bytes.subarray(offset));
  block[rem] = 0x01; // Keccak domain separation
  block[rateBytes - 1] |= 0x80;

  for (let i = 0; i < rateBytes / 8; i++) {
    let lane = 0n;
    for (let b = 0; b < 8; b++) {
      lane |= BigInt(block[i * 8 + b]) << BigInt(b * 8);
    }
    state[i] ^= lane;
  }
  keccakF1600(state);

  let hex = '';
  for (let i = 0; i < 4; i++) {
    let lane = state[i];
    for (let b = 0; b < 8; b++) {
      const byte = Number((lane >> BigInt(b * 8)) & 0xffn);
      hex += byte.toString(16).padStart(2, '0');
    }
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function toChecksumAddress(address: string): string {
  const lower = address.toLowerCase().replace(/^0x/, '');
  const hash = keccak256Hex(lower);
  let checksummed = '0x';
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const nibble = parseInt(hash[i], 16);
    checksummed += nibble >= 8 ? ch.toUpperCase() : ch;
  }
  return checksummed;
}

export function isCtTradeSymbol(symbol?: string | null): boolean {
  if (!symbol) return false;
  const parts = symbol.trim().toUpperCase().split('/');
  return parts.includes('CT');
}

/**
 * Deterministically computes an EIP-55 checksummed CREATE2-style settlement contract address
 * bound to a user's UID and the CoreToken (CT) master ERC-20 specification.
 * Note: Represents a staged Sepolia settlement vault address on the EtherPulse paper ledger.
 */
export function deriveUserCtContractAddress(
  userUid: string,
  masterContractAddress: string = CORETOKEN_SPEC.contractAddress
): string {
  const normalizedUid = userUid.trim();
  const normalizedMaster = masterContractAddress.toLowerCase().replace(/^0x/, '');
  const saltHex = keccak256Hex(`WORLCORE_CT_TRADER_VAULT_V1:${normalizedUid}`);
  const initCodeHashHex = keccak256Hex(
    `CoreTokenTraderSettlementVault(address,string):${normalizedMaster}`
  );
  const create2Input = hexToBytes(`ff${normalizedMaster}${saltHex}${initCodeHashHex}`);
  const digest = keccak256Hex(create2Input);
  return toChecksumAddress(`0x${digest.slice(24)}`);
}
