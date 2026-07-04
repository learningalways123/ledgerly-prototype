"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  ClipboardList, CheckCircle, XCircle, 
  RefreshCw, FileText, UserCheck, ShieldAlert 
} from "lucide-react";
import Link from "next/link";

export default function ApplicationsDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getApplications();
      setApplications(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScreenApplicant = async (appId: string) => {
    try {
      const updated = await api.triggerScreening(appId);
      setApplications(applications.map(a => a.id === appId ? updated : a));
      alert("Screening report requested! TransUnion SmartMove webhook returned complete status.");
    } catch (err: any) {
      alert("Screening trigger failed: " + err.message);
    }
  };

  const handleApprove = async (appId: string) => {
    try {
      const updated = await api.updateApplicationStatus(appId, { status: "approved" });
      setApplications(applications.map(a => a.id === appId ? updated : a));
      alert("Application approved! Unit status transitioned to occupied.");
    } catch (err: any) {
      alert("Approval failed: " + err.message);
    }
  };

  const handleDeny = async (appId: string) => {
    if (!confirm("Are you sure you want to deny this applicant? Ledgerly will automatically generate and send an FCRA Adverse Action notification.")) return;
    try {
      await api.updateApplicationStatus(appId, { status: "denied" });
      const updated = await api.sendAdverseAction(appId);
      setApplications(applications.map(a => a.id === appId ? updated : a));
      alert("Application denied. FCRA-compliant adverse action email sent.");
    } catch (err: any) {
      alert("Denial failed: " + err.message);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-6 border-b border-slate-850 pb-4 text-sm text-slate-400">
          <Link href="/dashboard" className="hover:text-white transition-all font-medium">Dashboard Overview</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          <Link href="/dashboard/applications" className="text-white font-bold transition-all">Applications Inbox</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <Link href="/dashboard/accounting" className="hover:text-white transition-all font-medium">Trust Accounting Ledger</Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Applications Inbox</h1>
            <p className="text-slate-400 mt-1">Review tenant submissions, pull bureau credit screening files, and approve agreements.</p>
          </div>
          <button 
            onClick={loadData}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading received applications...</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            <ClipboardList className="mx-auto text-slate-600 mb-4" size={48} />
            <h3 className="text-lg font-bold text-white mb-1">No applications yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">Create a public vacancy link in the properties dashboard to start collecting applications.</p>
            <Link 
              href="/apply"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Open Public Apply Page
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {applications.map(app => (
              <div key={app.id} className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-800 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-lg">{app.first_name} {app.last_name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      app.status === "approved" 
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                        : app.status === "denied" || app.status === "adverse_action_sent"
                        ? "bg-rose-950 text-rose-400 border border-rose-900/30"
                        : "bg-amber-950 text-amber-400 border border-amber-900/30"
                    }`}>
                      {app.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 text-xs text-slate-400">
                    <div>
                      <span className="block text-slate-500">Email</span>
                      <span className="text-slate-200 mt-0.5 block">{app.email}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Phone</span>
                      <span className="text-slate-200 mt-0.5 block">{app.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Annual Income</span>
                      <span className="text-slate-200 mt-0.5 block font-semibold text-white">
                        ${(app.income_cents / 100).toLocaleString()}/yr
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Credit Score</span>
                      <span className={`mt-0.5 block font-bold ${
                        app.credit_score ? (app.credit_score > 700 ? "text-emerald-400" : "text-amber-400") : "text-slate-500"
                      }`}>
                        {app.credit_score || "Screening Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 border-slate-850 pt-4 md:pt-0">
                  {/* Screening Trigger */}
                  {!app.credit_score && app.status === "submitted" && (
                    <button
                      onClick={() => handleScreenApplicant(app.id)}
                      className="bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-900/30 font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={14} className="animate-spin-slow" />
                      Request SmartMove Screening
                    </button>
                  )}

                  {/* screening report check */}
                  {app.credit_score && (
                    <a 
                      href={app.screening_report_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-slate-950 border border-slate-800 text-slate-300 hover:text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={14} />
                      View Credit Report
                    </a>
                  )}

                  {/* Actions */}
                  {app.status === "screening_pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(app.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck size={14} />
                        Approve & Move In
                      </button>
                      <button
                        onClick={() => handleDeny(app.id)}
                        className="bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900/30 font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert size={14} />
                        Reject File
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
