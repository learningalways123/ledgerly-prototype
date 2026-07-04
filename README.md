# Ledgerly

**Ledgerly** is a unified residential property management software solution built for independent landlords and small property managers (1–150 units). It consolidates rent collection, lease generation, e-signatures, tenant credit screening, vendor dispatch logs, and trust ledger reporting.

This repository implements the full 4-phase rollout of the product requirements with mock integration triggers to support immediate local execution and sandbox demo flows.

---

## Technical Stack & Architecture

- **Frontend**: Next.js App Router (React), Tailwind CSS, Lucide Icons.
- **Backend**: FastAPI (Python), Uvicorn server.
- **Database**: SQLite (configured for local single-container deployments and stateless Cloud Run prototypes) / PostgreSQL compatible.
- **Auth**: Clerk Auth middleware (configured with dev fallbacks for easy testing).
- **Background Jobs**: Celery worker tasks with Redis broker configs (mockable natively).
- **AI Engine**: Google Gemini 2.5 Flash integration (automated maintenance ticket classification and portfolio cash flow assistant).

---

## Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── api/             # Routers for Properties, Leases, Payments, Maintenance, Screening, Accounting, and AI
│   │   ├── core/            # Configuration settings, Database connectors, and Clerk Auth helpers
│   │   ├── models/          # SQLAlchemy Database tables
│   │   ├── schemas/         # Pydantic request/response body schemas
│   │   └── services/        # Stripe, Plaid, and Google Gemini LLM API services
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js page portals (Landlord, Tenant, public Apply, and Vendor)
│   │   ├── components/      # Common layout widgets (RoleSwitcher)
│   │   └── lib/             # API client utilities
│   └── package.json         # Node frontend dependencies
├── Dockerfile               # Multi-stage Docker packaging configuration
├── run_demo.bat             # Windows launch script for dev mode
└── stop_demo.bat            # Windows terminate script for dev mode
```

---

## Getting Started (Local Development)

We provide simple batch scripts to run both the FastAPI server and Next.js dev server concurrently.

### Run the App
Double-click `run_demo.bat` or run:
```cmd
run_demo.bat
```
*This starts the backend on [http://localhost:8000](http://localhost:8000) (API Docs at `/docs`) and the Next.js app on [http://localhost:3000](http://localhost:3000).*

### Stop the App
Double-click `stop_demo.bat` or run:
```cmd
stop_demo.bat
```
*This terminates all background Node and Python processes started by the demo.*

---

## Features Demo Walkthrough

Ledgerly provides a **Demo Role Switcher** banner at the top of the interface to cycle between portals instantly:

1. **Apply for a Vacancy**: 
   - Switch to **Tenant** and click the navigation to apply or go to `/apply`.
   - Submit a tenancy application. This registers compliance consent under the Fair Credit Reporting Act (FCRA).
2. **Pull Credit Reports**:
   - Switch to **Landlord** and navigate to **Applications Inbox**.
   - Select the applicant and click **Request SmartMove Screening**.
   - View simulated credit scores, background logs, and click **Approve & Move In** to transition the unit to occupied.
3. **Connect Bank & Pay Rent**:
   - Switch to **Tenant**. You will see the active monthly lease.
   - Click **Link Bank Account** to simulate Plaid Link verification.
   - Click **Pay Rent** to initiate a Stripe ACH debit transfer.
4. **Dispatched Repairs**:
   - Switch to **Tenant** and submit a maintenance request (e.g., *"Kitchen sink is leaking water"*).
   - Switch to **Landlord**. The request will show in your inbox. Under the hood, Ledgerly's AI service triage has auto-classified the category (*plumbing*), priority (*emergency*), and generated a summary using **Gemini 2.5 Flash**.
   - Switch to **Vendor**, register your business, accept the dispatched work-order, and mark it resolved.
5. **Ledger Accounting & QuickBooks**:
   - Switch to **Landlord** and navigate to **Trust Accounting Ledger**.
   - Check the audit-ready ledger logs. Click **Pay Owner Client** to initiate Stripe ConnectExpress payouts.
   - Click **Sync QuickBooks** to simulate exporting the journal ledgers to QuickBooks Online.

---

## AI Assistant (Gemini 2.5 Flash)

Ledgerly integrates a conversational portfolio assistant.
- Landlords can open the **Ask AI Assistant** box in the bottom right corner of the dashboard.
- You can query cash-flow stats (e.g., *"what is my current occupancy rate?"*, *"how much rent is outstanding?"*).
- **Gemini 2.5 Flash** compiles database stats in real-time to answer operations questions.

*To activate the Gemini models, supply your api key in the environment:*
```env
GOOGLE_API_KEY="your-google-api-key"
```
*If this key is missing, Ledgerly runs in fallback mode, utilizing rule-based token parsing to reply.*

---

## Deployment on Google Cloud Run (SQLite)

Ledgerly compiles the Next.js frontend into static files and serves them directly from FastAPI. This packages the entire application into a single container running SQLite in-memory:

1. **Build the Docker Image**:
   ```bash
   docker build -t gcr.io/[PROJECT-ID]/ledgerly:latest .
   ```
2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy ledgerly \
     --image gcr.io/[PROJECT-ID]/ledgerly:latest \
     --platform managed \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars="GOOGLE_API_KEY=your-gemini-key"
   ```
