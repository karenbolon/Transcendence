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
fi

echo "Starting SvelteKit server on port 3000..."
node build
