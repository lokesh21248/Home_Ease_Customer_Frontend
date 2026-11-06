# Phase 3: Instant Dispatch & Real-Time Supply — Deliverables & Verification

## 1. Overview & Architecture

Phase 3 delivers real-time supply matching and instant dispatch for HomeEase:
1. **Worker Telemetry Stream (`/worker/stream`):** Bidirectional WebSocket channel streaming live GPS location coordinates, status heartbeats, and real-time job offers.
2. **Redis GEO Set (`geo:workers:{zone}`):** Spatial indexing with a 30-second TTL heartbeat pruning stale/disconnected workers automatically.
3. **Multi-Wave Dispatch Engine (3 km → 5 km → 8 km):** Progressive candidate radius expansion per zone configuration with wave timeouts.
4. **Atomic Acceptance Race Protection (`InstantAcceptService`):** Transaction-level advisory lock (`pg_advisory_xact_lock`) ensuring exactly one worker wins concurrent acceptance races, while all other competitors receive HTTP 409 Conflict ("job taken").

---

## 2. Key Deliverables Built

### A. Database Migration: `V20__add_version_to_bookings.sql`
- Added optimistic concurrency `version INTEGER NOT NULL DEFAULT 0` column to `bookings` table.
- Added `@Version` annotation to `Booking.java` to fulfill **Non-negotiable Rule #8** (guarded state writes).

### B. Worker WebSocket Stream & Controller
- **`WebSocketConfig.java`**: Registered `/worker/stream` endpoint for worker connections.
- **`WorkerStreamController.java`**:
  - `POST /api/v1/workers/stream/ping`: Ingests high-frequency telemetry pings from worker devices.
  - `POST /api/v1/workers/stream/bookings/{id}/accept`: Dedicated atomic acceptance endpoint.
- **`WorkerStreamService.java`**:
  - Records worker pings into Redis GEO set: `GEOADD geo:workers:{zone} {lng} {lat} {workerId}`.
  - Maintains 30-second TTL heartbeat key: `SET worker:heartbeat:{workerId} {zone} EX 30`.
  - Automatically prunes expired workers from the GEO set when heartbeats expire.
  - Pushes instant job offers over `/topic/worker/{workerId}/stream` and `/topic/worker/{workerId}/requests`.

### C. Multi-Round Wave Dispatch (`WaveDispatchService.java`)
- **Round 1 (3 km):** Dispatches to top candidates scored by `AssignmentScorer` within 3 km with a 20s countdown.
- **Round 2 (5 km):** If unaccepted, expands search to 5 km candidates.
- **Round 3 (8 km):** If still unaccepted, expands search to 8 km candidates.
- **Fallback / Exhaustion:** If all 3 rounds expire without acceptance, marks booking `WORKER_NOT_FOUND` and immediately notifies the customer.

### D. Atomic Accept Race Service (`InstantAcceptService.java`)
- Acquires `pg_advisory_xact_lock(hashtext('booking_accept:' || :bookingId))` (Non-negotiable Rule #3).
- Uses `SELECT ... FOR UPDATE` row lock on `bookings`.
- Atomic Winner Gate:
  - If `booking.status == SEARCHING`: Winner assigned, status $\to$ `ACCEPTED`, `version` bumped, 4-digit PIN generated, `PARTNER_ACCEPTED` event appended, and competing offers marked `DROPPED`.
  - If `booking.status != SEARCHING`: Immediate `JobAlreadyAcceptedException("This job has already been accepted by another partner.")`.

---

## 3. Test Verification & Results

### Dedicated Concurrency Test: `InstantAcceptRaceConcurrencyTest.java`
- **Setup:** 1 Booking in `SEARCHING` status + 20 distinct verified online Workers with pending assignment offers.
- **Execution:** 20 parallel threads released simultaneously via `CountDownLatch(1)` to call `acceptBooking(...)` at the exact same microsecond.
- **Results:**
  - **Assigned Count:** Exactly **1** worker won the booking.
  - **Job Taken Count:** Exactly **19** workers received `JobAlreadyAcceptedException` ("job taken").
  - **Database Status:** `BookingStage.ACCEPTED`, version bumped from `0` to `1`.
  - **Assignments Cleanup:** Competing 19 assignment records atomically updated to `DROPPED`.

```
[INFO] Running com.homeease.backend.service.AssignmentScorerTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.homeease.backend.service.BatchAssignerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.homeease.backend.service.InstantAcceptRaceConcurrencyTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
```

---

## 4. What Was Built vs What Was Deferred

| Component | Status | Notes |
|---|---|---|
| `/worker/stream` WebSocket endpoint | **Built** | Supports STOMP & SockJS protocols |
| `geo:workers:{zone}` Redis GEO set | **Built** | Added on pings, queried per zone |
| 30s Worker Heartbeat TTL | **Built** | Auto-pruned upon expiration |
| Wave Dispatch (3km $\to$ 5km $\to$ 8km) | **Built** | Multi-round progressive candidate search |
| Atomic Accept Race Handling | **Built** | `pg_advisory_xact_lock` + `findByIdForUpdate` |
| 20 Workers Simultaneous Accept Check | **Built & Passed** | Exactly 1 assigned, 19 receive "job taken" |
| Mobile App Client UI Integration | *Scheduled for Phase 4* | Customer & Worker Expo app frontend screens |

