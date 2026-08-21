# OpsAssist

An AI-assisted internal ticketing platform that classifies, routes, and helps resolve HR, IT, Finance, and Operations support requests — with load-balanced assignment, multi-stage approvals, an AI chatbot per ticket, and admin analytics.

## The idea

Most internal ticketing tools either dump every request into one inbox for someone to manually triage, or need a heavyweight ITSM platform to do it properly. OpsAssist sits in between: it classifies and routes tickets automatically using AI (with a deterministic fallback so it never just breaks), balances the load across whoever's available in the right department, and gives requesters an AI chatbot that actually knows their ticket's real status instead of a generic FAQ bot.

## Who uses it

- **Employees** submit tickets, chat with the AI about their own ticket's status, reply during approval workflows, and rate the resolution once it's closed.
- **Department admins** (HR / IT / Finance / Operations) see tickets routed to their department, work them, reassign across departments when needed, and reply via a shared conversation thread.
- **Super admins** see everything across all departments, plus admin analytics and AI-generated insight reports.

## Core features

### AI ticket classification, with a real fallback
New tickets are classified by Gemini into one or more departments (a ticket can span HR *and* Finance, for example) and given a priority. If the AI call fails or no API key is set, a regex-based heuristic classifier takes over instantly — classification never blocks or fails silently on the requester's end.

### Load-balanced routing
Each department assignment goes to whichever admin in that department currently has the fewest open/in-progress tickets, so work spreads evenly instead of piling onto one person.

### Multi-department tickets
A ticket can be routed to more than one department at once, each with its own independent assignment, status, and resolution — a payroll dispute involving both HR and Finance doesn't need to be split into two separate tickets.

### Multi-stage approval workflow
Admins can put a ticket into a manual approval flow (`approval_lock`), which blocks resolution until the workflow completes. Approval codes (OTPs) expire after a 3-minute TTL with a countdown in the UI — a fix for an earlier version that used non-expiring, `Math.random()`-generated codes. Requesters can reply directly if an approval comes back as "more information needed."

### Ticket-aware AI chatbot
Each ticket has its own chat thread. The AI is grounded in that specific ticket's real data — status, priority, department, assignee, resolution notes — and is instructed never to invent information it doesn't have. If a user wants a human, it points them to the admin messaging flow rather than guessing.

### AI-generated replies with department-specific guardrails
When a ticket is created, OpsAssist can generate an initial acknowledgement in a tone matched to the situation (formal, friendly, urgent, or empathetic — auto-selected from priority and content, e.g. anything HR-flagged as sensitive gets an empathetic tone). HR and Finance responses are explicitly constrained: the AI can acknowledge and escalate but is instructed never to give legal advice, make HR decisions, resolve payroll disputes, or give tax advice. IT and Operations replies are allowed to actually suggest fixes.

### Content moderation
Both the chatbot and the shared note thread run messages through strong-language detection before accepting them. Flagged messages are rejected with a request to rephrase, and the attempt is logged to a ticket activity trail — applies to admins and requesters alike.

### Conversation thread with auto status promotion
Tickets have a running note thread (user / admin / AI). The moment an admin replies, their department's assignment (and the ticket overall, if it was still Open) auto-promotes to "In Progress" — no manual status click required. If an admin messages and the requester doesn't respond within 2 minutes, a follow-up email goes out automatically; if the requester replies first, that follow-up is cancelled.

### Department reassignment with a paper trail
Admins can reassign a ticket to a different department, which requires a note explaining why. The system prevents assigning to a department the ticket is already routed to, re-balances the new department's assignee, and automatically posts the reassignment reason into the ticket's conversation thread.

### Feedback and ratings
Once resolved, requesters can rate their ticket 1–5 stars with an optional comment, tagged with whether it was resolved by AI or by a department.

### Admin analytics
A business-hours-aware analytics dashboard (Mon–Sat, 8am–5pm) covering:
- Ticket traffic by hour and priority
- First response time, response time, and resolution time
- Resolution rate and AI-resolution rate
- Ratings distribution

### AI insights reports
Two levels of AI-generated reporting, both with a non-AI fallback if no API key is available:
- **Executive summary** — a short narrative (Overview / Key Metrics / Strengths / Risks / Recommendations) built from ticket statistics.
- **Deep insights** — pulls a sample of actual ticket content and resolution notes and returns structured JSON identifying recurring issue themes, common fixes admins have used, resolution-time patterns, and business-level recommendations.

## Tech stack

- **Frontend/Framework:** TanStack Start, React 19
- **Backend:** TanStack Start server functions (`createServerFn`), input-validated with Zod
- **Database/Auth:** Supabase (Postgres with Row-Level Security, Supabase Auth)
- **AI:** Google Gemini (direct REST calls, server-side only — API key never reaches the browser), with heuristic fallbacks throughout so AI outages degrade gracefully instead of breaking the app
- **Email:** Resend, sending from a verified domain (`lukholo.online`) on Cloudflare DNS, with SAST-corrected timestamps
- **Hosting:** Cloudflare Workers

## Data model (high level)

- `tickets` — the core record: title, details, category/categories, priority, status, resolution metadata, `approval_lock`
- `ticket_assignments` — one row per department a ticket is routed to, each independently trackable (status, assignee, resolved_at)
- `ticket_notes` — the conversation thread per ticket (user / admin / ai authored)
- `ticket_activity` — audit log (e.g. blocked messages for strong language)
- `ticket_feedback` — post-resolution ratings and comments
- `pending_admin_message_notifications` — the 2-minute delayed follow-up queue for admin messages awaiting a reply
- `profiles` / `user_roles` — user identity, department assignment, and admin/employee role

## Security

A formal code review of an earlier version identified and fixed several issues, most notably:
- **IDOR vulnerabilities** — access checks now explicitly verify ticket ownership or department scope before returning ticket data or allowing actions on it
- **Non-expiring OTPs** — approval codes now expire after a 3-minute TTL
- **Weak OTP generation** — replaced `Math.random()`-based codes with a stronger generation method

UML activity diagrams documenting the approval workflow were produced as Visio (`.vsdx`) files as part of this review.

## Status

Actively developed as a CAPACITI project. Core ticketing, routing, approval workflow, AI chatbot, and analytics are built and in use; ongoing work includes refining the approval flow and ongoing AI model maintenance (Gemini model names have needed updating more than once in 2026 as Google retires older models ahead of their published dates).
