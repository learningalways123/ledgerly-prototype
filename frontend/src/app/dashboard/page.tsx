"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { 
  Building, UserPlus, CreditCard, Wrench, 
  Plus, Trash2, CheckCircle, Clock, AlertTriangle,
  MessageSquare, Sparkles, X, Send
} from "lucide-react";

export default function LandlordDashboard() {
  // Data State
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);

  // AI Assistant State
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponses, setAiResponses] = useState<any[]>([
    { sender: "ai", text: "Hello! I am your Ledgerly AI Assistant. Ask me anything about your properties, cash flow, or maintenance requests." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSendAIQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    const userMsg = aiQuery.trim();
    setAiResponses(prev => [...prev, { sender: "user", text: userMsg }]);
    setAiQuery("");
    setAiLoading(true);
    try {
      const response = await api.askAssistant(userMsg);
      setAiResponses(prev => [...prev, { sender: "ai", text: response.answer }]);
    } catch (err: any) {
      setAiResponses(prev => [...prev, { sender: "ai", text: "Sorry, I encountered an error: " + err.message }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Modals & Form State
  const [showPropModal, setShowPropModal] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddr, setPropAddr] = useState("");
  const [propCity, setPropCity] = useState("");
  const [propState, setPropState] = useState("");
  const [propZip, setPropZip] = useState("");
  const [propType, setPropType] = useState("single_family");

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");
  const [unitBeds, setUnitBeds] = useState(1);
  const [unitBaths, setUnitBaths] = useState(1);
  const [unitRent, setUnitRent] = useState(1500);

  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [leaseUnitId, setLeaseUnitId] = useState("");
  const [leaseRent, setLeaseRent] = useState(1500);
  const [leaseDeposit, setLeaseDeposit] = useState(1500);
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load dashboard data
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [propsData, leasesData, paymentsData, maintenanceData] = await Promise.all([
        api.getProperties(),
        api.getLeases(),
        api.getPayments(),
        api.getMaintenanceRequests()
      ]);
      setProperties(propsData);
      setLeases(leasesData);
      setPayments(paymentsData);
      setMaintenance(maintenanceData);
      if (propsData.length > 0) {
        setSelectedPropertyId(propsData[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load units for selected property
  useEffect(() => {
    if (selectedPropertyId) {
      api.getUnits(selectedPropertyId)
        .then(setUnits)
        .catch(err => console.error("Error loading units:", err));
    } else {
      setUnits([]);
    }
  }, [selectedPropertyId]);

  // Form Submissions
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      const newProp = await api.createProperty({
        name: propName,
        address_line1: propAddr,
        city: propCity,
        state: propState,
        zip: propZip,
        property_type: propType,
        unit_count: 0
      });
      setProperties([...properties, newProp]);
      setSelectedPropertyId(newProp.id);
      setShowPropModal(false);
      // Reset form
      setPropName("");
      setPropAddr("");
      setPropCity("");
      setPropState("");
      setPropZip("");
    } catch (err: any) {
      setError(err.message || "Failed to create property");
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return;
    try {
      setError("");
      const newUnit = await api.createUnit({
        property_id: selectedPropertyId,
        unit_number: unitNumber,
        bed_count: unitBeds,
        bath_count: unitBaths,
        market_rent_cents: unitRent * 100
      });
      setUnits([...units, newUnit]);
      setShowUnitModal(false);
      setUnitNumber("");
      setUnitBeds(1);
      setUnitBaths(1);
      setUnitRent(1500);
    } catch (err: any) {
      setError(err.message || "Failed to create unit");
    }
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      // Create Tenant Profile first (mock mapping)
      // For testing, our API automatically links profiles in leases, but we must provide a tenant ID or name.
      // So here, we pass a placeholder tenant profile setup
      const lease = await api.createLease({
        unit_id: leaseUnitId,
        start_date: leaseStart,
        end_date: leaseEnd,
        rent_amount_cents: leaseRent * 100,
        deposit_amount_cents: leaseDeposit * 100,
        late_fee_type: "flat",
        late_fee_value_cents: 5000, // $50.00
        grace_period_days: 5,
        tenant_ids: [] // Let API handle creation/linking
      });
      setLeases([...leases, lease]);
      setShowLeaseModal(false);
      setLeaseUnitId("");
      setLeaseRent(1500);
      setLeaseDeposit(1500);
      setLeaseStart("");
      setLeaseEnd("");
      loadData(); // Reload to fetch details
    } catch (err: any) {
      setError(err.message || "Failed to create lease");
    }
  };

  const handleUpdateMaintenance = async (reqId: string, nextStatus: string) => {
    try {
      await api.updateMaintenanceStatus(reqId, { status: nextStatus });
      setMaintenance(maintenance.map(m => m.id === reqId ? { ...m, status: nextStatus } : m));
    } catch (err: any) {
      alert("Error updating ticket status: " + err.message);
    }
  };

  const handleOpenTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setCommentText("");
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const newComment = await api.createMaintenanceComment(selectedTicket.id, commentText);
      const updatedTicket = {
        ...selectedTicket,
        comments: [...(selectedTicket.comments || []), newComment]
      };
      setSelectedTicket(updatedTicket);
      setMaintenance(maintenance.map(m => m.id === selectedTicket.id ? updatedTicket : m));
      setCommentText("");
    } catch (err: any) {
      alert("Failed to add comment: " + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteProperty = async (propId: string) => {
    if (!confirm("Are you sure you want to delete this property? All child units will be deleted.")) return;
    try {
      await api.deleteProperty(propId);
      setProperties(properties.filter(p => p.id !== propId));
      if (selectedPropertyId === propId) {
        setSelectedPropertyId(properties.length > 0 ? properties[0].id : null);
      }
    } catch (err: any) {
      alert("Error deleting property: " + err.message);
    }
  };

  // Metrics Calculation
  const totalRentCollected = payments
    .filter(p => p.status === "succeeded")
    .reduce((acc, curr) => acc + curr.amount_cents, 0) / 100;

  const totalOutstandingRent = payments
    .filter(p => p.status === "pending")
    .reduce((acc, curr) => acc + curr.amount_cents, 0) / 100;

  const activeTickets = maintenance.filter(m => m.status !== "resolved").length;

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-6 border-b border-slate-850 pb-4 text-sm text-slate-400">
          <Link href="/dashboard" className="text-white font-bold transition-all">Dashboard Overview</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          <Link href="/dashboard/applications" className="hover:text-white transition-all font-medium">Applications Inbox</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <Link href="/dashboard/accounting" className="hover:text-white transition-all font-medium">Trust Accounting Ledger</Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Landlord Portal</h1>
            <p className="text-slate-400 mt-1">Manage your portfolio properties, track leases, and view billing logs.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPropModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm cursor-pointer"
            >
              <Plus size={16} />
              Add Property
            </button>
            <button
              onClick={() => setShowLeaseModal(true)}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm cursor-pointer"
            >
              <Plus size={16} />
              Draft Lease
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-medium text-sm">Properties</span>
              <div className="p-2 rounded-xl bg-indigo-950/40 text-indigo-400 border border-indigo-900/40">
                <Building size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{properties.length}</div>
            <p className="text-slate-500 text-xs mt-1">Across all neighborhoods</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-medium text-sm">Collected Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">${totalRentCollected.toLocaleString()}</div>
            <p className="text-slate-500 text-xs mt-1">Total ACH & Card volume</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-medium text-sm">Outstanding Rent</span>
              <div className="p-2 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-900/40">
                <Clock size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">${totalOutstandingRent.toLocaleString()}</div>
            <p className="text-slate-500 text-xs mt-1">Pending clearance</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 font-medium text-sm">Maintenance Issues</span>
              <div className="p-2 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-900/40">
                <Wrench size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{activeTickets}</div>
            <p className="text-slate-500 text-xs mt-1">Requires immediate attention</p>
          </div>
        </div>

        {/* Dashboard Panels */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading portfolio details...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Properties & Units */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Portfolio Properties</h3>
                </div>
                
                {properties.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No properties listed. Click "Add Property" to begin.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedPropertyId(p.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedPropertyId === p.id 
                            ? "bg-slate-900 border-indigo-500/50 shadow-md" 
                            : "bg-slate-900/50 border-slate-850 hover:bg-slate-900/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            selectedPropertyId === p.id 
                              ? "bg-indigo-950 text-indigo-400 border-indigo-900/30" 
                              : "bg-slate-950 text-slate-400 border-slate-800"
                          }`}>
                            <Building size={18} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">{p.name}</h4>
                            <p className="text-slate-400 text-xs mt-0.5">{p.address_line1}, {p.city}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProperty(p.id);
                          }}
                          className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-950 transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Units List */}
              {selectedPropertyId && (
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Units</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Under selected property</p>
                    </div>
                    <button
                      onClick={() => setShowUnitModal(true)}
                      className="bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-900/40 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      Add Unit
                    </button>
                  </div>

                  {units.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No units listed for this property. Click "Add Unit" to set them up.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {units.map(u => (
                        <div key={u.id} className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-white text-sm">Unit {u.unit_number}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                u.status === "occupied" 
                                  ? "bg-indigo-950 text-indigo-400 border border-indigo-900/30" 
                                  : "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                              }`}>
                                {u.status}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs mt-1">{u.bed_count} Bed / {u.bath_count} Bath</p>
                          </div>
                          <div className="border-t border-slate-850 mt-4 pt-3 flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Market Rent</span>
                            <span className="font-bold text-white text-sm">${(u.market_rent_cents / 100).toLocaleString()}/mo</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Col: Maintenance & Leases */}
            <div className="space-y-8">
              
              {/* Maintenance Inbox */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Maintenance Requests</h3>

                {maintenance.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No active tickets submitted.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {maintenance.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => handleOpenTicket(m)}
                        className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-900/60"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-sm capitalize">{m.category} Issue</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === "resolved" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs line-clamp-2">{m.description}</p>
                        
                        <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1">
                          <span>Priority: <span className="font-bold text-slate-400 uppercase">{m.priority}</span></span>
                          {m.comments && m.comments.length > 0 && (
                            <span className="text-indigo-400 font-semibold">{m.comments.length} comment{m.comments.length > 1 ? 's' : ''}</span>
                          )}
                        </div>

                        {m.status !== "resolved" && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleUpdateMaintenance(m.id, "in_progress"); }}
                              className="flex-1 bg-slate-950 hover:bg-slate-850 text-slate-300 font-semibold py-1 rounded text-[11px] border border-slate-800 transition-all cursor-pointer"
                            >
                              Work In Progress
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleUpdateMaintenance(m.id, "resolved"); }}
                              className="flex-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 font-semibold py-1 rounded text-[11px] border border-indigo-900/30 transition-all cursor-pointer"
                            >
                              Mark Resolved
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Leases */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Active Leases</h3>

                {leases.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No active leases drafted.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leases.map(l => (
                      <div key={l.id} className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-white text-sm">Active Agreement</h4>
                            <p className="text-slate-400 text-xs mt-1">Start: {l.start_date}</p>
                            <p className="text-slate-400 text-xs">End: {l.end_date}</p>
                          </div>
                          <span className="font-bold text-white text-sm">${(l.rent_amount_cents / 100).toLocaleString()}/mo</span>
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

      {/* Property Modal */}
      {showPropModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateProperty} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-white">Add Property</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Name</label>
                <input 
                  type="text" 
                  value={propName} 
                  onChange={e => setPropName(e.target.value)}
                  placeholder="Elm Street Complex" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Address</label>
                <input 
                  type="text" 
                  value={propAddr} 
                  onChange={e => setPropAddr(e.target.value)}
                  placeholder="123 Elm St" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 font-medium">City</label>
                  <input 
                    type="text" 
                    value={propCity} 
                    onChange={e => setPropCity(e.target.value)}
                    placeholder="Austin" 
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">State</label>
                  <input 
                    type="text" 
                    value={propState} 
                    onChange={e => setPropState(e.target.value)}
                    placeholder="TX" 
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Zip</label>
                  <input 
                    type="text" 
                    value={propZip} 
                    onChange={e => setPropZip(e.target.value)}
                    placeholder="78701" 
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Type</label>
                  <select 
                    value={propType} 
                    onChange={e => setPropType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  >
                    <option value="single_family">Single Family</option>
                    <option value="multifamily">Multifamily</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button 
                type="button" 
                onClick={() => setShowPropModal(false)}
                className="bg-slate-950 border border-slate-800 text-slate-400 font-medium px-4 py-2 rounded-xl text-sm hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-indigo-500 cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateUnit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-white">Add Unit</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Unit Number</label>
                <input 
                  type="text" 
                  value={unitNumber} 
                  onChange={e => setUnitNumber(e.target.value)}
                  placeholder="101A" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Beds</label>
                  <input 
                    type="number" 
                    value={unitBeds} 
                    onChange={e => setUnitBeds(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Baths</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={unitBaths} 
                    onChange={e => setUnitBaths(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Market Rent ($)</label>
                <input 
                  type="number" 
                  value={unitRent} 
                  onChange={e => setUnitRent(Number(e.target.value))}
                  min="0"
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button 
                type="button" 
                onClick={() => setShowUnitModal(false)}
                className="bg-slate-950 border border-slate-800 text-slate-400 font-medium px-4 py-2 rounded-xl text-sm hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-indigo-500 cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lease Modal */}
      {showLeaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateLease} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-white">Create Lease</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Select Unit</label>
                <select
                  value={leaseUnitId}
                  onChange={e => setLeaseUnitId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="">Choose unit...</option>
                  {properties.map(p => (
                    <optgroup key={p.id} label={p.name}>
                      {/* Note: In a complete implementation we might preload all units in the dropdown */}
                      {units.map(u => (
                        <option key={u.id} value={u.id}>Unit {u.unit_number} - ${u.market_rent_cents/100}/mo</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Rent Amount ($)</label>
                  <input 
                    type="number" 
                    value={leaseRent} 
                    onChange={e => setLeaseRent(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Deposit ($)</label>
                  <input 
                    type="number" 
                    value={leaseDeposit} 
                    onChange={e => setLeaseDeposit(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Start Date</label>
                  <input 
                    type="date" 
                    value={leaseStart} 
                    onChange={e => setLeaseStart(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">End Date</label>
                  <input 
                    type="date" 
                    value={leaseEnd} 
                    onChange={e => setLeaseEnd(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Tenant Name</label>
                <input 
                  type="text" 
                  value={tenantName} 
                  onChange={e => setTenantName(e.target.value)}
                  placeholder="Alice Smith" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Tenant Email</label>
                <input 
                  type="email" 
                  value={tenantEmail} 
                  onChange={e => setTenantEmail(e.target.value)}
                  placeholder="alice@example.com" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button 
                type="button" 
                onClick={() => setShowLeaseModal(false)}
                className="bg-slate-950 border border-slate-800 text-slate-400 font-medium px-4 py-2 rounded-xl text-sm hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-indigo-500 cursor-pointer"
              >
                Activate Agreement
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Floating AI Assistant Chat */}
      <div className="fixed bottom-6 right-6 z-40">
        {!showAIAssistant ? (
          <button
            onClick={() => setShowAIAssistant(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-indigo-950/50"
          >
            <Sparkles size={20} />
            <span className="font-semibold text-sm pr-1">Ask AI Assistant</span>
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-950 p-4 border-b border-indigo-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles size={18} />
                <span className="font-bold text-white text-sm">Ledgerly AI Assistant</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowAIAssistant(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {aiResponses.map((res, i) => (
                <div 
                  key={i} 
                  className={`flex ${res.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    res.sender === "user" 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-slate-950 text-slate-300 rounded-bl-none border border-slate-855"
                  }`}>
                    {res.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-950 text-slate-400 border border-slate-855 p-3 rounded-2xl rounded-bl-none animate-pulse">
                    AI is analyzing portfolio ledgers...
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendAIQuery} className="p-3 border-t border-slate-850 flex gap-2 bg-slate-950/50">
              <input
                type="text"
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                placeholder="Ask about your cash flow or properties..."
                disabled={aiLoading}
                className="flex-1 bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:bg-indigo-800"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Maintenance Request Detail & Comments Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-850 flex justify-between items-center bg-indigo-950/20">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded-full">
                  {selectedTicket.priority} priority
                </span>
                <h3 className="text-lg font-extrabold text-white mt-2 capitalize">{selectedTicket.category} Issue</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white transition-all text-sm font-medium cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Description View */}
              <div className="space-y-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-855">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
                <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Submitted: {new Date(selectedTicket.created_at).toLocaleString()}</span>
                  {selectedTicket.updated_at !== selectedTicket.created_at && (
                    <span className="text-indigo-400 font-medium">
                      Edited: {new Date(selectedTicket.updated_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Section */}
              <div className="flex items-center justify-between text-xs bg-slate-950/20 p-3.5 border border-slate-850 rounded-xl">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-bold text-white capitalize bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
                  {selectedTicket.status}
                </span>
              </div>

              {/* Comments Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discussion Comments</h4>
                
                {/* Comments List */}
                <div className="space-y-3">
                  {!selectedTicket.comments || selectedTicket.comments.length === 0 ? (
                    <p className="text-slate-500 text-xs italic py-2">No comments added yet. Start the conversation below.</p>
                  ) : (
                    selectedTicket.comments.map((c: any) => (
                      <div key={c.id} className="bg-slate-950 border border-slate-855 p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-white">
                            {c.author_name} 
                            <span className="text-slate-500 font-normal ml-1.5 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">
                              {c.author_role}
                            </span>
                          </span>
                          <span className="text-slate-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Type a response or question..."
                    disabled={submittingComment}
                    required
                    className="flex-1 bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold px-4 rounded-xl text-xs cursor-pointer shadow-md flex items-center justify-center font-bold"
                  >
                    Send
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
