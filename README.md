# ft_transcendence

A modular, security-focused implementation of the classic Pong game — built as a TypeScript single-page application (SPA) and designed for real-time multiplayer gameplay.  
This project is developed as part of the **ft_transcendence** challenge, with an emphasis on adaptability, clean architecture, and future module integration.

## 🚀 Features (Base Implementation)
- TypeScript SPA with browser back/forward navigation support
- Real-time Pong gameplay (two players, same keyboard)
- Simple tournament system with alias input & matchmaking
- Dockerized environment for one-command startup
- HTTPS/WSS-ready architecture
- Input validation & basic security hardening from day one

## 🔒 Security by Design
- HTTPS enforced for all communication
- Frontend & backend input validation
- Environment-based secrets management (`.env` files)
- Ready for WAF/ModSecurity & HashiCorp Vault integration
- GDPR and 2FA/JWT modules planned for expansion

## 🛠 Tech Stack
- **Frontend:** TypeScript (Vanilla, modular architecture)
- **Backend:** Minimal PHP (extendable to Fastify/Node.js via module)
- **Containerization:** Docker
- **Networking:** WebSockets (wss)
- **Security:** HTTPS, input sanitization, secret storage

