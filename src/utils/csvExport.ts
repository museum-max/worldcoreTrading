import { TradeOrder, UserNft } from '../types/index.ts';

export interface PortfolioPerformancePoint {
  date: Date;
  isoDate: string;
  dateStr: string;
  balance: number;
  change: number;
  changePercent: number;
  deposit?: number;
}

export interface ClaimedRewardRecord {
  id?: number;
  campaignKey: string;
  points: number;
  ctReward: string;
  claimedAt?: string;
}

export interface AssetHoldingSnapshot {
  asset: string;
  symbol: string;
  category: string;
  balance: number;
  unitPriceUsd: number;
  marketValueUsd: number;
  allocationPct: number;
}

export interface PortfolioExportAccountMeta {
  accountName: string;
  email?: string;
  uid?: string;
  walletAddress?: string;
  currency?: string;
}

export interface CsvExportResult {
  filename: string;
  rowCount: number;
}

/**
 * Generates deterministic daily historical portfolio performance checkpoints
 * anchored to the user's current live portfolio equity.
 */
export function generatePortfolioPerformanceSeries(
  currentValue: number,
  days: number = 30
): PortfolioPerformancePoint[] {
  const safeCurrent = Number.isFinite(currentValue) && currentValue >= 0 ? currentValue : 0;
  const totalDays = Math.max(2, days);
  const points: PortfolioPerformancePoint[] = [];
  const now = new Date();

  const seedDeltas = [
    0.0, -0.012, 0.024, 0.018, -0.006, 0.031, 0.015, -0.019, 0.008, 0.027,
    -0.014, 0.022, 0.019, -0.008, 0.035, 0.012, -0.015, 0.028, 0.005, -0.011,
    0.032, 0.018, -0.021, 0.042, 0.015, -0.009, 0.026, 0.031, -0.007, 0.019,
  ];

  let factor = 1.0;
  const factors: number[] = [1.0];
  for (let i = 1; i < totalDays; i++) {
    const step = seedDeltas[i % seedDeltas.length];
    factor = factor * (1 + step);
    factors.push(factor);
  }

  const endFactor = factors[factors.length - 1] || 1;
  const startVal = safeCurrent / endFactor;

  let prevBal = startVal;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (totalDays - 1 - i));
    d.setHours(0, 0, 0, 0);

    const bal = i === totalDays - 1 ? safeCurrent : Math.round(startVal * factors[i] * 100) / 100;
    const change = bal - prevBal;
    const changePercent = prevBal > 0 ? (change / prevBal) * 100 : 0;
    prevBal = bal;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    points.push({
      date: d,
      isoDate: `${year}-${month}-${day}`,
      dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance: Number(bal.toFixed(2)),
      change: i === 0 ? 0 : Number(change.toFixed(2)),
      changePercent: i === 0 ? 0 : Number(changePercent.toFixed(4)),
    });
  }

  return points;
}

/**
 * Escapes a single cell value following RFC-4180 CSV rules while guarding
 * non-numeric formula prefixes (`=`, `+`, `@`) against spreadsheet formula injection.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  let str = String(value);
  const trimmed = str.trim();
  const isNumericString = trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed);

  if (!isNumericString && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Serializes rows into a UTF-8 BOM CSV string for reliable Excel/Google Sheets/tax software import.
 */
export function buildCsvDocument(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return '\uFEFF' + rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\r\n');
}

/**
 * Triggers a clean browser Blob file download for the generated CSV content.
 */
