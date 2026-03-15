#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for postgres..."
  for i in $(seq 1 30); do
    if node -e "
      import('postgres')
        .then(m => m.default(process.env.DATABASE_URL)\`SELECT 1\`)
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
    " 2>/dev/null; then
      echo "Postgres is ready."
      break
    fi
    if [ "$i" = "30" ]; then
      echo "ERROR: Postgres not ready after 30 seconds"
      exit 1
    fi
    echo "  attempt $i/30..."
    sleep 1
  done

  echo "Running database migrations..."
  npx drizzle-kit migrate

  echo "Seeding achievement definitions..."
  node --input-type=module -e "
    import postgres from 'postgres';
    import { readFileSync } from 'fs';
    const sql = postgres(process.env.DATABASE_URL);
    await sql.unsafe(readFileSync('/app/drizzle/seed-achievements.sql', 'utf-8'));
    await sql.end();
    console.log('Achievement definitions seeded.');
  "
fi

echo "Starting SvelteKit server with Socket.IO on port 3000..."
node server.js
