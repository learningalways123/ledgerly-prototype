"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Wrench, CheckCircle, Clock, Plus, HelpCircle, Send } from "lucide-react";

export default function VendorPortal() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Register vendor state
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorCategory, setVendorCategory] = useState("plumbing");
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getAssignedWorkOrders();
      setWorkOrders(data);
      
      const vendorsList = await api.getVendors();
      if (vendorsList.length > 0) {
        setRegistered(true);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load dispatch work orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRegistering(true);
      setError("");
      await api.createVendor({
        name: vendorName,
        email: vendorEmail,
        category: vendorCategory
      });
      setRegistered(true);
      loadData();
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      await api.updateMaintenanceStatus(orderId, { status: nextStatus });
      setWorkOrders(workOrders.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      alert("Work order status updated successfully.");
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
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
      setWorkOrders(workOrders.map(o => o.id === selectedTicket.id ? { ...o, comments: updatedTicket.comments } : o));
      setCommentText("");
    } catch (err: any) {
      alert("Failed to add comment: " + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Vendor Dispatch Portal</h1>
          <p className="text-slate-400 mt-1">Review dispatched jobs, submit invoice claims, and log resolution statuses.</p>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {!registered ? (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4 shadow-xl">
            <div>
              <h3 className="text-xl font-bold text-white">Register Dispatch Profile</h3>
              <p className="text-slate-400 text-xs mt-1">Connect your contractor firm to start receiving automated maintenance assignments.</p>
            </div>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Business Name</label>
                <input 
                  type="text" 
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  placeholder="Apex Plumbing Solutions" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Contact Email</label>
                <input 
                  type="email" 
                  value={vendorEmail}
                  onChange={e => setVendorEmail(e.target.value)}
                  placeholder="dispatch@apexplumbing.com" 
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Trade Category</label>
                <select
                  value={vendorCategory}
                  onChange={e => setVendorCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC / Heating & Cooling</option>
                  <option value="structural">Structural / Carpentry</option>
                  <option value="other">General Handyman</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md cursor-pointer"
              >
                {registering ? "Connecting..." : "Register Contractor Firm"}
              </button>
            </form>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-slate-500">Loading work orders...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Work Orders List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Dispatched Tickets</h3>
                
                {workOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No jobs currently assigned to your category.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workOrders.map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => handleOpenTicket(order)}
                        className="bg-slate-900 border border-slate-855 p-5 rounded-xl space-y-4 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-900/60"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Property Location</span>
                            <h4 className="font-bold text-white text-sm mt-0.5">{order.address}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === "resolved" 
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" 
                              : "bg-amber-950 text-amber-400 border border-amber-900/30"
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <p className="text-slate-300 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-855 leading-relaxed">
                          {order.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-855 pt-3">
                          <div className="flex flex-col gap-0.5">
                            <span>Dispatched: {new Date(order.created_at).toLocaleDateString()}</span>
                            {order.comments && order.comments.length > 0 && (
                              <span className="text-indigo-400 font-semibold text-[10px]">{order.comments.length} comment{order.comments.length > 1 ? 's' : ''}</span>
                            )}
                          </div>
                          
                          {order.status !== "resolved" && (
                            <div className="flex gap-2">
                              {order.status === "submitted" && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, "in_progress"); }}
                                  className="bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-900/30 font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Accept Dispatch
                                </button>
                              )}
                              {order.status === "in_progress" && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, "resolved"); }}
                                  className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/30 font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Log Work Resolved
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: Invoicing & Trade Info */}
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-indigo-400">
                  <Wrench size={100} />
                </div>
                <h3 className="text-lg font-bold text-white mb-4">Payout Accounts</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  Ledgerly operates split routing deposits directly. Resolve work orders to trigger auto-clearance claims inside the property manager ledger.
                </p>
                <div className="p-3 bg-slate-950 border border-slate-855 rounded-xl text-center text-xs text-indigo-400 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle size={16} /> Direct Payouts Active
                </div>
              </div>
            </div>

          </div>
        )}
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
    </div>
  );
}
