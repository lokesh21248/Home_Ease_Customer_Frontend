# Phase 2: Assignment Engine Deliverable & Verification

## 1. Overview & Architecture

Phase 2 establishes the unified assignment engine for HomeEase, powering both Instant and Scheduled (Slot) bookings with hard filters, multi-factor scoring, optimal global bipartite batch assignment, and automated reassignment triggers.

---

## 2. Deliverables Built

### A. Database Migration: `V19__phase_2_assignment_engine.sql`
- **`booking_assignment` Enhancements:**
  - `score DOUBLE PRECISION`: Persists the normalized candidate ranking score.
  - `rank_order INT`: Records the candidate's ranking tier.
- **`assignment_weight_config` Table (Rule #10):**
  - Configurable weights per zone and service category: `distance_weight` (0.35), `rating_weight` (0.25), `acceptance_rate_weight` (0.20), `completion_rate_weight` (0.10), `fairness_weight` (0.10).
  - Search radius (`max_search_radius_meters`), offer response timeout (`offer_timeout_seconds`), and batch assignment lead time (`batch_assign_t_minus_minutes = 120`).
- **`reassignment_trigger_log` Table (Section 7):**
  - Audits all automated and manual reassignment events: `WORKER_DECLINED`, `WORKER_TIMEOUT`, `NO_TRAVEL_AT_T_MINUS_30`, `STALE_GPS_TELEMETRY`, `CUSTOMER_REQUESTED`, `EMERGENCY_REASSIGN`.

### B. Core Services & Components

1. **`AssignmentScorer.java`**
   - **Hard Filters (Binary Gates):**
     - Rejects unverified workers (`is_verified = false`).
     - Rejects offline workers (`is_online = false`).
     - Rejects workers with active penalty/blocks (`blocked_until > now`).
     - Rejects workers with trade/service category mismatches.
     - Rejects workers with conflicting active slot overlaps.
     - Rejects workers outside the configured search radius.
   - **Multi-Factor Scoring Formula:**
     $$S = w_{dist} \cdot S_{dist} + w_{rating} \cdot S_{rating} + w_{accept} \cdot S_{accept} + w_{comp} \cdot S_{comp} + w_{fair} \cdot S_{fair}$$
     - Linear decay on distance.
     - Bayesian-smoothed rating normalization on a 5-star scale.
     - Marketplace fairness: Idle worker boost based on jobs completed today vs target.

2. **`BatchAssigner.java` (Slot T-120 Scheduler & Bipartite Matching)**
   - **Background Poller:** Runs at T-120 before scheduled slot windows.
   - **Global Optimization:** Solves Maximum Weight Bipartite Matching via the Hungarian algorithm (Kuhn-Munkres).
   - **Objective Function:** Prioritizes maximizing total bookings fulfilled first, then maximizing score utility.

3. **`ReassignmentService.java`**
   - **Automated Monitors:**
     - `NO_TRAVEL_AT_T_MINUS_30`: Automatically reassigns if a confirmed worker has not started travel 30 minutes before slot start.
     - `STALE_GPS_TELEMETRY`: Automatically reassigns if a traveling worker stops sending location pings for $> 15$ minutes.
   - Enforces Non-negotiable Rule #8: Bumps `booking.version` and appends `booking_event`.

---

## 3. Test Verification & Results

### A. Unit Tests: `AssignmentScorerTest.java` (7 Tests Passed)
- `testHardFilter_RejectsOfflineWorker`: Passed.
- `testHardFilter_RejectsUnverifiedWorker`: Passed.
- `testHardFilter_RejectsSkillMismatch`: Passed.
- `testHardFilter_RejectsSlotConflict`: Passed.
- `testHardFilter_RejectsOutOfRadius`: Passed.
- `testScorer_DistanceDecay`: Passed (verified closer worker receives strictly higher score).
- `testScorer_RatingImpact`: Passed (verified 5.0 star worker outscores 3.0 star worker).

### B. Tight-Supply Fixture Check: `BatchAssignerTest.java` (2 Tests Passed)
- **Constructed Scenario:**
  - Booking $B_1$ and Booking $B_2$.
  - Worker $W_1$ eligible for both $B_1$ (score 0.90) and $B_2$ (score 0.85).
  - Worker $W_2$ eligible ONLY for $B_1$ (score 0.70), ineligible for $B_2$.
- **Greedy Baseline Result:**
  - Assigns $B_1 \to W_1$ (0.90), leaving $B_2$ starved with 0 available workers.
  - **Fulfillments: 1 / 2 | Total Utility: 0.90**
- **BatchAssigner (Global Optimization) Result:**
  - Assigns $B_1 \to W_2$ (0.70) and $B_2 \to W_1$ (0.85).
  - **Fulfillments: 2 / 2 | Total Utility: 1.55**
- **Outcome:** `BatchAssigner` strictly beats greedy on both fulfillment count ($2 > 1$) and total score utility ($1.55 > 0.90$).

```
[INFO] Results:
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

---

## 4. What Was Built vs What Was Deferred

| Component | Status | Notes |
|---|---|---|
| Hard Filters Gate | **Built** | Online, verification, skill, overlap, radius |
| Multi-Factor Scorer | **Built** | Dynamic weights from DB, Bayesian rating, fairness |
| T-120 Batch Assigner | **Built** | Global Hungarian bipartite matching algorithm |
| Tight-Supply Check | **Built & Passed** | Proved batch assigner strictly beats greedy |
| Reassignment Triggers Table | **Built** | Audited in `reassignment_trigger_log` (Section 7) |
| Automated T-30 & GPS Watchdogs | **Built** | `@Scheduled` background detectors |
| Real-time WebSocket Geo Waves | *Deferred to Phase 3* | Scheduled for Phase 3 (Instant Dispatch & Geo Sets) |
