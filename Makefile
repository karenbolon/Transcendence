ENV_FILE = .env
COMPOSE := docker compose

all: up logs sh-front sh-back

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

up:
	@$(COMPOSE) up -d --build
	@echo "🧱 Docker is up and running ✅"

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

clean:
	@echo "🧹 Cleaning (removing containers + volumes)"
	@$(COMPOSE) down -volumes --remove-orphans
#	@docker rmi $(docker images -q) --force

prune:
	@echo "✂️ Pruning ALL unused images/containers/networks/volumes"
	@docker system prune -af --volumes

sh-front:
	@$(COMPOSE) exec ft_frontend sh

sh-back:
	@$(COMPOSE) exec ft_backend sh

.PHONY: help up down logs rebuild ps status re clean prune sh-front sh-back



