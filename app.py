"""EventWise AI: standard-library web server and deterministic planning engine."""
from __future__ import annotations
import json
import os
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DEFAULT_CATEGORIES = [
    {"name": "Venue", "amount": 22000, "essential": True},
    {"name": "Catering", "amount": 30000, "essential": True},
    {"name": "Decorations", "amount": 12000, "essential": False},
    {"name": "Photography", "amount": 10000, "essential": False},
    {"name": "Clothing & makeup", "amount": 8000, "essential": False},
    {"name": "Transport", "amount": 5000, "essential": False},
    {"name": "Invitations & gifts", "amount": 3000, "essential": False},
    {"name": "Contingency", "amount": 10000, "essential": True},
]
DEFAULT_TASKS = [
    ("Confirm budget and guest list", 60, "High"), ("Shortlist and visit venues", 55, "High"),
    ("Book venue", 50, "High"), ("Compare catering menus and quotes", 45, "High"),
    ("Book photographer", 40, "Medium"), ("Choose theme and decoration plan", 35, "Medium"),
    ("Send invitations", 28, "High"), ("Confirm clothing and makeup", 21, "Medium"),
    ("Confirm final guest count with vendors", 10, "High"), ("Reconfirm bookings and payments", 3, "High"),
    ("Prepare event-day run sheet", 1, "High"),
]

MAX_BUDGET_LIMIT = 1_000_000_000
MAX_GUEST_LIMIT = 1_000_000
MAX_DAYS_LIMIT = 3_650

def money(value):
    try:
        val = float(value)
        if val != val or val == float('inf') or val == float('-inf'):
            raise ValueError()
        return round(val, 2)
    except (ValueError, TypeError):
        raise ValueError("Invalid numeric monetary value.")

def build_plan(budget=100000, guests=150, days=60, event_type="Wedding"):
    try:
        budget = money(budget)
        guests = int(guests)
        days = int(days)
    except (ValueError, TypeError):
        raise ValueError("Budget must be positive, guests at least 1, and days cannot be negative.")
        
    if budget <= 0 or guests < 1 or days < 0:
        raise ValueError("Budget must be positive, guests at least 1, and days cannot be negative.")
    if budget > MAX_BUDGET_LIMIT:
        raise ValueError("Budget exceeds allowable limit.")
    if guests > MAX_GUEST_LIMIT:
        raise ValueError("Guest count exceeds allowable limit.")
    if days > MAX_DAYS_LIMIT:
        raise ValueError("Days cannot exceed 3,650 days.")

    categories = [dict(item) for item in DEFAULT_CATEGORIES]
    scale = budget / sum(item["amount"] for item in categories)
    for item in categories: item["amount"] = round(item["amount"] * scale)
    categories[-1]["amount"] += round(budget - sum(item["amount"] for item in categories))
    today = date.today()
    tasks = []
    for title, lead_days, priority in DEFAULT_TASKS:
        offset = min(days, lead_days)
        tasks.append({"title": title, "due_date": (today + timedelta(days=max(0, days-offset))).isoformat(), "priority": priority, "done": False})
    return {"event_type": str(event_type).strip()[:80], "budget": budget, "guests": guests, "days_until_event": days,
            "per_guest_budget": round(budget / guests, 2), "categories": categories, "tasks": tasks,
            "vendors": [{"category": x["name"], "vendor": "", "quote": x["amount"], "status": "Not contacted"} for x in categories if x["name"] != "Contingency"],
            "assumptions": ["All prices are illustrative estimates, not live market quotes.", "A contingency allocation is included in the initial budget model.", "Dates are generated relative to the day the plan is created."]}

