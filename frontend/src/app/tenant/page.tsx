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

  // Maintenance comments / edit / delete states
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [googleAuthenticated, setGoogleAuthenticated] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState("");
  const [googleUserEmailInput, setGoogleUserEmailInput] = useState("sarah@aircare.com");

  // Lease e-signature states
  const [signingStep, setSigningStep] = useState(1);
  const [signatureConsent, setSignatureConsent] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [submittingSignature, setSubmittingSignature] = useState(false);

  // Browse properties & apply states
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [showApplyModal, setShowApplyModal] = useState<any | null>(null);
  const [applyFirstName, setApplyFirstName] = useState("Sarah");
  const [applyLastName, setApplyLastName] = useState("Conner");
  const [applyEmail, setApplyEmail] = useState("sarah@aircare.com");
  const [applyPhone, setApplyPhone] = useState("555-0199");
  const [applyIncome, setApplyIncome] = useState(65000);
  const [submittingApp, setSubmittingApp] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAvailableUnits = async () => {
    try {
      const propertiesData = await api.getProperties();
      let allUnits: any[] = [];
      for (const p of propertiesData) {
        const unitsData = await api.getUnits(p.id);
        allUnits = [...allUnits, ...unitsData.filter((u: any) => u.status === "vacant")];
      }
      setAvailableUnits(allUnits);
    } catch (err) {
      console.error("Error loading available units:", err);
    }
  };

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
        const active = leasesData.find((l: any) => l.status === "active") || leasesData[0];
        setActiveLease(active);
      }
      
      await loadAvailableUnits();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load tenant portal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isAuth = localStorage.getItem("google_authenticated") === "true";
    setGoogleAuthenticated(isAuth);
    if (isAuth) {
      const savedEmail = localStorage.getItem("google_user_email") || "sarah@aircare.com";
      setGoogleUserEmail(savedEmail);
      setGoogleUserEmailInput(savedEmail);
      loadData();
    } else {
      setLoading(false);
    }
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

  const handleGoogleSignIn = () => {
    const email = googleUserEmailInput || "sarah@aircare.com";
    localStorage.setItem("google_authenticated", "true");
    localStorage.setItem("google_user_email", email);
    localStorage.setItem("demo_role", "tenant");
    setGoogleAuthenticated(true);
    setGoogleUserEmail(email);
    loadData();
  };

  const handleGoogleSignOut = () => {
    localStorage.removeItem("google_authenticated");
    localStorage.removeItem("google_user_email");
    setGoogleAuthenticated(false);
    setGoogleUserEmail("");
    setLeases([]);
    setActiveLease(null);
    setPayments([]);
    setMaintenance([]);
  };

  const handleSignLease = async (e: React.FormEvent) => {
    e.preventDefault();
    const draftLease = leases.find((l: any) => l.status === "draft");
    if (!draftLease) return;
    if (!signatureConsent) {
      alert("You must consent to digital signing.");
      return;
    }
    if (!signatureName.trim()) {
      alert("Please type your name to sign.");
      return;
    }
    try {
      setSubmittingSignature(true);
      const signed = await api.signLease(draftLease.id, signatureConsent, signatureName);
      setLeases(leases.map(l => l.id === signed.id ? signed : l));
      setActiveLease(signed);
      alert("Lease contract signed successfully!");
    } catch (err: any) {
      alert("Signature failed: " + err.message);
    } finally {
      setSubmittingSignature(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showApplyModal) return;
    try {
      setSubmittingApp(true);
      await api.submitApplication({
        unit_id: showApplyModal.id,
        first_name: applyFirstName,
        last_name: applyLastName,
        email: applyEmail,
        phone: applyPhone || undefined,
        income_cents: applyIncome * 100
      });
      alert("Application submitted successfully! The landlord will review it and send a lease offer.");
      setShowApplyModal(null);
    } catch (err: any) {
      alert("Failed to submit application: " + err.message);
    } finally {
      setSubmittingApp(false);
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

  const handleOpenTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setEditDescription(ticket.description);
    setEditPriority(ticket.priority);
    setIsEditing(false);
    setCommentText("");
  };

  const handleEditTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const updated = await api.updateMaintenanceRequest(selectedTicket.id, {
        description: editDescription,
        priority: editPriority
      });
      setMaintenance(maintenance.map(m => m.id === selectedTicket.id ? { ...m, ...updated } : m));
      setSelectedTicket({ ...selectedTicket, ...updated });
      setIsEditing(false);
      alert("Ticket updated successfully.");
    } catch (err: any) {
      alert("Failed to update ticket: " + err.message);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    if (!confirm("Are you sure you want to delete this maintenance ticket?")) return;
    try {
      await api.deleteMaintenanceRequest(selectedTicket.id);
      setMaintenance(maintenance.filter(m => m.id !== selectedTicket.id));
      setSelectedTicket(null);
      alert("Ticket deleted successfully.");
    } catch (err: any) {
      alert("Failed to delete ticket: " + err.message);
    }
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

  const draftLease = leases.find((l: any) => l.status === "draft");

  if (!googleAuthenticated) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black min-h-[80vh]">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-500/30 text-indigo-400 mb-2">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Access Tenant Portal</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Create an account, submit rental applications, digitally sign lease contracts, and pay rent online using Ledgerly.
          </p>

          <div className="space-y-3 pt-2 text-left bg-slate-950/40 p-4 border border-slate-850 rounded-2xl">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Mock Authentication Identity</label>
            <input
              type="email"
              value={googleUserEmailInput}
              onChange={e => setGoogleUserEmailInput(e.target.value)}
              placeholder="sarah@aircare.com"
              className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setGoogleUserEmailInput("sarah@aircare.com")}
                className="text-[9px] bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-2 py-1 rounded cursor-pointer transition-all"
              >
                sarah@aircare.com
              </button>
              <button
                type="button"
                onClick={() => setGoogleUserEmailInput("charlie@example.com")}
                className="text-[9px] bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-2 py-1 rounded cursor-pointer transition-all"
              >
                charlie@example.com
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 text-sm"
          >
            {/* Google Logo Mock */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-900 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Tenant Portal</h1>
            <p className="text-slate-400 mt-1">Pay your monthly rent, link accounts, and submit maintenance tickets.</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-850 p-2.5 rounded-xl text-xs">
            <span className="text-slate-300 font-semibold">{googleUserEmail}</span>
            <button
              onClick={handleGoogleSignOut}
              className="text-red-400 hover:text-red-300 font-bold transition-all cursor-pointer bg-red-950/20 px-2 py-1 rounded"
            >
              Sign Out
            </button>
          </div>
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

                {draftLease ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <ShieldCheck size={16} />
                      <span>Lease offer ready for signature</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400 border-b border-slate-800 pb-4">
                      <span className={`${signingStep === 1 ? "text-indigo-400 font-bold border-b-2 border-indigo-500 pb-4 -mb-[18px]" : ""}`}>1. Review Terms</span>
                      <span className={`${signingStep === 2 ? "text-indigo-400 font-bold border-b-2 border-indigo-500 pb-4 -mb-[18px]" : ""}`}>2. E-Sign Consent</span>
                      <span className={`${signingStep === 3 ? "text-indigo-400 font-bold border-b-2 border-indigo-500 pb-4 -mb-[18px]" : ""}`}>3. Digital Signature</span>
                    </div>

                    {signingStep === 1 && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Monthly Rent</span>
                            <p className="text-lg font-bold text-white">${draftLease.rent_amount_cents / 100}/mo</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Security Deposit</span>
                            <p className="text-lg font-bold text-white">${draftLease.deposit_amount_cents / 100}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Start Date</span>
                            <p className="text-sm font-semibold text-white">{new Date(draftLease.start_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">End Date</span>
                            <p className="text-sm font-semibold text-white">{new Date(draftLease.end_date).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="text-xs text-slate-400 leading-relaxed bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-lg">
                          <strong>Note:</strong> By signing this contract, you agree to pay the monthly rent and deposit specified above, and abide by the standard lease clauses.
                        </div>

                        <button
                          type="button"
                          onClick={() => setSigningStep(2)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                        >
                          Continue to Consent
                        </button>
                      </div>
                    )}

                    {signingStep === 2 && (
                      <div className="space-y-4 pt-2">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Consent to Electronic Signature</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">
                            You consent to electronically sign this lease agreement. Clicking &quot;I agree&quot; and typing your signature constitutes a legally binding electronic signature under federal law.
                          </p>
                          <label className="flex items-center gap-2.5 text-xs text-slate-300 font-medium pt-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={signatureConsent}
                              onChange={e => setSignatureConsent(e.target.checked)}
                              className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
                            />
                            I agree to use electronic records and signature.
                          </label>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSigningStep(1)}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setSigningStep(3)}
                            disabled={!signatureConsent}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Continue to Sign
                          </button>
                        </div>
                      </div>
                    )}

                    {signingStep === 3 && (
                      <form onSubmit={handleSignLease} className="space-y-4 pt-2">
                        <div className="space-y-3">
                          <label className="text-xs text-slate-400 font-medium">Type your Full Name to sign</label>
                          <input
                            type="text"
                            placeholder="Sarah Conner"
                            value={signatureName}
                            onChange={e => setSignatureName(e.target.value)}
                            required
                            disabled={submittingSignature}
                            className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSigningStep(2)}
                            disabled={submittingSignature}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={submittingSignature || !signatureName.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
                          >
                            {submittingSignature ? "Signing Contract..." : "Confirm & Sign Lease"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : !activeLease ? (
                  <div className="text-center py-12 text-slate-500">
                    No active lease found. Browse available properties below to apply.
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

                    {activeLease.tenant_consent_signed && (
                      <div className="bg-slate-950 p-4 border border-slate-855 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                            <ShieldCheck size={14} /> Signed Lease Copy Active
                          </span>
                          <span className="text-slate-500 text-[10px]">Signed: {new Date(activeLease.tenant_signed_at).toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 space-y-1">
                          <p><strong>Tenant Signature:</strong> {activeLease.tenant_signature_name} (Digitally Signed)</p>
                          <p><strong>Consent Provided:</strong> Yes, electronic signature authorized.</p>
                          <p><strong>Lease Term:</strong> {new Date(activeLease.start_date).toLocaleDateString()} to {new Date(activeLease.end_date).toLocaleDateString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => alert("Downloading copy of signed lease...")}
                          className="w-full text-center text-xs text-indigo-400 hover:underline pt-1.5 block font-semibold cursor-pointer"
                        >
                          Download signed PDF contract copy
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!activeLease && !draftLease && (
                <div className="bg-slate-900/40 border border-slate-855 rounded-2xl p-6 relative overflow-hidden">
                  <h3 className="text-lg font-bold text-white mb-2">Available Rentals</h3>
                  <p className="text-xs text-slate-400 mb-6 font-medium">Browse vacant units and submit your lease application to Acme Property Management.</p>

                  {availableUnits.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No vacant units currently available for rent.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableUnits.map(unit => (
                        <div key={unit.id} className="bg-slate-950 border border-slate-855 p-4 rounded-xl flex flex-col justify-between gap-4">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded-full">
                              Vacant
                            </span>
                            <h4 className="font-bold text-white text-sm mt-2">Unit {unit.unit_number}</h4>
                            <p className="text-xs text-slate-400 mt-1">{unit.bed_count} Bed / {unit.bath_count} Bath ({unit.square_feet} sq ft)</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
                            <span className="font-extrabold text-white text-sm">${unit.market_rent_cents / 100}/mo</span>
                            <button
                              onClick={() => setShowApplyModal(unit)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                            >
                              Apply Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                      <div 
                        key={m.id} 
                        onClick={() => handleOpenTicket(m)}
                        className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-900/60"
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
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-855 flex justify-between items-center">
                          <span>Submitted on {new Date(m.created_at).toLocaleDateString()}</span>
                          {m.comments && m.comments.length > 0 && (
                            <span className="text-indigo-400 font-semibold">{m.comments.length} comment{m.comments.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              
              {/* Edit Mode Toggle / Description View */}
              {!isEditing ? (
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
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Edit Ticket
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTicket}
                      className="bg-red-950/40 hover:bg-red-950 border border-red-900/30 text-red-400 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Delete Ticket
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEditTicket} className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-855">
                  <h4 className="text-xs font-bold text-slate-300">Edit Original Request</h4>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium">Priority Urgency</label>
                    <select
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium">Problem Description</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      required
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-855 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                    ></textarea>
                  </div>
                  <div className="flex gap-2 justify-end text-xs">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-slate-400 px-3 py-1.5 rounded-lg hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded-lg cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

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
      {/* Lease Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleApply} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-lg font-bold text-white">Apply for Lease</h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(null)}
                className="text-slate-400 hover:text-white transition-all text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-xs text-indigo-400">
              Applying for <strong>Unit {showApplyModal.unit_number}</strong> at Acme Property Management.
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">First Name</label>
                  <input
                    type="text"
                    required
                    value={applyFirstName}
                    onChange={e => setApplyFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Last Name</label>
                  <input
                    type="text"
                    required
                    value={applyLastName}
                    onChange={e => setApplyLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Contact Email</label>
                <input
                  type="email"
                  required
                  value={applyEmail}
                  onChange={e => setApplyEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={applyPhone}
                  onChange={e => setApplyPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Annual Income ($)</label>
                <input
                  type="number"
                  required
                  value={applyIncome}
                  onChange={e => setApplyIncome(Number(e.target.value))}
                  min="0"
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingApp}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md cursor-pointer mt-2"
            >
              {submittingApp ? "Submitting Application..." : "Submit Lease Application"}
            </button>
          </form>
        </div>
      )}

      </div>
    </div>
  );
}
