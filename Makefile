COMPOSE_FILE = srcs/docker-compose.yml
INIT_SCRIPT = ./srcs/init.sh
ENV_FILE = .env
DB_PASSWORD := X5mnLigU3w8=
BACKUP_DIR = /home/ubuntu/data/backup

all: init restore up

init:
	@echo "Creating .env file"
	@/bin/bash $(INIT_SCRIPT)

#DOCKER COMPOSE
up:
	@docker compose -f $(COMPOSE_FILE) up -d --build

backup:
	@echo "Backing up WordPress database to $(BACKUP_DIR)/wordpress.sql"
	@mkdir -p $(BACKUP_DIR)
	@docker exec mariadb sh -c 'exec mysqldump -u root -p$(DB_PASSWORD) wordpress' > $(BACKUP_DIR)/wordpress.sql	
	@mkdir -p $(BACKUP_DIR)/wordpress_data
	@cp -r /home/ubuntu/data/wordpress_data/* $(BACKUP_DIR)/wordpress_data/

restore:
	@if [ -f $(BACKUP_DIR)/wordpress.sql ]; then \
		echo "Restoring WordPress database from backup"; \
		cp $(BACKUP_DIR)/wordpress.sql /home/ubuntu/data/wordpress.sql; \
	fi

	@if [ -d $(BACKUP_DIR)/wordpress_data ]; then \
		echo "Restoring WordPress data from backup"; \
		cp -r $(BACKUP_DIR)/wordpress_data/* /home/ubuntu/data/wordpress_data/; \
	fi

down:
	@$(MAKE) backup
	@docker compose -f $(COMPOSE_FILE) down

stop:
	@docker compose -f $(COMPOSE_FILE) stop

restart:
	@docker compose -f $(COMPOSE_FILE) stop
	@docker compose -f $(COMPOSE_FILE) up -d

ps:
	@docker compose -f $(COMPOSE_FILE) ps

status:
	@docker images
	@docker ps -a
	@docker network ls
	@docker compose -f $(COMPOSE_FILE) logs

re:
	@$(MAKE) down
	@$(MAKE) clean 
	@$(MAKE) up

clean:
	@echo "Cleaning"
	@docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans || echo "compose is not running"
#	@docker rmi $(docker images -q) --force
	@docker system prune -f

.PHONY: all up down stop restart ps re status clean
setup:
	cd frontend && npm install

build:
	cd frontend && npm run build

test:
	cd frontend && npm test

