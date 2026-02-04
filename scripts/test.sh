#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# 🧪 Test Setup Script
# ═══════════════════════════════════════════════════════════════════════════
# This script automates the test setup process:
#   1. Starts the test database containers
#   2. Pushes the schema to the test database
#   3. Runs the test suite
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Starting test database...${NC}"
npm run db:start:d

echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 3

echo -e "${BLUE}🗄️  Pushing schema to test database...${NC}"
npm run db:push:test

echo -e "${GREEN}✅ Test environment ready!${NC}"
echo -e "${BLUE}🧪 Running tests...${NC}"
npx vitest

echo -e "${GREEN}✅ Test process complete!${NC}"