export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildTransactionRows(options: {
  orders: TradeOrder[];
  rewards?: ClaimedRewardRecord[];
  nfts?: UserNft[];
  ctPriceUsd?: number;
}): {
  headers: string[];
  rows: Array<Array<string | number>>;
  totals: {
    tradeCount: number;
    buyVolumeUsd: number;
    sellVolumeUsd: number;
    realizedPnlUsd: number;
    rewardsCtTotal: number;
    nftCount: number;
  };
} {
  const { orders, rewards = [], nfts = [], ctPriceUsd = 1.84 } = options;

  const headers = [
    'Record Category',
    'Transaction ID',
    'Timestamp (UTC ISO)',
    'Date (YYYY-MM-DD)',
    'Asset / Pair',
    'Action / Side',
    'Execution Type',
    'Quantity',
    'Unit Price (USD)',
    'Gross Value (USD)',
    'Fee (USD)',
    'Net Cost Basis / Proceeds (USD)',
    'Realized PnL (USD)',
    'Tax Event Classification',
    'Status',
    'Reference / Notes',
  ];

  interface NormalizedEntry {
    sortTs: number;
    row: Array<string | number>;
  }

  const entries: NormalizedEntry[] = [];
  let buyVolumeUsd = 0;
  let sellVolumeUsd = 0;
  let realizedPnlUsd = 0;
  let rewardsCtTotal = 0;

  for (const ord of orders) {
    const dt = new Date(ord.createdAt);
    const iso = Number.isNaN(dt.getTime()) ? String(ord.createdAt || '') : dt.toISOString();
    const ymd = iso ? iso.slice(0, 10) : '';
    const unitPrice = parseFloat(ord.price) || 0;
    const qty = parseFloat(ord.amount) || 0;
    const gross = parseFloat(ord.total) || unitPrice * qty;
    const pnl = parseFloat(ord.pnl || '0') || 0;
    const fee = 0; // VIP 0% simulated tier
    const isBuy = ord.side === 'buy';

    if (isBuy) {
      buyVolumeUsd += gross;
    } else {
      sellVolumeUsd += gross;
    }
    realizedPnlUsd += pnl;

    entries.push({
      sortTs: Number.isNaN(dt.getTime()) ? 0 : dt.getTime(),
      row: [
        'TRADE',
        `ORD-${ord.id}`,
        iso,
        ymd,
        ord.symbol,
        ord.side.toUpperCase(),
        ord.type.toUpperCase(),
        qty,
        Number(unitPrice.toFixed(4)),
        Number(gross.toFixed(2)),
        fee,
        Number((isBuy ? -(gross + fee) : gross - fee).toFixed(2)),
        Number(pnl.toFixed(2)),
        isBuy ? 'Acquisition / Cost Basis' : 'Disposal / Gross Proceeds',
        ord.status.toUpperCase(),
        'Simulated Paper Execution (Zero Real Financial Risk)',
      ],
    });
  }

  for (const rw of rewards) {
    const dt = rw.claimedAt ? new Date(rw.claimedAt) : new Date();
    const iso = Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
    const ymd = iso.slice(0, 10);
    const ctNum = parseFloat(String(rw.ctReward).replace(/[^\d.-]/g, '')) || 0;
    const estUsd = Number((ctNum * ctPriceUsd).toFixed(2));
    rewardsCtTotal += ctNum;

    entries.push({
      sortTs: Number.isNaN(dt.getTime()) ? 0 : dt.getTime(),
      row: [
        'REWARD_CLAIM',
        `REW-${rw.id ?? rw.campaignKey}`,
        iso,
        ymd,
        'CT (CoreToken)',
        'CLAIM',
        'CAMPAIGN_REWARD',
        ctNum,
        Number(ctPriceUsd.toFixed(4)),
        estUsd,
        0,
        estUsd,
        0,
        'Ordinary Income / Incentive Credit (Simulated)',
        'CREDITED',
        `Campaign: ${rw.campaignKey} (+${rw.points} pts)`,
      ],
    });
  }

  for (const nft of nfts) {
    const dt = nft.acquiredAt ? new Date(nft.acquiredAt) : new Date();
    const iso = Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
    const ymd = iso.slice(0, 10);
    const paidNum = parseFloat(String(nft.pricePaid).replace(/[^\d.-]/g, '')) || 0;
    const approxUsd =
      nft.currency === 'USD'
        ? paidNum
        : nft.currency === 'CT'
        ? Number((paidNum * ctPriceUsd).toFixed(2))
        : Number((paidNum * 3410.8).toFixed(2));

    entries.push({
      sortTs: Number.isNaN(dt.getTime()) ? 0 : dt.getTime(),
      row: [
        'NFT_ACQUISITION',
        `NFT-${nft.tokenId}`,
        iso,
        ymd,
        `${nft.name} (#${nft.tokenId})`,
        'MINT_BUY',
        nft.currency,
        1,
        approxUsd,
        approxUsd,
        0,
        Number((-approxUsd).toFixed(2)),
        0,
        'Collectible Acquisition / Token Spend (Simulated)',
        'CONFIRMED',
        `${nft.collection} | ${nft.rarity} | Paid ${nft.pricePaid} | Tx ${nft.txHash}`,
      ],
    });
  }

  entries.sort((a, b) => b.sortTs - a.sortTs);

  return {
    headers,
    rows: entries.map((e) => e.row),
    totals: {
      tradeCount: orders.length,
      buyVolumeUsd: Number(buyVolumeUsd.toFixed(2)),
      sellVolumeUsd: Number(sellVolumeUsd.toFixed(2)),
      realizedPnlUsd: Number(realizedPnlUsd.toFixed(2)),
      rewardsCtTotal: Number(rewardsCtTotal.toFixed(2)),
      nftCount: nfts.length,
    },
  };
}

