import React, { useState } from 'react';
import { Clock, Download, Filter, Search } from 'lucide-react';
import { useTrading } from '../context/TradingContext.tsx';

export const HistoryPage: React.FC = () => {
  const { orders } = useTrading();
  const [filterSide, setFilterSide] = useState<'all' | 'buy' | 'sell'>('all');
  const [search, setSearch] = useState<string>('');

  const filteredOrders = orders.filter((o) => {
    if (filterSide !== 'all' && o.side !== filterSide) return false;
    if (search && !o.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalVolume = orders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);

  // CSV Export
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Date & Time', 'Symbol', 'Side', 'Type', 'Price ($)', 'Amount', 'Total ($)', 'Status'];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.createdAt).toISOString(),
      o.symbol,
      o.side.toUpperCase(),
      o.type.toUpperCase(),
      o.price,
      o.amount,
      o.total,
      o.status.toUpperCase(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `worlcore_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Audit & Execution Record</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-white">
            Trading <span className="gold-gradient-text">History</span>
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Institutional ledger of simulated order executions, price fills, and volumes
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={orders.length === 0}
          className="px-4 py-2 bg-[#121A2A] hover:bg-[#1A253C] border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs rounded-xl flex items-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 font-mono text-xs">
        <div className="p-4 bg-[#090D14] border border-[#1A2234] rounded-xl">
          <span className="text-gray-400 block text-[10px] uppercase">Total Historical Executions</span>
          <span className="text-2xl font-bold text-white mt-1 block">{orders.length}</span>
        </div>
        <div className="p-4 bg-[#090D14] border border-[#1A2234] rounded-xl">
          <span className="text-gray-400 block text-[10px] uppercase">Simulated Turnover</span>
          <span className="text-2xl font-bold text-[#D4AF37] mt-1 block">
            ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-4 bg-[#090D14] border border-[#1A2234] rounded-xl">
          <span className="text-gray-400 block text-[10px] uppercase">Audit Persistence</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">Cloud SQL Synced</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 font-mono text-xs">
        <div className="flex items-center gap-2">
          {(['all', 'buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSide(s)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
                filterSide === s
                  ? 'bg-[#182030] text-[#D4AF37] font-bold border border-[#D4AF37]/30'
                  : 'text-gray-400 hover:text-white bg-[#090D14]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#090D14] border border-[#1A2234] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#090D14] border border-[#1A2234] rounded-2xl overflow-hidden shadow-xl">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-gray-400">
            No simulated orders match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs divide-y divide-[#1A2234]">
              <thead className="bg-[#0D121D] text-[10px] text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Order Type</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Total ($)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2234]/40">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(ord.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                    <td className="py-3 px-4 font-semibold">
                      <span
                        className={
                          ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {ord.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 uppercase">{ord.type}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      ${parseFloat(ord.price).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{ord.amount}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      ${parseFloat(ord.total).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                          ord.status === 'filled'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
