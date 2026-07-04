"use client";

import { useEffect, useState } from "react";
import { User, RefreshCw } from "lucide-react";

export default function RoleSwitcher() {
  const [role, setRole] = useState<"landlord" | "tenant" | "vendor">("landlord");

  useEffect(() => {
    const saved = localStorage.getItem("demo_role") as "landlord" | "tenant" | "vendor";
    if (saved) {
      setRole(saved);
    } else {
      localStorage.setItem("demo_role", "landlord");
    }
  }, []);

  const toggleRole = () => {
    let next: "landlord" | "tenant" | "vendor" = "landlord";
    if (role === "landlord") next = "tenant";
    else if (role === "tenant") next = "vendor";
    else next = "landlord";

    setRole(next);
    localStorage.setItem("demo_role", next);
    
    if (next === "landlord") {
      window.location.href = "/dashboard";
    } else if (next === "tenant") {
      window.location.href = "/tenant";
    } else {
      window.location.href = "/vendor";
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-semibold text-xs tracking-wider uppercase text-slate-400">Demo Environment</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-slate-850 px-3 py-1 rounded-full border border-slate-700">
          <User size={14} className="text-slate-400" />
          <span className="text-slate-200 capitalize">
            Logged in as: <strong className="text-white">{role}</strong>
          </span>
        </div>
        <button
          onClick={toggleRole}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-1.5 rounded-md transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <RefreshCw size={14} />
          Switch Role
        </button>
      </div>
    </div>
  );
}