/**
 * Exports filtered or complete transaction history (trades + optional rewards/NFTs)
 * formatted for tax reporting and CPA record-keeping.
 */
export function exportTransactionHistoryCsv(options: {
  orders: TradeOrder[];
  rewards?: ClaimedRewardRecord[];
  nfts?: UserNft[];
  ctPriceUsd?: number;
  account?: PortfolioExportAccountMeta;
  filterSummary?: string;
}): CsvExportResult {
  const { orders, rewards = [], nfts = [], ctPriceUsd = 1.84, account, filterSummary } = options;
  const ledger = buildTransactionRows({ orders, rewards, nfts, ctPriceUsd });
  const nowIso = new Date().toISOString();
  const dateStamp = nowIso.slice(0, 10);

  const allRows: Array<Array<string | number>> = [
    ['WORLCORE TRADE / ETHERPULSE — TAX & AUDIT TRANSACTION LEDGER'],
    ['Generated At (UTC)', nowIso],
    ['Account', account?.accountName || 'Institutional Trader', 'Email', account?.email || 'N/A'],
    ['Wallet Address', account?.walletAddress || 'Not Linked', 'Filter Scope', filterSummary || 'All Records'],
    ['Disclaimer', 'Simulated paper trading & ecosystem utility records. Not financial or legal tax advice.'],
    [],
    ledger.headers,
    ...ledger.rows,
    [],
    ['LEDGER SUMMARY'],
    ['Total Trade Executions', ledger.totals.tradeCount],
    ['Total Buy Cost Basis (USD)', ledger.totals.buyVolumeUsd],
    ['Total Sell Proceeds (USD)', ledger.totals.sellVolumeUsd],
    ['Reported Realized PnL (USD)', ledger.totals.realizedPnlUsd],
    ['Total CT Rewards Claimed (CT)', ledger.totals.rewardsCtTotal],
    ['Total Sovereign NFT Acquisitions', ledger.totals.nftCount],
  ];

  const filename = `worlcore_transactions_tax_${dateStamp}.csv`;
  triggerCsvDownload(filename, buildCsvDocument(allRows));
  return { filename, rowCount: ledger.rows.length };
}

/**
 * Exports portfolio performance history (7D / 14D / 30D equity checkpoints),
 * period return statistics, and current asset allocation snapshot as CSV.
 */
