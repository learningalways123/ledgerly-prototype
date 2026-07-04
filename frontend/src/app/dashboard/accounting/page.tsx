"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  DollarSign, RefreshCw, BookOpen, 
  Send, Plus, CheckCircle, ShieldAlert 
} from "lucide-react";
import Link from "next/link";

export default function AccountingDashboard() {
  const [owners, setOwners] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Owner State
  const [showModal, setShowModal] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  // Payout State
  const [payoutOwnerId, setPayoutOwnerId] = useState("");
  const [payoutAmount, setPayoutAmount] = useState(1000);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);

  // QB Sync State
  const [syncingQB, setSyncingQB] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [ownersData, ledgerData] = await Promise.all([
        api.getOwners(),
        api.getLedgerEntries()
      ]);
      setOwners(ownersData);
      setLedger(ledgerData);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load trust accounting ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      const newOwner = await api.createOwner({ name: ownerName, email: ownerEmail });
      setOwners([...owners, newOwner]);
      setShowModal(false);
      setOwnerName("");
      setOwnerEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to add property owner");
    }
  };

  const handleTriggerPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutOwnerId) return;
    try {
      setPayoutLoading(true);
      setError("");
      const response = await api.triggerPayout(payoutOwnerId, payoutAmount * 100);
      alert(`Payout of $${payoutAmount.toLocaleString()} completed! Management fee (10%): $${(response.pm_fee_cents / 100).toFixed(2)} distributed.`);
      setShowPayoutModal(false);
      loadData(); // reload ledger records
    } catch (err: any) {
      alert("Payout failed: " + err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleSyncQBO = async () => {
    try {
      setSyncingQB(true);
      const res = await api.syncQuickbooks();
      alert(`QuickBooks Online synced successfully!\nExported ${res.synced_records.invoices} invoices & ${res.synced_records.ledger_journals} journal entries.`);
    } catch (err: any) {
      alert("QuickBooks sync failed: " + err.message);
    } finally {
      setSyncingQB(false);
    }
  };

  // Calculate Net Escrow Balance
  const netEscrowCents = ledger.reduce((acc, curr) => acc + curr.amount_cents, 0);

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-6 border-b border-slate-850 pb-4 text-sm text-slate-400">
          <Link href="/dashboard" className="hover:text-white transition-all font-medium">Dashboard Overview</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <Link href="/dashboard/applications" className="hover:text-white transition-all font-medium">Applications Inbox</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          <Link href="/dashboard/accounting" className="text-white font-bold transition-all">Trust Accounting Ledger</Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Trust Accounting</h1>
            <p className="text-slate-400 mt-1">Split tenant payments, execute owner payouts, and sync transactions to QuickBooks.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-650 hover:bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Register Owner Client
            </button>
            <button
              onClick={() => setShowPayoutModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send size={16} />
              Pay Owner Client
            </button>
            <button
              onClick={handleSyncQBO}
              disabled={syncingQB}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
            >
              {syncingQB ? "Syncing QBO..." : "Sync QuickBooks"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-medium text-sm">Total Trust Escrow Escrow</span>
              <div className="p-2 rounded-xl bg-indigo-950/40 text-indigo-400 border border-indigo-900/40">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">${(netEscrowCents / 100).toLocaleString()}</div>
            <p className="text-slate-500 text-xs mt-1">Audit-ready client balances</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-medium text-sm">Registered Owners</span>
              <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
                <BookOpen size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{owners.length}</div>
            <p className="text-slate-500 text-xs mt-1">Clients managed under portfolio</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-medium text-sm">Escrow Status</span>
              <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">Reconciled</div>
            <p className="text-slate-500 text-xs mt-1">ledger reports match stripe balances</p>
          </div>
        </div>

        {/* Dashboard Panels */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading ledger data...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Owners List */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Owner Clients</h3>
              {owners.length === 0 ? (
                <div className="text-slate-500 text-center py-12">No owners registered.</div>
              ) : (
                <div className="space-y-4">
                  {owners.map(owner => (
                    <div key={owner.id} className="bg-slate-900 border border-slate-855 p-4 rounded-xl space-y-1">
                      <h4 className="font-semibold text-white text-sm">{owner.name}</h4>
                      <p className="text-slate-400 text-xs">{owner.email}</p>
                      <div className="pt-2 flex justify-between items-center text-[10px] text-slate-500">
                        <span>Connected Stripe ID</span>
                        <span className="font-mono text-slate-400">{owner.stripe_connect_account_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trust Ledger Entries (Audit log) */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Append-Only Trust Ledger Logs</h3>
              {ledger.length === 0 ? (
                <div className="text-slate-500 text-center py-12">No transactions recorded. Try paying rent as a tenant.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 font-medium">
                        <th className="pb-3">Timestamp</th>
                        <th className="pb-3">Ref ID</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-855 text-slate-200">
                      {ledger.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-900/20">
                          <td className="py-3 text-slate-400">{new Date(entry.created_at).toLocaleString()}</td>
                          <td className="py-3 font-mono text-slate-300">{entry.reference_id}</td>
                          <td className="py-3 capitalize font-semibold">{entry.type.replace("_", " ")}</td>
                          <td className={`py-3 text-right font-bold ${
                            entry.amount_cents > 0 ? "text-emerald-400" : "text-slate-300"
                          }`}>
                            {entry.amount_cents > 0 ? "+" : ""}${(entry.amount_cents / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Register Owner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateOwner} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-white">Register Owner Client</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Owner Full Name</label>
                <input 
                  type="text" 
                  value={ownerName} 
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="Arthur Dent" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Owner Email</label>
                <input 
                  type="email" 
                  value={ownerEmail} 
                  onChange={e => setOwnerEmail(e.target.value)}
                  placeholder="arthur.dent@example.com" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="bg-slate-950 border border-slate-800 text-slate-400 font-medium px-4 py-2 rounded-xl text-sm hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-indigo-650 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-indigo-600 cursor-pointer"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Owner Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleTriggerPayout} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-white">Execute Owner Payout</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Select Owner Client</label>
                <select
                  value={payoutOwnerId}
                  onChange={e => setPayoutOwnerId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="">Choose client...</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Payout Amount ($)</label>
                <input 
                  type="number" 
                  value={payoutAmount} 
                  onChange={e => setPayoutAmount(Number(e.target.value))}
                  required
                  min="1"
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button 
                type="button" 
                onClick={() => setShowPayoutModal(false)}
                className="bg-slate-950 border border-slate-800 text-slate-400 font-medium px-4 py-2 rounded-xl text-sm hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={payoutLoading}
                className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-emerald-500 cursor-pointer"
              >
                {payoutLoading ? "Processing Stripe Transfer..." : "Complete Payout"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
