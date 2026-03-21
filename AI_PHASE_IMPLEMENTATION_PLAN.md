# AI Phase-Wise Implementation Plan (LLM API Only)

## Scope

This plan covers:

- Backend and client AI features using external LLM APIs only.
- No custom model training.
- Safe rollout with deterministic fallbacks and feature flags.

This repository already includes SaaS API key integration in the demo-bank app. Validation and demo sign-off should continue using that flow while AI features are rolled out incrementally.

## Delivery Principles

1. Deterministic security checks remain the source of truth.
2. AI recommendations can enrich decisions but must fail safely.
3. Every AI request must have timeout, retries, and schema validation.
4. Sensitive values must be redacted before prompts or logs.
5. Rollout must be controlled by feature flags and shadow mode first.

## Phase 0: Foundation and Safety

### Goal

Create the shared AI infrastructure with no behavioral change to auth decisions.

### Backend Deliverables

1. AI configuration in environment parser.
2. Request-level AI feature flags middleware.
3. Centralized AI gateway service:
   - timeout
   - bounded retries
   - strict JSON extraction
   - schema validation for risk output
4. Redaction utility for secrets and PII-like fields.
5. Audit metadata safety:
   - redact sensitive fields
   - cap oversized metadata payloads

### Client Deliverables

1. No mandatory UI behavior change in Phase 0.
2. Optional hidden diagnostics section can be added later for internal QA.

### Environment Variables (Phase 0)

- `AI_ENABLED` (`true|false`)
- `AI_PROVIDER` (currently `openai`)
- `AI_API_KEY`
- `AI_BASE_URL` (default OpenAI API base)
- `AI_MODEL` (for example: `gpt-4o-mini`)
- `AI_TIMEOUT_MS`
- `AI_MAX_RETRIES`
- `AI_FRAUD_SHADOW_MODE`
- `AI_FRAUD_ENFORCEMENT_MODE`
- `AI_THREAT_SUMMARY_ENABLED`
- `AI_PARTNER_ASSISTANT_ENABLED`

### Acceptance Criteria

1. Server starts with AI disabled and behaves exactly as before.
2. If AI is enabled but provider fails, requests do not crash.
3. AI calls are telemetry-friendly and carry request IDs.
4. No secrets appear in audit metadata.

## Phase 1: Fraud Risk Scoring (Shadow Mode)

### Goal

Compute AI risk for verification sessions but do not enforce AI actions yet.

### Backend Deliverables

1. Collect risk signals from existing services:
   - device trust
   - geo velocity
   - behavioral anomaly
   - attempt count and expiry context
2. Call AI gateway with risk prompt and strict output schema.
3. Persist AI suggestion in audit metadata.
4. Keep final auth decision deterministic.

### Client Deliverables

1. Show AI risk suggestion labels in admin (internal only).
2. Display confidence and reasons in dashboard threat cards.

### Acceptance Criteria

1. Shadow decisions generated for most verify requests.
2. Decision mismatch rate can be measured.
3. No new auth regressions.

## Phase 2: Controlled Enforcement + AI Threat Summaries

### Goal

Enable selective AI-driven friction while preserving deterministic hard-stop rules.

### Backend Deliverables

1. Decision matrix:
   - low risk: proceed
   - medium risk: increase friction
   - high risk with confidence threshold: block or manual review
2. AI-generated threat summaries from audit logs for admin operations.
3. Persist explainability metadata (reason set, confidence, prompt version).

### Client Deliverables

1. Admin threat summary cards.
2. Reviewer controls:
   - mark false positive
   - mark true positive

### Acceptance Criteria

1. Reduced suspicious passes.
2. Controlled false-positive rate.
3. Operations team can explain AI-influenced outcomes.

## Phase 3: Partner Integration Assistant

### Goal

Provide AI help for partner onboarding and troubleshooting.

### Backend Deliverables

1. Assistant endpoint with scoped knowledge.
2. Retrieval from curated docs and endpoint contracts.
3. Prompt-injection and data-exfiltration guardrails.

### Client Deliverables

1. Chat panel in docs/developers pages.
2. Endpoint-aware suggestions for integration failures.

### Acceptance Criteria

1. Faster partner integration troubleshooting.
2. Support ticket deflection on repeated setup questions.

## Phase 4: Optimization and Production Hardening

### Goal

Lower cost and improve reliability at scale.

### Deliverables

1. Model routing by task complexity.
2. Provider fallback strategy.
3. Async queues for non-blocking summary jobs.
4. Prompt version A/B tests and KPI review.

### Acceptance Criteria

1. Stable spend per month.
2. Reliable AI SLA under incident conditions.
3. Observable quality improvements over baseline.

## KPI Framework

### Security KPIs

1. Suspicious-session challenge/block rate.
2. False positive rate.
3. Time-to-detect abnormal patterns.

### Product KPIs

1. Login completion rate.
2. Partner integration success time.
3. Support ticket volume for common integration issues.

### Platform KPIs

1. AI call success rate.
2. P95 latency impact on verify flow.
3. Token and cost per feature.

## Rollout Strategy

1. Start with feature flags off in production.
2. Enable Phase 0 globally.
3. Enable Phase 1 in shadow mode for internal tenants first.
4. Expand by tenant/partner cohorts.
5. Only then enable controlled enforcement.

## Demo-Bank Validation Notes

Since demo-bank already uses SaaS API keys:

1. Use demo-bank for smoke tests of end-to-end auth before and after each phase.
2. Keep API key management and partner callbacks unchanged during Phase 0.
3. Add AI telemetry checks to ensure keys and signatures are never sent to LLM payloads.

## Immediate Execution Checklist (Phase 0)

1. Add AI env config and validations.
2. Add AI request context middleware.
3. Add redaction utility.
4. Add centralized AI gateway service.
5. Redact and bound audit metadata.
6. Run backend tests and verify no behavioral regressions.
