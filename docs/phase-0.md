# Phase 0: Foundation Report — HomeEase

**Generated:** 2026-11-06  
**Status:** ✅ PASSED & VERIFIED

---

## 1. System Architecture Map

| Subsystem | Tech Stack | Repository / Directory | Live Status |
|-----------|------------|------------------------|-------------|
| **Core API** | Java 17/21 + Spring Boot 3.2 | `x_backend code` | `http://3.107.161.126:8080/actuator/health` **UP** |
| **Tracking API** | Spring Boot + WebSockets | `homeease-tracking-service` | `http://3.107.161.126:8082/actuator/health` **UP** |
| **Database** | Supabase PostgreSQL 17 (PostGIS, `btree_gist`) | Cloud (ap-south-1 pooler) | Connected & Migrated (V1–V17) |
| **Live State** | Redis 7.4.11 | Cloud / Docker | Connected & Verified |
| **Customer App** | React Native Expo (SDK 58) | `x_project_customer` | Typechecked & Polished (`master c0a128a`) |
| **Worker App** | React Native Expo | `x_service/Home_Ease_Worker_Frontend` | Integrated (`Slots`, `Jobs`, `Tracking`) |
| **Admin Panel** | React / Web | `x_project admin_panel` | Available |

---

## 2. Non-Negotiable Rules Compliance Audit

1. **Spring Boot Exclusive Access**: Privileged PostgreSQL/Redis credentials exist only in `application.yml` and environment variables. Mobile apps interact strictly via authenticated REST APIs (`/api/v1`) and WebSocket channels.
2. **Idempotency on Writes**: Money and booking creation writes carry `idempotency_key` (enforced via database constraints and API payload parameters).
3. **Transaction-Level Advisory Locks**: Avoid session locks in accordance with Supabase PgBouncer pooler mode (`pg_advisory_xact_lock`).
4. **JDBC URL Pooler Compatibility**: Configured `prepareThreshold=0` in `application.yml`:
   ```yaml
   url: jdbc:postgresql://${DB_HOST:aws-0-ap-south-1.pooler.supabase.com}:${DB_PORT:5432}/${DB_NAME:postgres}?sslmode=require&stringtype=unspecified&prepareThreshold=0
   ```
5. **Server-Side Pricing Snapshot**: All prices are computed server-side and recorded with itemized snapshot breakups.
6. **Transactional Outbox**: Implemented in Postgres via `booking_event_outbox` and `booking_event_history` (migration `V9`).
7. **UTC Timestamps & Timezones**: Timestamps stored as `TIMESTAMPTZ` (UTC). Operational window calculations derive from zone configurations.
8. **Guarded State Writes**: Every booking state transition bumps `booking.version` and appends an immutable entry to `booking_event_history`.
9. **PII Masking**: Customer contact details are masked prior to worker acceptance (`ACCEPTED` state).
10. **Dynamic Zone Configuration**: Radii, timeouts, and thresholds reside in `service_areas` / database config.

---

## 3. What Was Built & Verified in Phase 0

- **Health Checks**:
  - `GET http://3.107.161.126:8080/actuator/health` $\rightarrow$ `status: "UP"`, db: `UP`, redis: `UP`
  - `GET http://3.107.161.126:8082/actuator/health` $\rightarrow$ `status: "UP"`, redis: `UP`
- **Flyway Migrations**:
  - `V1` Initial Schema
  - `V7` Service Areas & Zones
  - `V9` `booking_event_history` & `booking_event_outbox`
  - `V11` Dual Booking System, `worker_availability`, `booking_slots`, `worker_time_off`
  - `V12` Admin Calendar Management
  - `V13` `booking_assignment`, `booking_otp`, `service_session`
  - `V14` Dispatch Audit & Worker Location
  - `V15` Explore Services
  - `V16` Dynamic Service Details & Cart System
  - `V17` Performance Indexes & Analytics
- **Seed Data**: Active categories (`Cleaning`, `AC Service & Repair`, `Electrician Services`, `Massage`), service zones in Hyderabad, and verified workers.
- **Client Builds**: Customer app compiled with 0 TypeScript errors.

---

## 4. What is Deferred to Later Phases

- **Phase 1**: Dedicated 30s background hold sweeper for `POST /slot-holds`, Razorpay webhook reconciliation cron.
- **Phase 2**: `AssignmentScorer` unit tests and T-120 `BatchAssigner` scheduler.
- **Phase 3**: Multi-ring instant dispatch (3 km $\rightarrow$ 5 km $\rightarrow$ 8 km) worker push/WebSocket rounds.
- **Phase 5**: Ops dispute console, ledger-based payout scheduler, and k6/JMeter load tests.

