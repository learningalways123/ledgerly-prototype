"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Key, CreditCard, Wrench, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [role, setRole] = useState<"landlord" | "tenant" | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("demo_role") as "landlord" | "tenant";
    if (saved) {
      setRole(saved);
    } else {
      localStorage.setItem("demo_role", "landlord");
      setRole("landlord");
    }
  }, []);

  const handleEnterDemo = () => {
    if (role === "tenant") {
      router.push("/tenant");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto z-10">
        <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 px-4 py-1.5 rounded-full text-indigo-400 text-sm font-medium mb-8">
          <Home size={16} />
          <span>Next-Gen Property Operations</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Property Management, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400">
            Simplified for Growth
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
          Ledgerly unites rent collection, lease execution, tenant screening, and maintenance tracking into a single flat-rate, modern platform.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
          <button
            onClick={handleEnterDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-indigo-950/40 hover:shadow-indigo-950/60 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-lg"
          >
            Enter Demo Dashboard
            <ArrowRight size={20} />
          </button>
          
          <button
            onClick={() => {
              const next = role === "landlord" ? "tenant" : "landlord";
              localStorage.setItem("demo_role", next);
              setRole(next);
              router.push(next === "landlord" ? "/dashboard" : "/tenant");
            }}
            className="w-full sm:w-auto bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium px-6 py-4 rounded-xl transition-all cursor-pointer text-lg"
          >
            Log in as {role === "landlord" ? "Tenant" : "Landlord"}
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <CreditCard size={24} />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Automated Rent</h3>
            <p className="text-slate-400 text-sm">ACH and card payment collection with automatic late fee application and recurring autopay.</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-violet-950 border border-violet-800/40 flex items-center justify-center text-violet-400 mx-auto mb-4">
              <Key size={24} />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Digital Leases</h3>
            <p className="text-slate-400 text-sm">Draft, approve, and execute tenant leases online with integrated legal-grade e-signatures.</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-pink-950 border border-pink-800/40 flex items-center justify-center text-pink-400 mx-auto mb-4">
              <Wrench size={24} />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Smart Maintenance</h3>
            <p className="text-slate-400 text-sm">Submit photos, track progress status, assign work-orders, and message vendors directly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
