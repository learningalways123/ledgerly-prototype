import os
import json
import logging

logger = logging.getLogger("gemini_service")

# Try importing the google-generativeai package
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-generativeai package not installed. Running in mock/fallback mode.")

class GeminiService:
    @staticmethod
    def _get_fallback_triage(description: str) -> dict:
        desc_lower = description.lower()
        
        # Category classification
        category = "other"
        if any(w in desc_lower for w in ["leak", "faucet", "clog", "pipe", "toilet", "water", "plumbing", "drain"]):
            category = "plumbing"
        elif any(w in desc_lower for w in ["outlet", "breaker", "fuse", "electric", "wiring", "power", "light"]):
            category = "electrical"
        elif any(w in desc_lower for w in ["ac", "heat", "heater", "hvac", "cold", "warm", "furnace"]):
            category = "hvac"
        elif any(w in desc_lower for w in ["fridge", "stove", "oven", "washer", "dryer", "dishwasher", "appliance"]):
            category = "appliance"
        elif any(w in desc_lower for w in ["roof", "window", "door", "lock", "wall", "drywall"]):
            category = "structural"

        # Urgency classification
        priority = "normal"
        if any(w in desc_lower for w in ["flood", "fire", "smoke", "burst", "emergency", "gushing"]):
            priority = "emergency"
        elif any(w in desc_lower for w in ["broken", "no power", "freezing", "hot", "overflowing"]):
            priority = "high"
        elif any(w in desc_lower for w in ["slow", "dripping", "cosmetic", "paint", "squeak"]):
            priority = "low"

        return {
            "category": category,
            "priority": priority,
            "summary": description[:60] + ("..." if len(description) > 60 else ""),
            "is_mock": True
        }

    @staticmethod
    def triage_maintenance(description: str) -> dict:
        """
        Classifies maintenance issue into category and priority level.
        Uses Gemini 2.5 Flash if api key is provided, else falls back to local rule engine.
        """
        api_key = os.getenv("GOOGLE_API_KEY")
        if not GENAI_AVAILABLE or not api_key:
            return GeminiService._get_fallback_triage(description)

        try:
            genai.configure(api_key=api_key)
            # Utilizing gemini-2.5-flash as specified by the user
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = f"""
            Analyze the following tenant maintenance request description and classify it.
            Respond strictly with a JSON object containing keys: "category", "priority", and "summary".
            
            - "category" must be one of: "plumbing", "electrical", "hvac", "appliance", "structural", "other".
            - "priority" must be one of: "low", "normal", "high", "emergency".
            - "summary" is a one-sentence summary of the core issue.
            
            Tenant Request: "{description}"
            JSON Response:
            """
            
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            result = json.loads(response.text.strip())
            result["is_mock"] = False
            return result
        except Exception as e:
            logger.error(f"Gemini Triage failed, falling back: {str(e)}")
            return GeminiService._get_fallback_triage(description)

    @staticmethod
    def chat_assistant(query: str, db_context: dict) -> str:
        """
        A Chat bot assistant responding to cash flow and unit portfolio queries.
        Uses Gemini 2.5 Flash if api key is provided, else generates a rule-based summary report.
        """
        # Rule-based fallback report
        summary_report = f"""
        Ledgerly Portfolio Context Summary:
        - Active Leases: {db_context.get('active_leases_count', 0)}
        - Total Properties: {db_context.get('properties_count', 0)}
        - Total Rent Collected (Revenue): ${db_context.get('revenue_cents', 0) / 100:.2f}
        - Total Outstanding Payments: ${db_context.get('outstanding_cents', 0) / 100:.2f}
        - Active Maintenance Tickets: {db_context.get('maintenance_count', 0)}
        """

        api_key = os.getenv("GOOGLE_API_KEY")
        if not GENAI_AVAILABLE or not api_key:
            # Clean fallback reply
            q_lower = query.lower()
            if "rent" in q_lower or "revenue" in q_lower or "income" in q_lower or "cash" in q_lower:
                return f"Based on local ledger logs, your total rent collected (revenue) is **${db_context.get('revenue_cents', 0) / 100:.2f}** with an outstanding pending balance of **${db_context.get('outstanding_cents', 0) / 100:.2f}**."
            elif "maintenance" in q_lower or "ticket" in q_lower or "issue" in q_lower:
                return f"You currently have **{db_context.get('maintenance_count', 0)}** active maintenance requests. You can check the tickets queue in the dashboard for dispatch logs."
            else:
                return f"Hello! I am your Ledgerly AI Assistant. I can help parse your financial stats. Currently: {summary_report}"

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = f"""
            You are the Ledgerly Intelligent Property Management Assistant. 
            Answer the user's question about their portfolio cash flow or operations.
            Refer to the provided current database metrics to construct a personalized, precise, and polite response.
            
            Context Data:
            {json.dumps(db_context)}
            
            User Question: "{query}"
            Response:
            """
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Gemini Assistant error: {str(e)}. Fallback stats: {summary_report}"
