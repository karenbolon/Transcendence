ENV_FILE = .env
COMPOSE := docker compose

help:
	@echo "Options:"
	@echo "  up        - Build and start containers (detached)"
	@echo "  down      - Stop and remove containers"
	@echo "  logs      - Tail (last 200) logs"
	@echo "  rebuild   - Rebuild without cache, then up"
	@echo "  ps        - Show compose services"
	@echo "  status    - Images, containers, networks, recent logs"
	@echo "  re        - down + clean + up"
	@echo "  clean     - down --volumes (CAREFUL: removes data volumes)"
	@echo "  prune     - System prune EVERYTHING (DANGEROUS)"
	@echo "  sh-front  - Shell into frontend container"
	@echo "  sh-back   - Shell into backend container"

all: up logs sh-front sh-back build-front

# For development
dev: dev-front up logs sh-front sh-back

#build frontend 
build-front:
	cd frontend && npm run build
	@echo "Frontend build mode is up and running ✅"

up:
	@$(COMPOSE) up -d --build
	@echo "🧱 Docker is up and running ✅"
	@xdg-open http://localhost:8081 || open http://localhost:8081 || echo "Open http://localhost:8081 in your browser"


dev-front:
	@$(COMPOSE) up frontend-dev
	@echo "Frontend development mode is up and running ✅"
	@xdg-open http://localhost:5173 || open http://localhost:5173 || echo "Open http://localhost:5173 in your browser"


down:
	@$(COMPOSE) down --remove-orphans

logs:
	@$(COMPOSE) logs -f --tail=200

rebuild:
	@$(COMPOSE) build --no-cache
	@$(COMPOSE) up -d

ps:
	@$(COMPOSE) ps

status:
	@docker images
	@docker ps -a
	@docker network ls
	@$(COMPOSE) logs

re:
	@$(MAKE) down
	@$(MAKE) clean 
	@$(MAKE) up

# Corrected flag for volumes
clean:
	@echo "🧹 Cleaning (removing containers + volumes)"
	@$(COMPOSE) down --volumes --remove-orphans

prune:
	@echo "✂️ Pruning ALL unused images/containers/networks/volumes"
	@docker system prune -af --volumes


# Remove containers, volumes, and all project images (force)
fclean:
	@echo "🧨 Full clean: removing containers, volumes, and all project images!"
	@$(COMPOSE) down --volumes --remove-orphans
	@docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep '^ft_transcendence-' | awk '{print $$2}' | xargs -r docker rmi -f

sh-front:
	@$(COMPOSE) exec ft_frontend sh

sh-back:
	@$(COMPOSE) exec ft_backend sh

.PHONY: help dev up down logs rebuild ps status re clean prune sh-front sh-back fclean build-front



