
# ft_transcendence

TO BE UPDATED...OLD

A modular, security-focused implementation of the classic Pong game — built as a TypeScript single-page application (SPA) and designed for real-time multiplayer gameplay.
This project is developed as part of the **ft_transcendence** challenge, with an emphasis on adaptability, clean architecture, and future module integration.

---

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
- **Frontend:** TypeScript (Vite, modular architecture, Tailwind CSS)
- **Backend:** Minimal PHP (extendable to Fastify/Node.js via module)
- **Containerization:** Docker
- **Networking:** WebSockets (wss)
- **Security:** HTTPS, input sanitization, secret storage

---

## 📝 Onboarding & Collaboration

**Folder Structure:**

**How to Contribute:**
1. Clone the repo and check out your feature branch.
2. TO BE UPDATED
3. Use `npm run dev` for local development.
4. Add your module code in the appropriate folder, following the modular structure.
5. Document any new scripts, configs, or requirements in this README or in `docs/`.
6. Use clear commit messages and push regularly.
7. Open a PR for review and tag the relevant module owner(s).

**Best Practices:**
- Do not use libraries that provide a full solution for any feature/module (see project rules).
- Use small, focused libraries only for subcomponents.
- Validate all user input and handle errors gracefully.
- Use `.env` for secrets and never commit credentials.
- Keep Docker and build scripts simple and extensible.
- Add TODOs or comments for integration points for other modules.
- Review and test your code with a peer before merging.

---

## 📚 References
- See `docs/REQUIREMENTS.md` for full project requirements.
- For module-specific onboarding, see `docs/` or ask the module owner.

---

**Let’s build something amazing — together!**

