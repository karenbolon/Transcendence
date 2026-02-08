# ═══════════════════════════════════════════════════════════════════════════
#                                      Makefile
# ═══════════════════════════════════════════════════════════════════════════
#                                   Colors and emojis
# ═══════════════════════════════════════════════════════════════════════════

# Colors for pretty output
BOLD		= \033[1m
PINK		= \033[1;38;5;218m
LAVENDER	= \033[1;38;5;183m
PURPLE		= \033[1;38;5;141m
LIGHT_PINK	= \033[1;38;5;225m
PEACH		= \033[1;38;5;217m
MINT		= \033[1;38;5;158m
LILAC		= \033[1;38;5;189m
NC			= \033[0m # No Color

# Emojis for visual feedback
ROCKET		= 🚀
CHECK		= ✅
CROSS		= ❌
PACKAGE		= 📦
DATABASE	= 🗄️
LOCK		= 🔒
CLEAN		= 🧹
TEST		= 🧪
DOCKER		= 🐳
WAIT		= ⏳
WARN		= ⚠️
SPARKLE		= ✨

# Docker compose file
COMPOSE_FILE = compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)

# DB container
DB_CONTAINER		= ft_db
DB_TEST_CONTAINER	= test_db

# ================================================================================
# SETUP & INSTALLATION
# ================================================================================

# Install all dependencies
install:
	@echo "$(PACKAGE) $(PINK)Installing dependencies...$(NC)"
	@npm install
	@echo "$(CHECK) $(MINT)Dependencies installed!$(NC)"

up:
	@echo "$(ROCKET) $(LAVENDER)Starting Setup and development environment...$(NC)"


start: up docker-up install db-push dev

# Complete reset
re: fclean start

# ================================================================================
# DOCKER
# ================================================================================

# Start Docker containers
docker-up:
	@echo "$(DOCKER) $(LAVENDER)Starting Docker containers...$(NC)"
	@if [ -f compose.yml ]; then \
		$(COMPOSE) up -d; \
		echo "$(CHECK) $(MINT)Docker containers started!$(NC)"; \
	else \
		echo "$(CROSS) $(PEACH)$(COMPOSE) not found!$(NC)"; \
		echo "💡 $(LIGHT_PINK)Run 'make docker-init' to create Docker setup$(NC)"; \
	fi

# Stop Docker containers
docker-down:
	@echo "$(DOCKER) $(LAVENDER)Stopping Docker containers...$(NC)"
	@if [ -f $(COMPOSE_FILE) ]; then \
		$(COMPOSE) down; \
		echo "$(CHECK) $(MINT)Docker containers stopped!$(NC)"; \
	else \
		echo "⚠️ $(PEACH) $(COMPOSE_FILE) not found$(NC)"; \
	fi

# View Docker logs
docker-logs:
	@echo "📋 $(LAVENDER)Viewing Docker logs...$(NC)"
	@if [ -f $(COMPOSE_FILE) ]; then \
		$(COMPOSE) logs -f; \
	else \
		echo "$(CROSS) $(PEACH)$(COMPOSE_FILE) not found!$(NC)"; \
	fi

# Clean Docker (stop and remove)
docker-clean:
	@echo "$(CLEAN) $(LAVENDER)Cleaning Docker...$(NC)"
	@if [ -f $(COMPOSE_FILE) ]; then \
		$(COMPOSE) down -v; \
		echo "$(CHECK) $(MINT)Docker cleaned!$(NC)"; \
	else \
		echo "⚠️  $(PEACH)$(COMPOSE_FILE) not found$(NC)"; \
	fi

# Initialize Docker setup (we'll create this later)
docker-init:
	@echo "$(DOCKER) $(PEACH)Docker setup not yet configured$(NC)"
	@echo "💡 $(LIGHT_PINK)This will be added in the Docker setup milestone$(NC)"

# ═══════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════

## Wait for the main database to accept connections
db-ready:
	@echo "$(WAIT) $(PURPLE)Waiting for database to be ready...$(NC)"
	@until docker exec $(DB_CONTAINER) pg_isready -U $(DB_USER) > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "$(CHECK) $(MINT)Database ready!$(NC)"

## Wait for the test database to accept connections
db-test-ready:
	@echo "$(WAIT) $(PURPLE)Waiting for test database to be ready...$(NC)"
	@until docker exec $(DB_TEST_CONTAINER) pg_isready -U $(DB_USER) > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "$(CHECK) $(MINT)Test database ready!$(NC)"

## Push schema to the main database
db-push:
	@echo "$(DATABASE) $(PURPLE)Pushing schema to database...$(NC)"
	@npm run db:push
	@echo "$(CHECK) $(MINT)Schema pushed!$(NC)"

## Push schema to the test database
db-push-test:
	@echo "$(DATABASE) $(PURPLE)Pushing schema to test database...$(NC)"
	@npm run db:push:test
	@echo "$(CHECK) $(MINT)Test schema pushed!$(NC)"

## Open Drizzle Studio (DB browser)
db-studio:
	@echo "$(DATABASE) $(PURPLE)Opening Drizzle Studio...$(NC)"
	@npm run db:studio

## Open Drizzle Studio for test DB
db-studio-test:
	@echo "$(DATABASE) $(PURPLE)Opening Drizzle Studio (test)...$(NC)"
	@npm run db:studio:test

## Reset the main database (drop + push)
db-reset:
	@echo "$(DATABASE) $(PURPLE)Resetting database...$(NC)"
	@npm run db:reset
	@echo "$(CHECK) $(MINT)Database reset!$(NC)"

# ================================================================================
# DEVELOPMENT
# ================================================================================
## Start development server
dev:
	@echo "$(ROCKET) $(PINK)Starting development server...$(NC)"
	@npm run dev

## Start dev server on specific port
dev-port:
	@echo "$(ROCKET) $(PINK)Starting development server on port 3000...$(NC)"
	@npm run dev -- --port 3000

## Build for production
build:
	@echo "🏗️ $(PINK)Building for production...$(NC)"
	@npm run build
	@echo "$(CHECK) $(MINT)Build complete!$(NC)"

## Preview production build
preview:
	@echo "👀 $(PINK)Starting preview server...$(NC)"
	@npm run preview

# ================================================================================
# TESTING
# ================================================================================

## Run full test suite: setup environment → run tests
test: test-setup test-run

## Setup test environment (start DB + push schema)
test-setup: docker-up db-test-ready db-push-test
	@echo "$(CHECK) $(MINT)Test environment ready!$(NC)"

## Run tests only (assumes DB is already running with schema)
test-run:
	@echo "$(TEST) $(LILAC)Running tests...$(NC)"
	@npx vitest
	@echo "$(CHECK) $(MINT)Tests complete!$(NC)"

# ================================================================================
# Clean
# ================================================================================

# Clean build artifacts and node_modules
clean:
	@echo "$(CLEAN) $(PEACH)Cleaning project...$(NC)"
	rm -rf build/
	rm -rf .svelte-kit/
	rm -rf node_modules/
	@echo "$(CHECK) $(MINT)Clean complete!$(NC)"

## Full clean: build artifacts + node_modules + Docker volumes
fclean: docker-clean
	@echo "$(CLEAN) $(PEACH)Deep cleaning everything...$(NC)"
	@rm -rf build/
	@rm -rf .svelte-kit/
	@rm -rf node_modules/
	@echo "$(CHECK) $(MINT)Full clean complete!$(NC)"
