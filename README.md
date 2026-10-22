# EventWise AI

**A budget-aware, GenAI-powered event planning assistant with a Plan Recovery Engine.**

EventWise AI helps people plan weddings, birthdays, and community events. It builds a starter budget, creates a date-aware task list, tracks vendor outreach, and suggests how to adapt when costs or guest counts change. The initial demo is configured for a wedding with a ₹1,00,000 budget, 150 guests, and 60 days to go.

> All starter costs are illustrative estimates, not vendor quotations. The app does not verify or book vendors. Recovery plans are proposals and require user approval.

## Challenge vertical and persona

- **Vertical:** Event planning (wedding, birthday, community event).
- **Primary persona:** Someone organizing a wedding on a defined budget who needs clear next steps and help handling changes.
- **Core problem:** Event plans often live in scattered notes. Budget changes and vendor quote increases can cause overruns and missed deadlines.
- **Approach:** Combine deterministic calculations for budgets and recovery with Gemini for open-ended, personalized suggestions. The model does not control arithmetic or silently approve plan changes.

## Features

- Event brief: event type, total budget, guest count, and days remaining.
- Budget breakdown with editable category allocations.
- Budget per guest and a transparent contingency category.
- Date-aware timeline with priorities and interactive completion tracking.
- Vendor checklist for vendor name, quote, and booking status.
- Plan Recovery Engine for budget changes, vendor quote increases, and guest-count changes.
- Proposed changes require explicit acceptance; the original plan is not mutated by the recovery calculation.
- Optional Gemini API assistant with safe local demo fallback when no key is configured or the service is unavailable.
- Input validation, accessible labels, keyboard focus styles, and automated tests.

## Architecture

```text
Browser (React + Tailwind CSS / HTML)
        |
        | JSON requests
        v
Server API (Express / Python)
   |              |
   |              +--> Optional Gemini API (personalized suggestions via @google/genai)
   |
   +--> Deterministic planner and Plan Recovery Engine
```

Budget arithmetic and change proposals run deterministically. Gemini is used for open-ended ideas and explanations, not as the source of truth for calculations.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/plan` | Create a starter plan. Optional query parameters: `budget`, `guests`, `days`, `event_type`. |
| `POST` | `/api/recover` | Propose a recovery plan. JSON fields: `plan`, `change_type`, `value`, and optional `category`. |
| `POST` | `/api/assistant` | Ask for event suggestions. JSON fields: `prompt` and optional `plan`. |

## License

MIT. See [LICENSE](LICENSE).
