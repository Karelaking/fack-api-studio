# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (Fack Studio) & native CLI (Fack Runner)

## Users

Primary: Frontend, mobile, and full-stack developers whose real backend is
missing, unstable, rate-limited, or still under active development, and who need
a fast, lightweight local API server to build and test their user interfaces
without the friction of running a heavy fullstack application or Docker stack.

Secondary: QA engineers who need reproducible chaos/failure scenarios, and
engineering teams collaborating on API contracts where frontend developers run
lightweight local mock servers from an encrypted project specification.

## Product Purpose

Fack API is a hybrid mock API platform composed of a visual web design studio
(**Fack Studio**) and a blazing-fast, zero-dependency standalone native CLI tool
(**Fack CLI**).

Developers design their API contracts, nested response schemas, dynamic faker
generators, stateful CRUD collections, and chaos simulation rules once in the
web studio. The studio compiles and exports an **AES-256-GCM encrypted runtime
bundle** (`fack.enc`).

During day-to-day frontend development, developers do **not** need to run the
heavy fullstack web application, databases, Docker containers, or authentication
servers. Instead, they run the lightweight local CLI (`fack dev`) in their
frontend repository. The CLI decrypts the bundle strictly in memory, starts in
**< 10ms**, and serves the mock endpoints locally with zero cloud latency, full
offline support, and stateful in-memory persistence.

## Positioning

The mechanism a neighboring product could not truthfully copy:

1. **Decoupled Studio & Native Runtime:** API contracts and mock rules are
   visually designed in a rich web canvas, but executed locally via a compiled,
   zero-dependency standalone native binary (< 10ms startup, ~20MB RSS).
2. **Encrypted Specification (`fack.enc`):** Project configurations are securely
   encrypted with AES-256-GCM. Plaintext schemas and sensitive payloads never
   touch disk in plaintext, making bundles safe to commit to version control or
   share across distributed teams.
3. **Dual Workflow (File & Cloud Sync):** Works completely offline from a
   downloaded `fack.enc` file, or syncs on demand from the web platform via
   `fack pull <project-id>`.
4. **Deterministic In-Memory Engine:** Combines Radix Trie route matching,
   dynamic Faker data synthesis, in-memory stateful CRUD persistence, and chaos
   injection without executing untrusted model code.

## Operating Context

- **Design Phase (Fack Studio):** Browser-based studio at `/dashboard` (hosted or
  self-hosted Next.js application). Used for visual node canvas editing, schema
  building, AI architecture proposals, team collaboration, and bundle export.
- **Development Phase (Fack CLI):** Standalone native binary (`fack`) executed
  inside any frontend project (React, Next.js, Vue, Svelte, iOS, Android, etc.).
- **Distribution:** Precompiled native executables for Windows (`fack.exe`),
  macOS (`fack`), and Linux (`fack`), installable via curl/PowerShell or standalone download.
- **Offline & Air-Gapped:** The local CLI operates with zero internet access
  once `fack.enc` is present.
- **Security:** Decryption key (`FACK_PROJECT_KEY`) is provided via `.env`, CLI
  argument (`--key`), or interactive terminal prompt, never persisted unencrypted.

## Capabilities and Constraints

- **Hierarchy:** Project → Endpoint → Route (GET, POST, PUT, DELETE, PATCH).
- **Bundle Compiler & Encryptor:**
  - Flattens project endpoints, schemas, route parameters, headers, and status
    codes into an optimized runtime AST.
  - Authenticated encryption via **AES-256-GCM** (salt, 12-byte IV, 16-byte tag,
    PBKDF2 key derivation).
- **Native CLI Core:**
  - Sub-10ms startup time, minimal resource consumption.
  - High-performance HTTP mock server with automatic CORS handling for dev ports
    (`localhost:*`).
  - Fast Radix Trie route matcher with dynamic path parameters (`:id`) and wildcards (`*`).
  - Stateful in-memory CRUD collections (e.g. `POST /users` creates records that
    persist across requests in RAM during the dev session).
  - Dynamic Faker.js synthesis for realistic per-request payload generation.
  - Chaos & latency injection (configurable min/max delay, failure rates, custom headers).
  - Formatted live terminal request logger: `[METHOD] /path -> STATUS (latency)`.
- **Sync & Workflows:**
  - `fack dev`: Starts local mock server from `fack.enc`.
  - `fack pull <project-id>`: Downloads latest encrypted bundle using project secret.
  - `fack init`: Interactively generates `.env` key configuration and fetches bundle.
  - `fack inspect`: Inspects routes and status codes directly in the terminal.
- **AI Architect (Studio):** Natural-language prompt → structured API proposal →
  deterministic validation → reviewable change set. Model is a proposer only; no
  generated code runs in the execution path.
- **Auth Simulation:** HMAC-signed simulated mock Bearer tokens for routes marked
  auth-required; Clerk used for Studio dashboard authentication.

## Brand Commitments

- Name: **Fack API** (Fack Studio & Fack CLI); package and binary `fack-api` / `fack`.
- License: MIT; 100% free and open source with no vendor lock-in.
- Existing identity assets: `public/logo-v2.png`, `public/logo.png`,
  `public/logo.svg`, `public/social-preview.png`.
- Voice: Confident, developer-first, and ultra-performant. Built for developers
  who value speed, privacy, and frictionless local workflows.

## Product Principles

1. **Decoupled Design & Local Execution:** Heavy design tools belong in the
   browser; local mock serving belongs in an ultra-fast, lightweight native binary.
2. **Zero-Overhead Local Dev:** A frontend developer must never be forced to run
   a fullstack web app, Docker container, or database server just to get mock APIs.
3. **Confidential by Default:** Plaintext API specifications and mock data never
   touch disk unencrypted. Bundles are tamper-proof and safe for version control.
4. **Deterministic & Realistic:** The mock engine mirrors real production backend
   behavior — dynamic route parameters, stateful in-memory CRUD, realistic
   latency, and edge-case error simulation.
5. **One Unified Specification:** Fack Studio, the CLI runner, export tools, and
   AI architect all share the same canonical schema and AST representation.

## Accessibility & Inclusion

The Fack Studio interface adheres to full keyboard accessibility, clear visual
focus rings, semantic form labels, colorblind-safe HTTP method and status
indicators, and destructive action confirmations. The Fack CLI provides clean,
accessible terminal output with non-color fallback formatting for assistive
technologies and standard CI/terminal environments.
