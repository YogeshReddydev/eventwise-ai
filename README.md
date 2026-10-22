# EventWise AI

**A budget-aware, GenAI-powered event planning assistant with a Plan Recovery Engine.**

EventWise AI helps individuals and organizers plan weddings, birthdays, and community events. It builds a deterministic starter budget, creates a date-aware milestone timeline, tracks vendor quotations with CSV export, and proposes mathematically sound plan recoveries when costs, quotes, or guest counts change. The default scenario is tailored for a wedding with a ₹1,00,000 budget, 150 guests, and 60 days to go.

> **Notice:** All initial costs are illustrative estimates, not binding vendor quotes. The application never books vendors automatically. All recovery actions are non-destructive proposals that require explicit user approval.

---

## Challenge Vertical & Persona

- **Vertical:** Event planning (weddings, milestone birthdays, community celebrations).
- **Primary Persona:** An event organizer or family planner on a defined budget needing transparent next steps, vendor tracking, and financial guardrails.
- **Core Problem:** Event planning notes often get fragmented. Cost overruns, vendor price escalations, and guest fluctuations can spiral without real-time recalculation.
- **Solution:** Hybrid architecture combining deterministic calculations for budgets, milestones, and contingency balancing with server-proxied Gemini API calls for creative ideas. Gemini never dictates arithmetic or silently modifies plans.

---

## Key Features

- **Event Brief:** Real-time form for event type, total budget, guest count, and countdown days with local decoupled state to prevent unnecessary re-renders.
- **Budget Breakdown & D3 Visualization:** Dynamic budget table and accessible D3-powered interactive pie chart showing spend distribution across categories.
- **Dual-Segment Spend Progress Bar:** Accessible visual progress bar displaying paid vs booked vs remaining budget with ARIA live attributes.
- **Spending Velocity Trend:** Recharts visualization tracking days-to-go alongside remaining budget.
- **Date-Aware Milestone Timeline:** Filterable tasks with due dates, priority badges, and an interactive accessible modal for adding custom tasks.
- **Vendor Checklist & CSV Export:** Searchable vendor tracker with status controls, quote inputs, and one-click CSV export styled with the design system.
- **Plan Recovery Engine:** Automated, non-destructive rebalancing for budget contractions/expansions, vendor quotation surges, and guest adjustments. Flexible categories absorb cuts before essentials; contingency funds are prioritized.
- **Server-Proxied Gemini Assistant:** Safe, server-side `@google/genai` integration with automatic fallback to local guidance when offline or unconfigured.

---

## Architecture & Security

```text
Browser (React 19 + TypeScript + Tailwind CSS)
        │
        ├── In-memory state & decoupled form controls (zero re-render lag)
        │
        └── JSON API requests (strict input bounds & sanitization)
                │
                ▼
        Full-Stack Server (Express / Python Standard Library)
        ├── Security Headers (nosniff, SAMEORIGIN, strict-origin-when-cross-origin)
        ├── In-Memory Rate Limiting (60 req/min for recover, 20 req/min for assistant)
        ├── In-Memory TTL Query Cache (60s for deterministic plans & questions)
        ├── Strict Input Validation (Bounds: ₹100Cr max, 1M guests, 3650 days)
        └── Server-Side Gemini Proxy (@google/genai SDK — keys never sent to browser)
                │
                ▼
        Deterministic Recovery Engine + Optional Gemini 2.5 Flash
```

### Security & Privacy Protections
1. **Zero Client-Side Secret Exposure:** Gemini API keys are read strictly from server environment variables (`GEMINI_API_KEY`). No secrets or API credentials ever reach the client bundle.
2. **Hardened HTTP Response Headers:** Every API response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
3. **Prompt & Input Sanitization:** Control characters and null bytes (`\x00`) are stripped before parsing. Prompts are capped at 2,000 characters.
4. **Rate Limiting:** Protects expensive operations and Gemini quota from abuse using token-bucket rate limiters.
5. **No Leaked Stack Traces:** Server errors return sanitized error messages without internal stack traces.

---

## Efficiency & Performance Optimizations

1. **Decoupled Form Inputs:** Form typing in `BriefSection` manages local component state and only commits to global state on form submission, eliminating unnecessary full-app re-renders.
2. **Single-Pass Memoization:** In `BudgetBreakdown`, vendor spend calculations (`paidAmount`, `bookedAmount`, `totalSpent`) are consolidated into a single pass using `useMemo`.
3. **In-Memory Server Caching:** Deterministic responses for identical budget parameters and identical assistant prompts are cached with a 60-second TTL, reducing computational overhead and duplicate external API calls.
4. **Lazy Re-renders:** Callback handlers across all major components are stabilized using `useCallback`.

---

## Accessibility (WCAG 2.1 AA Compliance)

- **Contrast Ratios:** Brand colors calibrated to WCAG AA/AAA standards (Ink `#1f1e1a`, Muted text `#57554e` at 5.2:1, Terracotta `#9c4f2b` at 5.8:1, Forest Green `#354c3c` at 7.5:1).
- **Keyboard Navigation & Visible Focus:** Unambiguous 2px focus rings (`focus-visible:ring-2`) across buttons, text inputs, selects, and checkboxes.
- **Screen Reader Support:** Semantic HTML tags, `.sr-only` labels for icon buttons and table headers, `aria-expanded` and `aria-controls` for collapse toggles, and ARIA progressbar roles with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- **Skip Link:** Direct keyboard skip-to-content link at the top of the viewport.
- **Accessible Modal:** `AddTaskModal` uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and escape-key / backdrop dismissal.

---

## API Endpoints

| Method | Endpoint | Description | Constraints |
|---|---|---|---|
| `GET` | `/api/health` | Health-check endpoint verifying service status. | None |
| `GET` | `/api/plan` | Generate deterministic starter event plan. | `budget` > 0, `guests` >= 1, `days` >= 0 |
| `POST` | `/api/recover` | Calculate non-destructive recovery recommendations. | `change_type`: `budget`, `vendor_increase`, `guests` |
| `POST` | `/api/assistant` | Query server-side Gemini assistant. | `prompt`: non-empty, <= 2,000 characters |

---

## Getting Started & Development

### Prerequisites
- Node.js (v18 or higher)
- Python 3.9+ (optional, for running Python tests or backend)

### Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Optional: Add your Gemini API key to `.env` to enable live AI suggestions:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### Running the Application
```bash
# Install dependencies
npm install

# Start the full-stack development server
npm run dev
```
The application will be available at `http://localhost:3000`.

### Running Tests & Lint Checks
```bash
# Run the Python test suite (23 unit & integration tests)
python3 -m unittest discover -s tests -v

# Run TypeScript type check
npm run lint

# Build the production bundle
npm run build
```

---

## Known Boundaries & Limitations

- **Illustrative Estimates:** Category allocations are starting benchmarks based on typical event ratios; users should obtain quotes directly from local vendors.
- **Demo Mode:** When `GEMINI_API_KEY` is omitted, the app operates in local deterministic demo mode with helpful rule-based guidance.

---

## License

MIT. See [LICENSE](LICENSE).