export function exportPortfolioPerformanceCsv(options: {
  totalEquityUsd: number;
  timeframeDays: 7 | 14 | 30;
  holdings: AssetHoldingSnapshot[];
  totalOrdersCount: number;
  filledOrdersCount: number;
  account?: PortfolioExportAccountMeta;
}): CsvExportResult {
  const {
    totalEquityUsd,
    timeframeDays,
    holdings,
    totalOrdersCount,
    filledOrdersCount,
    account,
  } = options;

  const fullSeries = generatePortfolioPerformanceSeries(totalEquityUsd, 30);
  const periodSeries = fullSeries.slice(-timeframeDays);
  const startBal = periodSeries[0]?.balance ?? totalEquityUsd;
  const endBal = periodSeries[periodSeries.length - 1]?.balance ?? totalEquityUsd;
  const periodPnl = endBal - startBal;
  const periodReturnPct = startBal > 0 ? (periodPnl / startBal) * 100 : 0;
  const periodHigh = Math.max(...periodSeries.map((p) => p.balance), totalEquityUsd);
  const periodLow = Math.min(...periodSeries.map((p) => p.balance), totalEquityUsd);

  const nowIso = new Date().toISOString();
  const dateStamp = nowIso.slice(0, 10);

  const rows: Array<Array<string | number>> = [
    ['WORLCORE TRADE / ETHERPULSE — PORTFOLIO PERFORMANCE & VALUATION REPORT'],
    ['Generated At (UTC)', nowIso],
    ['Account', account?.accountName || 'Institutional Trader', 'Email', account?.email || 'N/A'],
    ['Wallet Address', account?.walletAddress || 'Not Linked', 'Report Window', `${timeframeDays}D`],
    ['Mode', 'Paper Trading / Simulated Capital Management (Zero Real Financial Risk)'],
    [],
    ['PERIOD PERFORMANCE SUMMARY'],
    ['Metric', 'Value'],
    ['Current Total Net Equity (USD)', Number(totalEquityUsd.toFixed(2))],
    [`Period Start Equity (${timeframeDays}D Ago, USD)`, Number(startBal.toFixed(2))],
    [`Period Net Gain / Loss (USD)`, Number(periodPnl.toFixed(2))],
    [`Period Return (%)`, Number(periodReturnPct.toFixed(2))],
    ['Period Peak High (USD)', Number(periodHigh.toFixed(2))],
    ['Period Low Watermark (USD)', Number(periodLow.toFixed(2))],
    ['Total Paper Orders Executed', totalOrdersCount],
    ['Filled Paper Orders', filledOrdersCount],
    [],
    ['CURRENT ASSET HOLDINGS & ALLOCATION'],
    ['Asset Name', 'Symbol', 'Category', 'Quantity / Balance', 'Mark Price (USD)', 'Market Value (USD)', 'Allocation (%)'],
    ...holdings.map((h) => [
      h.asset,
      h.symbol,
      h.category,
      Number(h.balance.toFixed(6)),
      Number(h.unitPriceUsd.toFixed(4)),
      Number(h.marketValueUsd.toFixed(2)),
      Number(h.allocationPct.toFixed(2)),
    ]),
    [],
    [`DAILY PORTFOLIO EQUITY CURVE (${timeframeDays} DAYS)`],
    [
      'Date (YYYY-MM-DD)',
      'Display Date',
      'Closing Equity (USD)',
      'Daily Change (USD)',
      'Daily Shift (%)',
      'Cumulative Gain vs Period Start (USD)',
      'Cumulative Return (%)',
    ],
    ...periodSeries.map((pt) => {
      const cumGain = pt.balance - startBal;
      const cumPct = startBal > 0 ? (cumGain / startBal) * 100 : 0;
      return [
        pt.isoDate,
        pt.dateStr,
        Number(pt.balance.toFixed(2)),
        Number(pt.change.toFixed(2)),
        Number(pt.changePercent.toFixed(2)),
        Number(cumGain.toFixed(2)),
        Number(cumPct.toFixed(2)),
      ];
    }),
  ];

  const filename = `worlcore_portfolio_performance_${timeframeDays}d_${dateStamp}.csv`;
  triggerCsvDownload(filename, buildCsvDocument(rows));
  return { filename, rowCount: periodSeries.length + holdings.length };
}

/**
 * Exports a single unified Tax & Audit package containing Account Valuation,
 * Asset Holdings, Daily Portfolio Performance, and Full Transaction History.
 */
