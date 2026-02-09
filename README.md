
*This project has been created as part of the 42 curriculum by keramos-, kbolon, jadyar, fdunkel.*

# ft_transcendence 🏓
A real-time multiplayer Pong game built with Svelte.

---

# Description

ft_transcendence is a full-stack web application centered around a modern implementation of the classic Pong game.
The project is developed as part of the 42 curriculum and focuses on real-time interaction, clean architecture, security, and extensibility through modular design.

Players can compete in live Pong matches, manage user profiles, and participate in tournaments.
The project is designed to evolve through optional modules such as AI opponents, matchmaking, statistics, and advanced user interaction.

## Why SvelteKit

We chose SvelteKit as our full-stack framework to keep frontend and backend logic within a single, coherent codebase.
SvelteKit provides file-based routing, server endpoints, and excellent performance with minimal boilerplate.
---

# Key Features

- Real-time Pong gameplay
- Multiplayer support
- User authentication & profiles
- Tournament-ready architecture
- Dockerized development environment
- Secure, modular, and extensible design

---

## Technical Stack

### Frontend & Backend
- **SvelteKit**
- **TypeScript**
- **Vite** is used as the build tool and dev server for fast iteration.
- Modern component-based architecture
- Responsive & accessible UI
- Backend endpoints via SvelteKit
- WebSockets for real-time gameplay
- Secure authentication & input validation
- **Drizzle ORM** provides type-safe database access and schema management.
- **Lucia** is used for authentication, offering a secure and framework-agnostic auth solution that integrates cleanly with SvelteKit.

### Database
- **PostgreSQL**
- Separate production and test databases
- Clear relational schema

### DevOps
- **Docker & Docker Compose**
- Environment-based configuration (.env)
- One-command startup

## Project Structure (High-Level)
```text
.
├── src/
│   ├── routes/                 # SvelteKit routes (pages + API endpoints)
│   │   ├── (api)/              # API route groups (auth, etc.)
│   │   ├── (legal)/            # Privacy Policy & Terms
│   │   ├── dashboard/          # Authenticated user pages
│   │   ├── profile/            # User profile pages
│   │   └── +layout.svelte      # Root layout
│   │
│   ├── lib/
│   │   ├── component/          # Reusable UI components
│   │   ├── server/             # Backend logic (auth, DB access)
│   │   │   ├── auth/           # Lucia authentication
│   │   │   └── db/             # Database access & helpers
│   │   ├── store/              # Client-side state stores
│   │   └── assets/             # Static assets (icons, logos)
│   │
│   ├── db/
│   │   └── schema/             # Drizzle ORM database schemas
│   │
│   ├── hooks.server.ts         # Global request hooks
│   ├── app.html                # HTML template
│   └── app.d.ts                # Type definitions
│
├── static/                     # Static public files (robots.txt, etc.)
├── drizzle.config.ts           # Drizzle ORM configuration
├── compose.yml                 # Docker Compose setup
├── Makefile                    # Convenience commands
├── scripts/                    # Utility scripts
├── e2e/                        # Playwright end-to-end tests
├── package.json                # Project dependencies
└── README.md
```

---
# Installation & Running the Project

## Prerequisites
- Docker & Docker Compose
- Make
- Node.js + npm (required by the Makefile targets)

## Environment Setup (in bash):
Copy the environment templates and adjust as necessary:

```bash
cp .env.example .env
cp .env.example .env.test
```

## Start the Project (in bash)
make start

## Useful Commands

```bash
make docker-down
make docker-clean
make clean
make test
```

The application startup will:
- Build the Docker images
- Start the PostgreSQL production and test databases
- Start the SvelteKit application (frontend & backend)

- make down will stop running the containers without removing data
- make clean will stop containers and remove associated volumes and cached data
- make test runs automated tests using the dedicated test database to ensure production data is not affected.

---

# Testing

Dedicated test database (db_test)
Tests are isolated from production data

Ports:
	- PostgreSQL (production): localhost:5432
	- PostgreSQL (test): localhost:5433
---

# Team Information
Name		Role(s)	Responsibilities
jadyar		Product Owner	Vision, feature prioritization, validation
keramos-	Project Manager	Planning, coordination, deadlines
fdunkel		Technical Lead	Architecture, stack decisions, reviews
kbolon		Developer	Feature implementation, testing

---

# Project Management

Task tracking via GitHub Issues
Feature branches with pull requests
Regular team syncs
Code reviews before merging

---

# Implemented Features

Pong game engine
Real-time paddle & ball synchronization
User registration & login
Secure session handling
Responsive game UI
(Extend this list as features are added.)

---
# Modules
Selected Modules
Module	Type	Points	Description
Web Framework (Frontend & Backend)	Major	2	SvelteKit used for full-stack
Real-time Gameplay	Major	2	WebSockets for live matches
User Management	Major	2	Auth, profiles
Tournament System	Minor	1	Brackets & matchmaking
AI Opponent	Major	2	Playable non-perfect AI

(Adjust to match your final module choices.)
---

# Database Schema (Overview)

users
id, username, email, password_hash

matches
id, player1_id, player2_id, result, timestamp

tournaments
id, name, status

scores
user_id, wins, losses
---

# Security & Best Practices

HTTPS-ready architecture
Input validation on frontend & backend
Password hashing
Secrets managed via .env
No credentials committed to Git
---

# Use of AI Tools

AI tools were used for:
Documentation drafting and refinement
High-level architecture discussions
Debugging assistance
All generated content was reviewed, understood, and adapted by the team.
---

# Resources

SvelteKit Documentation
PostgreSQL Documentation
Docker & Docker Compose Docs
WebSocket specifications
---

# Notes

Compatible with latest Chrome
No console errors or warnings
Privacy Policy & Terms of Service are included and accessible in the app
Built with teamwork, curiosity, and a lot of late-night debugging and coffee...so much coffee 🏓