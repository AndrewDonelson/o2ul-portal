# Backend Template Makefile

RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
CYAN := \033[0;36m
NC := \033[0m

TEST_LOG_DIR ?= tmp
TEST_LOG_FILE ?= $(TEST_LOG_DIR)/test.log
FRONTEND_DIR ?= web

.PHONY: help tidy test test-sentinel run-api run-web run-orchestrator dev-orchestrator free-dev-ports dev-orchestrator-clean migrate-up migrate-down build frontend-install frontend-build frontend-watch lighthouse lighthouse-new-headless setup-web-tls generate-deploy-known-hosts sync-deploy-secrets setup-nginx-once verify-nginx-setup

help:
	@echo "$(CYAN)com.nlaak.backend-template$(NC)"
	@echo ""
	@echo "$(YELLOW)Targets$(NC)"
	@echo "  $(GREEN)make tidy$(NC)            - go mod tidy"
	@echo "  $(GREEN)make test$(NC)            - go test ./..."
	@echo "  $(GREEN)make test-sentinel$(NC)   - one-pass test log with sentinel"
	@echo "  $(GREEN)make run-api$(NC)         - run API service (:8080 default)"
	@echo "  $(GREEN)make run-web$(NC)         - run WEB service (:8081 default)"
	@echo "  $(GREEN)make run-orchestrator$(NC)- run orchestrator service (:8090 default)"
	@echo "  $(GREEN)make dev-orchestrator$(NC)- build all binaries and run orchestrator"
	@echo "  $(GREEN)make free-dev-ports$(NC) - stop listeners on 8080/9000/9100"
	@echo "  $(GREEN)make dev-orchestrator-clean$(NC)- free dev ports, then run orchestrator stack"
	@echo "  $(GREEN)make frontend-build$(NC)  - compile frontend TypeScript to web/dist"
	@echo "  $(GREEN)make frontend-watch$(NC)  - watch/compile frontend TypeScript"
	@echo "  $(GREEN)make lighthouse$(NC)      - stable Lighthouse run (writes tmp/lighthouse-stable.json)"
	@echo "  $(GREEN)make lighthouse-new-headless$(NC) - Lighthouse run with --headless=new (can be flaky)"
	@echo "  $(GREEN)make setup-web-tls$(NC)   - generate local TLS cert/key and update WEB TLS env vars"
	@echo "  $(GREEN)make generate-deploy-known-hosts$(NC)- fetch VPS host key and set DEPLOY_SSH_KNOWN_HOSTS in .env"
	@echo "  $(GREEN)make sync-deploy-secrets$(NC)- publish DEPLOY_* + known hosts from .env to GitHub Actions secrets"
	@echo "  $(GREEN)make setup-nginx-once$(NC) - configure nginx reverse-proxy once from .env values"
	@echo "  $(GREEN)make verify-nginx-setup$(NC)- print nginx routing and current project port ownership"
	@echo "  $(GREEN)make migrate-up$(NC)      - apply versioned migrations"
	@echo "  $(GREEN)make migrate-down$(NC)    - unsupported in strata-only mode (returns error)"
	@echo "  $(GREEN)make build$(NC)           - build all binaries into bin/"

tidy:
	@go mod tidy

test:
	@go test ./...

test-sentinel:
	@mkdir -p "$(TEST_LOG_DIR)"
	@( go test ./... 2>&1; code=$$?; printf "\n---END OF TESTING--- exit_code=%s\n" "$$code"; exit "$$code" ) | tee "$(TEST_LOG_FILE)"

run-api:
	@go run ./cmd/api

run-web:
	@go run ./cmd/web

run-orchestrator:
	@go run ./cmd/orchestrator

dev-orchestrator: frontend-install
	@$(MAKE) free-dev-ports
	@cd $(FRONTEND_DIR) && npm run build
	@$(MAKE) build
	@JWT_SECRET=$${JWT_SECRET:-local-dev-jwt-secret} MANAGED_API_COMMAND=./bin/api MANAGED_API_ARGS='--' MANAGED_WEB_COMMAND=./bin/web MANAGED_WEB_ARGS='--' ./bin/orchestrator

free-dev-ports:
	@for p in 8080 9000 9100; do \
		pids=$$(ss -ltnp | awk -v port=":$$p" '$$4 ~ port {print $$NF}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u); \
		if [ -n "$$pids" ]; then \
			echo "$(YELLOW)stopping port $$p pids: $$pids$(NC)"; \
			kill -TERM $$pids || true; \
		fi; \
	done

dev-orchestrator-clean: free-dev-ports dev-orchestrator

migrate-up:
	@go run ./cmd/migrate

migrate-down:
	@go run ./cmd/migrate down

build:
	@mkdir -p bin
	@go build -o bin/api ./cmd/api
	@go build -o bin/web ./cmd/web
	@go build -o bin/orchestrator ./cmd/orchestrator
	@go build -o bin/migrate ./cmd/migrate
	@echo "$(GREEN)✅ Binaries built in ./bin$(NC)"

frontend-install:
	@cd $(FRONTEND_DIR) && npm install

frontend-build:
	@cd $(FRONTEND_DIR) && npm run build

frontend-watch: frontend-install
	@cd $(FRONTEND_DIR) && npm run watch

lighthouse:
	@mkdir -p tmp
	@timeout 240s npx --yes lighthouse http://localhost:8080/ --output=json --output-path=tmp/lighthouse-stable.json --chrome-flags='--headless=chrome --no-sandbox --disable-gpu --disable-dev-shm-usage'

lighthouse-new-headless:
	@mkdir -p tmp
	@timeout 240s npx --yes lighthouse http://localhost:8080/ --output=json --output-path=tmp/lighthouse-new-headless.json --chrome-flags='--headless=new --no-sandbox'

setup-web-tls:
	@bash ./scripts/setup_web_tls.sh

generate-deploy-known-hosts:
	@bash ./scripts/generate_deploy_known_hosts.sh

sync-deploy-secrets:
	@command -v gh >/dev/null 2>&1 || (echo "$(RED)gh CLI is required$(NC)" && exit 1)
	@gh auth status -h github.com >/dev/null 2>&1 || (echo "$(RED)gh auth is required: run 'gh auth login'$(NC)" && exit 1)
	@set -a; source .env; set +a; \
		[[ -n "$$DEPLOY_HOST" ]] || (echo "$(RED)DEPLOY_HOST is empty in .env$(NC)" && exit 1); \
		[[ -n "$$ANDROMEDA_HOST" ]] || (echo "$(RED)ANDROMEDA_HOST is empty in .env$(NC)" && exit 1); \
		[[ -n "$$DEPLOY_USER" ]] || (echo "$(RED)DEPLOY_USER is empty in .env$(NC)" && exit 1); \
		[[ -n "$$DEPLOY_SSH_KEY" ]] || (echo "$(RED)DEPLOY_SSH_KEY is empty in .env$(NC)" && exit 1); \
		[[ -n "$$DEPLOY_SSH_KNOWN_HOSTS" ]] || (echo "$(RED)DEPLOY_SSH_KNOWN_HOSTS is empty in .env$(NC)" && exit 1); \
		gh secret set DEPLOY_HOST --body "$$DEPLOY_HOST"; \
		gh secret set ANDROMEDA_HOST --body "$$ANDROMEDA_HOST"; \
		gh secret set DEPLOY_USER --body "$$DEPLOY_USER"; \
		gh secret set DEPLOY_SSH_KEY --body "$$DEPLOY_SSH_KEY"; \
		gh secret set DEPLOY_SSH_KNOWN_HOSTS --body "$$DEPLOY_SSH_KNOWN_HOSTS"; \
		echo "$(GREEN)✅ Synced DEPLOY/ANDROMEDA SSH secrets to GitHub Actions$(NC)"

setup-nginx-once:
	@bash ./scripts/setup_nginx_once.sh

verify-nginx-setup:
	@bash ./scripts/verify_nginx_setup.sh
