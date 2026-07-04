"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  CreditCard, Wrench, CheckCircle, Clock, 
  AlertCircle, ArrowRight, ShieldCheck 
} from "lucide-react";

export default function TenantPortal() {
  const [leases, setLeases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [activeLease, setActiveLease] = useState<any | null>(null);

  // Form states
  const [bankConnected, setBankConnected] = useState(false);
  const [connectingBank, setConnectingBank] = useState(false);
  const [payingRent, setPayingRent] = useState(false);

  const [mCategory, setMCategory] = useState("plumbing");
  const [mPriority, setMPriority] = useState("normal");
  const [mDescription, setMDescription] = useState("");
  const [submittingM, setSubmittingM] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [leasesData, paymentsData, maintenanceData] = await Promise.all([
        api.getLeases(),
        api.getPayments(),
        api.getMaintenanceRequests()
      ]);

      setLeases(leasesData);
      setPayments(paymentsData);
      setMaintenance(maintenanceData);

      if (leasesData.length > 0) {
        // Find the active lease
        const active = leasesData.find((l: any) => l.status === "active") || leasesData[0];
        setActiveLease(active);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load tenant portal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnectBank = async () => {
    if (!activeLease) return;
    try {
      setConnectingBank(true);
      setError("");
      
      // Step 1: Get mock Plaid Link token
      const { link_token } = await api.getPlaidLinkToken();
      
      // Step 2: Exchange mock public token
      const mockPublicToken = "public-sandbox-mock-998877";
      await api.exchangePlaidToken(mockPublicToken, activeLease.id);
      
      setBankConnected(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect bank account");
    } finally {
      setConnectingBank(false);
    }
  };

  const handlePayRent = async () => {
    if (!activeLease) return;
    try {
      setPayingRent(true);
      setError("");
      const response = await api.payRent(activeLease.id);
      
      // Simulate Stripe Webhook processing instantly in dev mode
      // If Stripe token is mock, our backend created a pending payment. Let's force-reload after a delay
      setTimeout(async () => {
        const updatedPayments = await api.getPayments();
        setPayments(updatedPayments);
        setPayingRent(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Payment execution failed");
      setPayingRent(false);
    }
  };

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLease) {
      alert("You must have an active lease to submit a maintenance request.");
      return;
    }
    try {
      setSubmittingM(true);
      setError("");
      const ticket = await api.createMaintenanceRequest({
        unit_id: activeLease.unit_id,
        category: mCategory,
        priority: mPriority,
        description: mDescription
      });
      setMaintenance([ticket, ...maintenance]);
      setMDescription("");
      alert("Maintenance request submitted successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setSubmittingM(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Tenant Portal</h1>
          <p className="text-slate-400 mt-1">Pay your monthly rent, link accounts, and submit maintenance tickets.</p>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading your profile...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Rent & Billing Panel */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Active Lease Info */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-indigo-400">
                  <CreditCard size={120} />
                </div>

                <h3 className="text-lg font-bold text-white mb-6">Rent Billing Overview</h3>

                {!activeLease ? (
                  <div className="text-center py-12 text-slate-500">
                    No active lease found. Please contact your property manager.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-950/50 p-6 rounded-xl border border-slate-850">
                      <div>
                        <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Monthly Rent Due</span>
                        <div className="text-3xl font-extrabold text-white mt-1">
                          ${(activeLease.rent_amount_cents / 100).toLocaleString()}
                        </div>
                        <p className="text-slate-400 text-xs mt-1">Due on the 1st of each month</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {!bankConnected ? (
                          <button
                            onClick={handleConnectBank}
                            disabled={connectingBank}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                          >
                            <ShieldCheck size={16} />
                            {connectingBank ? "Connecting Plaid..." : "Link Bank Account"}
                          </button>
                        ) : (
                          <button
                            onClick={handlePayRent}
                            disabled={payingRent}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-emerald-950/30"
                          >
                            <CreditCard size={16} />
                            {payingRent ? "Processing ACH..." : `Pay Rent ($${(activeLease.rent_amount_cents / 100).toLocaleString()})`}
                          </button>
                        )}
                        {bankConnected && (
                          <span className="text-[11px] text-emerald-400 flex items-center justify-center gap-1">
                            <CheckCircle size={12} /> Bank verified and connected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850">
                        <span className="text-slate-500 text-xs block">Lease Start</span>
                        <span className="font-semibold text-white mt-1 block">{activeLease.start_date}</span>
                      </div>
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850">
                        <span className="text-slate-500 text-xs block">Lease End</span>
                        <span className="font-semibold text-white mt-1 block">{activeLease.end_date}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Billing History</h3>

                {payments.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No transactions recorded.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-400 font-medium">
                          <th className="pb-3">Due Date</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Late Fee</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-855 text-slate-200">
                        {payments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-900/20">
                            <td className="py-3.5 font-medium">{p.due_date}</td>
                            <td className="py-3.5 font-semibold">${(p.amount_cents / 100).toFixed(2)}</td>
                            <td className="py-3.5 text-slate-400">${(p.late_fee_applied_cents / 100).toFixed(2)}</td>
                            <td className="py-3.5 uppercase text-xs text-slate-400">{p.method}</td>
                            <td className="py-3.5 text-right">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                p.status === "succeeded" 
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                                  : p.status === "pending"
                                  ? "bg-amber-950 text-amber-400 border border-amber-900/30"
                                  : "bg-red-950 text-red-400 border border-red-900/30"
                              }`}>
                                {p.status}
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

            {/* Right: Maintenance Panel */}
            <div className="space-y-8">
              
              {/* Request Form */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Request Maintenance</h3>
                
                <form onSubmit={handleSubmitMaintenance} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-medium">Category</label>
                    <select
                      value={mCategory}
                      onChange={e => setMCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                    >
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="hvac">HVAC / Cooling</option>
                      <option value="appliance">Appliance Issue</option>
                      <option value="structural">Structural</option>
                      <option value="other">Other / General</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-medium">Priority Urgency</label>
                    <select
                      value={mPriority}
                      onChange={e => setMPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                    >
                      <option value="low">Low (Cosmetic)</option>
                      <option value="normal">Normal</option>
                      <option value="high">High (Needs quick fix)</option>
                      <option value="emergency">Emergency (Life safety / water damage)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-medium">Problem Description</label>
                    <textarea
                      value={mDescription}
                      onChange={e => setMDescription(e.target.value)}
                      placeholder="Please details what broke, including location (e.g. toilet leaking in second bath)..."
                      required
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingM}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-all text-sm cursor-pointer shadow-md"
                  >
                    {submittingM ? "Submitting..." : "Submit Ticket"}
                  </button>
                </form>
              </div>

              {/* Ticket Tracker */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Open Requests</h3>

                {maintenance.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No tickets submitted yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {maintenance.map(m => (
                      <div key={m.id} className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-sm capitalize">{m.category} Issue</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === "resolved" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs line-clamp-2">{m.description}</p>
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-855">
                          Submitted on {new Date(m.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
