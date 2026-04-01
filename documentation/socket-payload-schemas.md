# Socket Payload Schemas

## Game (`server.game-handlers.js`)
- `game:invite`
  - `{ friendId: number, settings?: { speedPreset?: 'chill'|'normal'|'fast', winScore?: number, powerUps?: boolean } }`
- `game:invite-accept`
  - `{ inviteId: string }`
- `game:invite-decline`
  - `{ inviteId: string }`
- `game:join-room`
  - `{ roomId: string }`
- `game:paddle-move`
  - `{ direction: 'up' | 'down' | 'stop' }`
- `game:queue-join`
  - `{ mode: 'quick' | 'wild' | 'custom', settings?: { speedPreset?: 'chill'|'normal'|'fast', winScore?: number, powerUps?: boolean } }`

## Chat (`server.chat.js`)
- `chat:send`
  - `{ recipientId: number, content: string, gameId?: number | null }`
- `chat:read`
  - `{ friendId: number }`
- `chat:typing`
  - `{ recipientId: number }`
- `chat:stop-typing`
  - `{ recipientId: number }`

## Tournament (`server.tournament-handlers.js`)
- `tournament:create`
  - `{ name: string, maxPlayers: number, settings?: { speedPreset: 'chill'|'normal'|'fast', winScore: number } }`
- `tournament:join`
  - `{ tournamentId: number }`
- `tournament:leave`
  - `{ tournamentId: number }`
- `tournament:cancel`
  - `{ tournamentId: number }`
- `tournament:start`
  - `{ tournamentId: number }`
- `tournament:status`
  - `{ tournamentId: number }`

## Validation Behavior
- All schemas use `zod` `safeParse(...)`.
- Invalid payloads are rejected early with event-scoped error emits:
  - `game:error`
  - `chat:error`
  - `tournament:error`
- Handlers return immediately on invalid payloads and do not execute DB/game logic.
