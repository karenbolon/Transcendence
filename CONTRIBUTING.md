# Contributing

## Logging

All server-side code must use the **Pino** logger from `src/lib/server/logger.ts`. Do not use `console.log`, `console.warn`, or `console.error` in server code.

### Available loggers

```typescript
import { logger, apiLogger, dbLogger, authLogger, socketLogger } from '$lib/server/logger';
```

| Logger         | Use for                                      |
| -------------- | -------------------------------------------- |
| `apiLogger`    | API route handlers                           |
| `authLogger`   | Authentication (login, register, sessions)   |
| `socketLogger` | Socket.IO connections and events             |
| `dbLogger`     | Database queries (logs at `debug` level)     |
| `logger`       | General / fallback                           |

### How to log

```typescript
// Info
apiLogger.info({ userId }, 'Profile updated');

// Errors — always pass the error object as { err }
apiLogger.error({ err }, 'Failed to update profile');

// Debug (only visible when LOG_LEVEL=debug)
dbLogger.debug({ query, params }, 'query');
```

### Log levels

Set the `LOG_LEVEL` environment variable to control verbosity. Default is `info`.

| Level   | What you see                          |
| ------- | ------------------------------------- |
| `debug` | Everything, including Drizzle queries |
| `info`  | Connections, startup, key events      |
| `warn`  | Warnings                              |
| `error` | Errors only                           |

### Exceptions

- **Client-side code** (`.svelte` files, client stores) may use `console.*` since Pino is server-only.
- **Seed and test scripts** may use `console.*` for CLI output.
- **Standalone entry points** (`server.js`, `vite.config.ts`) create their own Pino instances because they cannot use `$lib` imports.
