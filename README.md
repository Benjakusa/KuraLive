# KuraLive Platform

**KuraLive** is a proprietary, hyperscale enterprise election data management and polling platform. It provides high-performance, real-time vote collection, station management, and multi-tenant agent polling capabilities.

## 🚀 Enterprise Architecture

KuraLive is built to withstand massive, sudden traffic spikes common during physical and remote election days. The stack utilizes:

*   **Clean (Hexagonal) Architecture:** The Python/Flask backend is decoupled into Domain Services and Infrastructure Repositories, isolating core business logic from framework and database dependencies.
*   **Hyperscale Indexing (UUIDv7):** All core database models (`results`, `poll_votes`, `users`) utilize a custom PostgreSQL PL/pgSQL UUIDv7 implementation. This prevents B-Tree index page fragmentation under heavy, concurrent `INSERT` operations.
*   **Database Multiplexing:** PostgreSQL connections are proxied through a Kubernetes-native `PgBouncer` service with a high-capacity connection pool, protecting the database engine from connection exhaustion.
*   **Granular Frontend Caching:** The React frontend (Vite) leverages `TanStack React Query` for background polling, cache invalidation, and server-side pagination, ensuring optimal browser performance regardless of dataset sizes.
*   **Asynchronous Processing:** Long-running I/O jobs (e.g., SMS bulk messaging via Twilio/Daraja API) are decoupled via Redis queues and dedicated worker containers.

## 💻 Tech Stack

### Backend
*   **Core:** Python 3.12+, Flask 3
*   **Database:** PostgreSQL 16 (psycopg3, Range Partitioning, JSONB)
*   **Connection Pooler:** PgBouncer
*   **Caching & Queues:** Redis 7
*   **Security:** `Flask-Limiter` for DDOS/Scraping protection, custom built CSRF middleware, deep Origin validation, Magic Byte file-upload validation.

### Frontend
*   **Core:** React 19, Vite
*   **State Management:** `@tanstack/react-query` v5
*   **Styling:** Tailwind CSS

### Infrastructure
*   **Containerization:** Multi-stage Docker builds.
*   **Orchestration:** Kubernetes (`backend-deployment`, `frontend-deployment`, `pgbouncer-deployment`)
*   **Observability:** Prometheus & Grafana integrations via `prom/prometheus`.
*   **CI/CD:** Automated GitHub Actions pipeline for linting, security scanning, testing, and unified container deployments.

## ⚠️ License

**PROPRIETARY AND CONFIDENTIAL**

Copyright (c) 2026 KuraLive. All Rights Reserved.

This software and its documentation are proprietary to KuraLive. No part of this software may be copied, reproduced, distributed, republished, downloaded, displayed, posted, or transmitted in any form or by any means without the prior written consent of KuraLive. Unauthorized use, reproduction, distribution, displaying, or modification of this software is strictly prohibited and could result in severe civil and criminal penalties.
