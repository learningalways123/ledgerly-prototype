const BASE_URL = typeof window !== "undefined" 
  ? (window.location.origin.includes("localhost") ? "http://localhost:8000/api/v1" : window.location.origin + "/api/v1")
  : "http://localhost:8000/api/v1";

export type Role = "landlord" | "tenant" | "vendor";

export function getAuthToken(): string {
  if (typeof window !== "undefined") {
    const role = localStorage.getItem("demo_role");
    if (role === "tenant") return "mock-tenant";
    if (role === "vendor") return "mock-vendor";
    return "mock-landlord";
  }
  return "mock-landlord";
}

async function request(endpoint: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getAuthToken()}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Something went wrong");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Properties
  getProperties: () => request("/properties/"),
  getProperty: (id: string) => request(`/properties/${id}`),
  createProperty: (data: { name: string; address_line1: string; address_line2?: string; city: string; state: string; zip: string; property_type: string; unit_count: number; owner_id?: string }) => 
    request("/properties/", { method: "POST", body: JSON.stringify(data) }),
  deleteProperty: (id: string) => request(`/properties/${id}`, { method: "DELETE" }),

  // Units
  getUnits: (propertyId: string) => request(`/properties/${propertyId}/units`),
  createUnit: (data: { property_id: string; unit_number: string; bed_count: number; bath_count: number; square_feet?: number; market_rent_cents: number }) => 
    request("/properties/units", { method: "POST", body: JSON.stringify(data) }),

  // Leases
  getLeases: () => request("/leases/"),
  getLease: (id: string) => request(`/leases/${id}`),
  createLease: (data: { unit_id: string; start_date: string; end_date: string; rent_amount_cents: number; deposit_amount_cents: number; late_fee_type: string; late_fee_value_cents: number; grace_period_days: number; tenant_ids: string[] }) => 
    request("/leases/", { method: "POST", body: JSON.stringify(data) }),

  // Payments
  getPayments: () => request("/payments/"),
  payRent: (leaseId: string) => request(`/payments/pay/${leaseId}`, { method: "POST" }),
  getPlaidLinkToken: () => request("/payments/plaid/link-token", { method: "POST" }),
  exchangePlaidToken: (publicToken: string, leaseId: string) => 
    request("/payments/plaid/exchange", { method: "POST", body: JSON.stringify({ public_token: publicToken, lease_id: leaseId }) }),

  // Maintenance
  getMaintenanceRequests: () => request("/maintenance/"),
  createMaintenanceRequest: (data: { unit_id: string; category: string; priority: string; description: string }) => 
    request("/maintenance/", { method: "POST", body: JSON.stringify(data) }),
  updateMaintenanceStatus: (id: string, data: { status: string; vendor_id?: string }) => 
    request(`/maintenance/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Tenant Screening & Vacancies (Phase 2)
  getApplications: () => request("/screening/"),
  submitApplication: (data: { unit_id: string; first_name: string; last_name: string; email: string; phone?: string; income_cents: number }) =>
    request("/screening/", { method: "POST", body: JSON.stringify(data) }),
  triggerScreening: (appId: string) => request(`/screening/${appId}/trigger-screening`, { method: "POST" }),
  updateApplicationStatus: (appId: string, data: { status: string }) =>
    request(`/screening/${appId}`, { method: "PATCH", body: JSON.stringify(data) }),
  sendAdverseAction: (appId: string) => request(`/screening/${appId}/send-adverse-action`, { method: "POST" }),

  // Accounting & Owner Ledgers (Phase 3)
  getOwners: () => request("/accounting/owners"),
  createOwner: (data: { name: string; email: string }) =>
    request("/accounting/owners", { method: "POST", body: JSON.stringify(data) }),
  getLedgerEntries: () => request("/accounting/ledger"),
  triggerPayout: (ownerId: string, amountCents: number) =>
    request(`/accounting/owners/${ownerId}/payout?amount_cents=${amountCents}`, { method: "POST" }),
  syncQuickbooks: () => request("/accounting/quickbooks/sync", { method: "POST" }),

  // Vendors (Phase 3)
  getVendors: () => request("/vendors/"),
  createVendor: (data: { name: string; contact_name?: string; email: string; phone?: string; category: string }) =>
    request("/vendors/", { method: "POST", body: JSON.stringify(data) }),
  getAssignedWorkOrders: () => request("/vendors/work-orders"),

  // AI Assistant & Triage (Phase 4)
  triageMaintenanceTicket: (description: string) =>
    request("/intelligence/triage", { method: "POST", body: JSON.stringify({ description }) }),
  askAssistant: (query: string) =>
    request("/intelligence/assistant", { method: "POST", body: JSON.stringify({ query }) }),
};