def recover_plan(plan, change_type, value, category=None):
    """Return a proposed plan without mutating the original plan."""
    if not plan or not isinstance(plan.get("categories"), list):
        raise ValueError("Valid event plan is required.")

    updated = json.loads(json.dumps(plan))
    notes = []

    if change_type == "budget":
        new_budget = money(value)
        if new_budget <= 0: raise ValueError("New budget must be greater than zero.")
        if new_budget > MAX_BUDGET_LIMIT: raise ValueError("Budget exceeds maximum limit.")
        old_budget = updated["budget"]
        if new_budget < old_budget:
            reduction = old_budget - new_budget
            pool = [c for c in updated["categories"] if not c["essential"]] + [c for c in updated["categories"] if c["essential"] and c["name"] != "Contingency"]
            total_pool = sum(c["amount"] for c in pool); remaining = reduction
            for item in pool:
                if remaining <= 0: break
                cut = min(item["amount"], round(reduction * item["amount"] / max(1, total_pool)))
                item["amount"] -= cut; remaining -= cut
            for item in reversed(pool):
                if remaining <= 0: break
                cut = min(item["amount"], remaining); item["amount"] -= cut; remaining -= cut
            contingency = next(c for c in updated["categories"] if c["name"] == "Contingency")
            contingency["amount"] = max(0, new_budget - sum(c["amount"] for c in updated["categories"] if c is not contingency))
            notes.append(f"Budget reduced by ₹{reduction:,.0f}. Flexible categories were adjusted first; review the proposed cuts before accepting.")
        else:
            extra = new_budget - old_budget
            next(c for c in updated["categories"] if c["name"] == "Contingency")["amount"] += extra
            notes.append(f"Budget increased by ₹{extra:,.0f}; the additional amount is held in contingency until you assign it.")
        updated["budget"] = new_budget
    elif change_type == "vendor_increase":
        increase = money(value)
        if increase <= 0: raise ValueError("Vendor increase must be greater than zero.")
        if not category or not any(c["name"] == category for c in updated["categories"]):
            raise ValueError("Please select a valid event category for the vendor quote increase.")
        contingency = next(c for c in updated["categories"] if c["name"] == "Contingency")
        covered = min(contingency["amount"], increase); contingency["amount"] -= covered
        shortfall = increase - covered
        if shortfall:
            candidates = [c for c in updated["categories"] if not c["essential"] and c["name"] != category]
            available = sum(c["amount"] for c in candidates)
            for item in candidates:
                if shortfall <= 0: break
                cut = min(item["amount"], round(shortfall * item["amount"] / max(1, available)))
                item["amount"] -= cut; shortfall -= cut
            if shortfall > 0: notes.append(f"The contingency cannot fully cover the increase; about ₹{shortfall:,.0f} remains unresolved. Request another quote or approve further cuts.")
        target = next((c for c in updated["categories"] if c["name"] == category), None)
        if target: target["amount"] += increase
        notes.insert(0, f"Vendor quote increased by ₹{increase:,.0f}. Contingency was used first; proposed changes need your approval.")
    elif change_type == "guests":
        try:
            new_guests = int(value)
        except (ValueError, TypeError):
            raise ValueError("Guest count must be at least one.")
        if new_guests < 1: raise ValueError("Guest count must be at least one.")
        if new_guests > MAX_GUEST_LIMIT: raise ValueError("Guest count exceeds limit.")
        old_guests = updated["guests"]; updated["guests"] = new_guests
        delta = new_guests - old_guests
        catering = next(c for c in updated["categories"] if c["name"] == "Catering")
        estimated_delta = round((catering["amount"] / max(1, old_guests)) * delta)
        notes.append(f"Guest count changed from {old_guests} to {new_guests}. Catering may change by approximately ₹{estimated_delta:,.0f}; this is an estimate, not a vendor quote.")
    else:
        raise ValueError("Unsupported change type.")

    updated["per_guest_budget"] = round(updated["budget"] / updated["guests"], 2)
    updated["recovery_notes"] = notes
    updated["requires_user_approval"] = True
    return updated

def ask_gemini(prompt, plan):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {"mode": "demo", "answer": "Demo mode is active. Your budget, timeline, and recovery calculations work locally. Add GEMINI_API_KEY to enable personalized Gemini suggestions."}
    try:
        model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        safe_plan = {
            "event_type": plan.get("event_type"),
            "budget": plan.get("budget"),
            "guests": plan.get("guests"),
            "days_until_event": plan.get("days_until_event"),
            "categories": plan.get("categories"),
        }
        body = {
            "contents": [{"parts": [{"text": "You are EventWise AI, a practical event planner. Use the supplied event data, label estimates, never claim a vendor is verified, and keep advice concise.\nEvent data: " + json.dumps(safe_plan) + "\nUser request: " + prompt}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 700}
        }
        req = Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": api_key}, method="POST")
        with urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode())
        return {"mode": "gemini", "answer": data["candidates"][0]["content"]["parts"][0]["text"]}
    except Exception:
        return {"mode": "fallback", "answer": "Gemini is temporarily unavailable. Your local planner is still working; try again later."}

class Handler(BaseHTTPRequestHandler):
    def _send(self, status, payload, content_type="application/json; charset=utf-8"):
        body = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except (ValueError, TypeError):
            raise ValueError("Invalid Content-Length header.")
        if length > 100_000: raise ValueError("Request body is too large.")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(raw or b"{}")

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send(200, {"status": "ok", "service": "EventWise AI"})
            return
        if parsed.path == "/api/plan":
            q = parse_qs(parsed.query)
            try:
                self._send(200, build_plan(
                    float(q.get("budget", [100000])[0]),
                    int(q.get("guests", [150])[0]),
                    int(q.get("days", [60])[0]),
                    q.get("event_type", ["Wedding"])[0]
                ))
            except (ValueError, TypeError) as e:
                self._send(400, {"error": str(e)})
            return
        relative = "index.html" if parsed.path == "/" else parsed.path.removeprefix("/static/") if parsed.path.startswith("/static/") else None
        if relative and Path(relative).name == relative and relative in {"index.html", "styles.css", "app.js"}:
            path = STATIC / relative
            if path.exists():
                self._send(200, path.read_bytes(), {".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8"}[path.suffix])
                return
        self._send(404, {"error": "Not found"})

    def do_POST(self):
        try:
            data = self._body()
        except (ValueError, json.JSONDecodeError) as e:
            self._send(400, {"error": "Invalid JSON request body."})
            return
        if self.path == "/api/recover":
            try:
                self._send(200, recover_plan(data.get("plan") or build_plan(), data.get("change_type", ""), data.get("value"), data.get("category")))
            except (ValueError, TypeError, KeyError) as e:
                self._send(400, {"error": str(e)})
        elif self.path == "/api/assistant":
            prompt = str(data.get("prompt", "")).replace('\x00', '').strip()
            if not prompt:
                self._send(400, {"error": "Please enter a question."})
            elif len(prompt) > 2000:
                self._send(400, {"error": "Please keep the question under 2,000 characters."})
            else:
                self._send(200, ask_gemini(prompt, data.get("plan") or build_plan()))
        else:
            self._send(404, {"error": "Not found"})

    def log_message(self, format, *args):
        pass

def main():
    port = int(os.getenv("PORT", "5000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"EventWise AI is running at http://127.0.0.1:{port}")
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__ == "__main__": main()
