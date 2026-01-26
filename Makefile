# ═══════════════════════════════════════════════════════════════════════════
#                                      Makefile
# ═══════════════════════════════════════════════════════════════════════════
#                                   Colors and emojis
# ═══════════════════════════════════════════════════════════════════════════

# Colors for pretty output
BOLD		= \033[1m
PINK		= \033[38;5;218m
LAVENDER	= \033[38;5;183m
PURPLE		= \033[38;5;141m
LIGHT_PINK	= \033[38;5;225m
PEACH		= \033[38;5;217m
MINT		= \033[38;5;158m
LILAC		= \033[38;5;189m
NC			= \033[0m # No Color

# Emojis for visual feedback
ROCKET = 🚀
CHECK = ✅
CROSS = ❌
PACKAGE = 📦
DATABASE = 🗄️
LOCK = 🔒
CLEAN = 🧹
TEST = 🧪
DOCKER = 🐳

# Docker compose file
COMPOSE_FILE = compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)

# ================================================================================
# SETUP & INSTALLATION
# ================================================================================

# Install all dependencies
install:
	@echo "📦 Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed!"

start: docker-up install dev
	@echo "🚀 Starting Setup and Installation..."

# Complete reset
re: clean install
	@echo "✅ Project reset complete!"

# ================================================================================
# DOCKER
# ================================================================================

# Start Docker containers
docker-up:
	@echo "🐳 Starting Docker containers..."
	@if [ -f compose.yml ]; then \
		$(COMPOSE) up -d; \
		echo "✅ Docker containers started!"; \
	else \
		echo "❌ $(COMPOSE) not found!"; \
		echo "💡 Run 'make docker-init' to create Docker setup"; \
	fi

# Stop Docker containers
docker-down:
	@echo "🐳 Stopping Docker containers..."
	@if [ -f $(COMPOSE_FILE) ]; then \
		$(COMPOSE) down; \
		echo "✅ Docker containers stopped!"; \
	else \
		echo "⚠️  $(COMPOSE_FILE) not found"; \
	fi

# View Docker logs
docker-logs:
	@echo "📋 Viewing Docker logs..."
	@if [ -f $(COMPOSE_FILE) ]; then \
		$(COMPOSE) logs -f; \
	else \
		echo "❌ $(COMPOSE_FILE) not found!"; \
	fi

# Clean Docker (stop and remove)
docker-clean:
	@echo "🧹 Cleaning Docker..."
	@if [ -f $(COMPOSE_FILE) ]; then \
		$(COMPOSE) down -v; \
		echo "✅ Docker cleaned!"; \
	else \
		echo "⚠️  $(COMPOSE_FILE) not found"; \
	fi

# Initialize Docker setup (we'll create this later)
docker-init:
	@echo "🐳 Docker setup not yet configured"
	@echo "💡 This will be added in the Docker setup milestone"

# ================================================================================
# DEVELOPMENT
# ================================================================================

# Start development server
dev:
	@echo "🚀 Starting development server..."
	npm run dev

# Start dev server on specific port
dev-port:
	@echo "🚀 Starting development server on port 3000..."
	npm run dev -- --port 3000

# Build for production
build:
	@echo "🏗️  Building for production..."
	npm run build
	@echo "✅ Build complete!"

# Preview production build
preview:
	@echo "👀 Starting preview server..."
	npm run preview


# ================================================================================
# Clean
# ================================================================================

# Clean build artifacts and node_modules
clean:
	@echo "🧹 Cleaning project..."
	rm -rf build/
	rm -rf .svelte-kit/
	rm -rf node_modules/
	@echo "✅ Clean complete!"