export function exportCompleteTaxReportCsv(options: {
  totalEquityUsd: number;
  timeframeDays: 7 | 14 | 30;
  holdings: AssetHoldingSnapshot[];
  orders: TradeOrder[];
  rewards?: ClaimedRewardRecord[];
  nfts?: UserNft[];
  ctPriceUsd?: number;
  account?: PortfolioExportAccountMeta;
}): CsvExportResult {
  const {
    totalEquityUsd,
    timeframeDays,
    holdings,
    orders,
    rewards = [],
    nfts = [],
    ctPriceUsd = 1.84,
    account,
  } = options;

  const fullSeries = generatePortfolioPerformanceSeries(totalEquityUsd, 30);
  const periodSeries = fullSeries.slice(-timeframeDays);
  const startBal = periodSeries[0]?.balance ?? totalEquityUsd;
  const endBal = periodSeries[periodSeries.length - 1]?.balance ?? totalEquityUsd;
  const periodPnl = endBal - startBal;
  const periodReturnPct = startBal > 0 ? (periodPnl / startBal) * 100 : 0;

  const ledger = buildTransactionRows({ orders, rewards, nfts, ctPriceUsd });
  const nowIso = new Date().toISOString();
  const dateStamp = nowIso.slice(0, 10);

  const rows: Array<Array<string | number>> = [
    ['WORLCORE TRADE / ETHERPULSE — COMPLETE TAX & RECORD-KEEPING PACKAGE'],
    ['Generated At (UTC)', nowIso],
    ['Account', account?.accountName || 'Institutional Trader', 'Email', account?.email || 'N/A'],
    ['User UID', account?.uid || 'N/A', 'Wallet Address', account?.walletAddress || 'Not Linked'],
    ['Disclaimer', 'Simulated paper trading & testnet ecosystem records for tax modeling and record-keeping.'],
    [],
    ['SECTION 1: PORTFOLIO VALUATION & PERFORMANCE SUMMARY'],
    ['Current Net Equity (USD)', Number(totalEquityUsd.toFixed(2))],
    [`${timeframeDays}D Start Equity (USD)`, Number(startBal.toFixed(2))],
    [`${timeframeDays}D Net Change (USD)`, Number(periodPnl.toFixed(2))],
    [`${timeframeDays}D Return (%)`, Number(periodReturnPct.toFixed(2))],
    ['Total Trade Executions', ledger.totals.tradeCount],
    ['Total Buy Cost Basis (USD)', ledger.totals.buyVolumeUsd],
    ['Total Sell Proceeds (USD)', ledger.totals.sellVolumeUsd],
    ['Reported Realized PnL (USD)', ledger.totals.realizedPnlUsd],
    ['Total CT Rewards Claimed (CT)', ledger.totals.rewardsCtTotal],
    [],
    ['SECTION 2: ASSET HOLDINGS'],
    ['Asset Name', 'Symbol', 'Category', 'Quantity / Balance', 'Mark Price (USD)', 'Market Value (USD)', 'Allocation (%)'],
    ...holdings.map((h) => [
      h.asset,
      h.symbol,
      h.category,
      Number(h.balance.toFixed(6)),
      Number(h.unitPriceUsd.toFixed(4)),
      Number(h.marketValueUsd.toFixed(2)),
      Number(h.allocationPct.toFixed(2)),
    ]),
    [],
    [`SECTION 3: PORTFOLIO DAILY PERFORMANCE (${timeframeDays}D)`],
    ['Date (YYYY-MM-DD)', 'Closing Equity (USD)', 'Daily Change (USD)', 'Daily Shift (%)', 'Cumulative Return (%)'],
    ...periodSeries.map((pt) => {
      const cumPct = startBal > 0 ? ((pt.balance - startBal) / startBal) * 100 : 0;
      return [
        pt.isoDate,
        Number(pt.balance.toFixed(2)),
        Number(pt.change.toFixed(2)),
        Number(pt.changePercent.toFixed(2)),
        Number(cumPct.toFixed(2)),
      ];
    }),
    [],
    ['SECTION 4: UNIFIED TRANSACTION LEDGER (TRADES, REWARDS & NFTS)'],
    ledger.headers,
    ...ledger.rows,
  ];

  const filename = `worlcore_complete_tax_report_${dateStamp}.csv`;
  triggerCsvDownload(filename, buildCsvDocument(rows));
  return { filename, rowCount: holdings.length + periodSeries.length + ledger.rows.length };
}
