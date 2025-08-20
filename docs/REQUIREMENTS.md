# Project Setup & Requirements

## Prerequisites
- Node.js v20.x (recommended: use nvm or nvp)
- npm (comes with Node.js)
- Docker (optional, for backend/services)

## Setup

```sh
# Clone the repo
git clone <repo-url>
cd aTranscendence

# Set up frontend
cd frontend
npm install

# (Optional) Run tests
npm test

# Build the project
npm run build
```

## Useful Commands

- `npm run build` — Build the frontend
- `npm test` — Run tests
- `npm start` — (if you add a start script)

## Notes
- Use `nvm install 20 && nvm use 20` or `nvp use 20` to set Node version.
- For backend or Docker setup, see additional documentation in `/backend` or `/ops`.
