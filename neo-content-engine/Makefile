.PHONY: help setup doctor mine mine-real run run-real now minio-up minio-bucket-private minio-bucket-public runtime-ls runtime-clean runtime-clean-keep-example

PYTHON ?= python3
VENV_DIR ?= .venv
VENV_PYTHON ?= $(VENV_DIR)/bin/python

ENV_FILE ?= .env
CONFIG_FILE ?= research_config.json
BRANDING_FILE ?= branding.json
RUNTIME_DIR ?= runtime
INPUT_CSV ?= $(RUNTIME_DIR)/inputs/pending_products.csv

LIMIT_PRODUCTS ?=
MAX_PRODUCTS ?=
MINE_ARGS ?=
RUN_ARGS ?=
ARGS ?=

MINIO_USER ?= minioadmin
MINIO_PASS ?= minioadmin123
MINIO_BUCKET ?= tiktok-assets

EXTRA_GOALS = $(filter-out $@,$(MAKECMDGOALS))
MINE_FLAGS = --env-file $(ENV_FILE) --config-file $(CONFIG_FILE) --output-csv $(INPUT_CSV) $(if $(LIMIT_PRODUCTS),--limit-products $(LIMIT_PRODUCTS),)
RUN_FLAGS = --env-file $(ENV_FILE) --branding-file $(BRANDING_FILE) --runtime-dir $(RUNTIME_DIR) --input-csv $(INPUT_CSV) $(if $(MAX_PRODUCTS),--max-products $(MAX_PRODUCTS),)

help:
	@echo "Content Engine routes"
	@echo "  make setup"
	@echo "  make doctor"
	@echo "  make mine-real"
	@echo "  make run-real"
	@echo "  make now"
	@echo "  make minio-up"
	@echo "  make minio-bucket-private"
	@echo "  make minio-bucket-public"
	@echo "  make runtime-ls"
	@echo "  make runtime-clean"
	@echo "  make runtime-clean-keep-example"
	@echo ""
	@echo "One-shot now:"
	@echo "  make now LIMIT_PRODUCTS=5 MAX_PRODUCTS=2"
	@echo ""
	@echo "Safe local render:"
	@echo "  make run-real RUN_ARGS='--skip-upload'"

setup:
	$(PYTHON) -m venv $(VENV_DIR)
	$(VENV_PYTHON) -m pip install -r requirements.txt

doctor:
	@echo "cwd=$$(pwd)"
	@echo "env_file=$(ENV_FILE)"
	@if [ -f "$(ENV_FILE)" ]; then echo ".env=ok"; else echo ".env=missing"; fi
	@for key in OPENAI_API_KEY TAVILY_API_KEY TIKTOK_ACCESS_TOKEN TIKTOK_SHOP_APP_KEY TIKTOK_SHOP_APP_SECRET TIKTOK_SHOP_CIPHER; do \
		if ! rg -q "^$$key=" "$(ENV_FILE)" 2>/dev/null; then \
			echo "$$key=missing"; \
			continue; \
		fi; \
		value=$$(sed -n "s/^$$key=//p" "$(ENV_FILE)" | head -n 1 | tr -d '[:space:]'); \
		if [ -z "$$value" ]; then \
			echo "$$key=empty"; \
		else \
			echo "$$key=set"; \
		fi; \
	done

mine:
	$(VENV_PYTHON) scripts/mine_tiktok_shop.py $(MINE_FLAGS) $(MINE_ARGS) $(ARGS) $(EXTRA_GOALS)

mine-real: mine

run:
	$(VENV_PYTHON) scripts/run_neo_tiktokshop.py $(RUN_FLAGS) $(RUN_ARGS) $(ARGS) $(EXTRA_GOALS)

run-real: run

now:
	$(MAKE) mine-real LIMIT_PRODUCTS=$(LIMIT_PRODUCTS) MINE_ARGS="$(MINE_ARGS)" ARGS="$(ARGS)"
	$(MAKE) run-real MAX_PRODUCTS=$(MAX_PRODUCTS) RUN_ARGS="$(RUN_ARGS)" ARGS="$(ARGS)"

minio-up:
	docker start minio >/dev/null 2>&1 || docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=$(MINIO_USER) -e MINIO_ROOT_PASSWORD=$(MINIO_PASS) -v minio-data:/data minio/minio server /data --console-address ":9001"

minio-bucket-private: minio-up
	docker run --rm --entrypoint /bin/sh minio/mc -c 'mc alias set local http://host.docker.internal:9000 $(MINIO_USER) $(MINIO_PASS) && mc mb --ignore-existing local/$(MINIO_BUCKET)'

minio-bucket-public: minio-up
	docker run --rm --entrypoint /bin/sh minio/mc -c 'mc alias set local http://host.docker.internal:9000 $(MINIO_USER) $(MINIO_PASS) && mc mb --ignore-existing local/$(MINIO_BUCKET) && mc anonymous set download local/$(MINIO_BUCKET)'

runtime-ls:
	@find runtime -type f | sort

runtime-clean:
	python3 scripts/clean_runtime.py --runtime-dir runtime

runtime-clean-keep-example:
	python3 scripts/clean_runtime.py --runtime-dir runtime --keep-example

%:
	@:
