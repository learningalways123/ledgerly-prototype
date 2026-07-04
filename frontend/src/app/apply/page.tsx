"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Home, ClipboardList, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ApplyPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [unitsMap, setUnitsMap] = useState<{ [key: string]: any[] }>({});
  
  const [selectedPropId, setSelectedPropId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [income, setIncome] = useState(60000);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProps = async () => {
      try {
        const props = await api.getProperties();
        setProperties(props);
        
        // Fetch units for each property to construct a dropdown tree
        const maps: { [key: string]: any[] } = {};
        await Promise.all(props.map(async (p: any) => {
          const u = await api.getUnits(p.id);
          maps[p.id] = u.filter((unit: any) => unit.status === "vacant");
        }));
        setUnitsMap(maps);
        
        if (props.length > 0) {
          setSelectedPropId(props[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load listings");
      } finally {
        setLoading(false);
      }
    };
    fetchProps();
  }, []);

  useEffect(() => {
    if (selectedPropId && unitsMap[selectedPropId] && unitsMap[selectedPropId].length > 0) {
      setSelectedUnitId(unitsMap[selectedPropId][0].id);
    } else {
      setSelectedUnitId("");
    }
  }, [selectedPropId, unitsMap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) {
      alert("Please select a valid unit.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      
      await api.submitApplication({
        unit_id: selectedUnitId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        income_cents: income * 100
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-850 rounded-2xl p-8 space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Application Received!</h2>
          <p className="text-slate-400 text-sm">
            Thank you for applying. Your screening consent has been processed. The landlord has been notified and will review your file shortly.
          </p>
          <div className="pt-4">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
            >
              <ArrowLeft size={16} /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-850 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
          <ClipboardList size={18} />
          <span>Vacancy Application Portal</span>
        </div>
        
        <div>
          <h2 className="text-2xl font-extrabold text-white">Apply for tenancy</h2>
          <p className="text-slate-400 text-xs mt-1">Submit your verification info. Landlords pay ACH screening fees directly.</p>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500/30 p-3 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-500 text-center py-6 text-sm">Loading property vacancies...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Select Property</label>
                <select
                  value={selectedPropId}
                  onChange={e => setSelectedPropId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Select Unit</label>
                <select
                  value={selectedUnitId}
                  onChange={e => setSelectedUnitId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="">Choose unit...</option>
                  {selectedPropId && unitsMap[selectedPropId]?.map(u => (
                    <option key={u.id} value={u.id}>Unit {u.unit_number} - ${u.market_rent_cents/100}/mo</option>
                  ))}
                </select>
                {selectedPropId && (!unitsMap[selectedPropId] || unitsMap[selectedPropId].length === 0) && (
                  <span className="text-[10px] text-amber-400 mt-1 block">No vacant units available.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  placeholder="John" 
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  placeholder="Doe" 
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="john.doe@example.com" 
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Phone</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="512-555-0199" 
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Annual Income ($)</label>
              <input 
                type="number" 
                value={income}
                onChange={e => setIncome(Number(e.target.value))}
                required
                min="0"
                className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-855 text-[11px] text-slate-400 leading-relaxed">
              *By clicking submit below, you explicitly authorize Ledgerly to request credit score, background checks, and eviction records from credit bureaus on behalf of the listing landlord, in compliance with FCRA standards.
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedUnitId}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-md cursor-pointer mt-2"
            >
              {submitting ? "Submitting File..." : "Submit Application & Consent"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
