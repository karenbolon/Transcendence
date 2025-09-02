#!/bin/bash
echo "Setting up ft_transcendence dev environment..."

# Install Node packages and ensure TypeScript is present for CI/type checking
cd frontend && npm install && npm install --save-dev typescript && cd ..

# Create local env if missing
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Build and start Docker
docker compose up --build -d

echo "✅ Setup complete! Visit https://localhost"



# //////////////////////////////////////////////
# to setup environment, run in bash: 
# bash scripts/setup.sh