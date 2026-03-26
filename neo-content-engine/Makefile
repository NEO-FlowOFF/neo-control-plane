.PHONY: help setup mine run auto research-auto runtime-ls runtime-clean runtime-clean-keep-example

PYTHON ?= python3
VENV_DIR ?= .venv
VENV_PYTHON ?= $(VENV_DIR)/bin/python
ARGS ?=

help:
	@echo "Content Engine local"
	@echo "  make setup"
	@echo "  make mine"
	@echo "  make run -- --skip-upload --skip-openai"
	@echo "  make auto ARGS='--skip-openai'"
	@echo "  make research-auto"
	@echo "  make runtime-ls"
	@echo "  make runtime-clean"
	@echo "  make runtime-clean-keep-example"

MINIO_USER ?= minioadmin
MINIO_PASS ?= minioadmin123
MINIO_BUCKET ?= tiktok-assets

setup:
	$(PYTHON) -m venv $(VENV_DIR)
	$(VENV_PYTHON) -m pip install -r requirements.txt

mine:
	$(VENV_PYTHON) scripts/mine_tiktok_shop.py $(ARGS) $(filter-out $@,$(MAKECMDGOALS))

run:
	$(VENV_PYTHON) scripts/run_neo_tiktokshop.py $(ARGS) $(filter-out $@,$(MAKECMDGOALS))

auto:
	docker start minio >/dev/null 2>&1 || docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=$(MINIO_USER) -e MINIO_ROOT_PASSWORD=$(MINIO_PASS) -v minio-data:/data minio/minio server /data --console-address ":9001"
	docker run --rm --entrypoint /bin/sh minio/mc -c 'mc alias set local http://host.docker.internal:9000 $(MINIO_USER) $(MINIO_PASS) && mc mb --ignore-existing local/$(MINIO_BUCKET) && mc anonymous set download local/$(MINIO_BUCKET)'
	$(VENV_PYTHON) scripts/run_neo_tiktokshop.py $(ARGS)

research-auto:
	$(VENV_PYTHON) scripts/mine_tiktok_shop.py
	docker start minio >/dev/null 2>&1 || docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=$(MINIO_USER) -e MINIO_ROOT_PASSWORD=$(MINIO_PASS) -v minio-data:/data minio/minio server /data --console-address ":9001"
	docker run --rm --entrypoint /bin/sh minio/mc -c 'mc alias set local http://host.docker.internal:9000 $(MINIO_USER) $(MINIO_PASS) && mc mb --ignore-existing local/$(MINIO_BUCKET) && mc anonymous set download local/$(MINIO_BUCKET)'
	$(VENV_PYTHON) scripts/run_neo_tiktokshop.py $(ARGS)

runtime-ls:
	@find runtime -type f | sort

runtime-clean:
	python3 scripts/clean_runtime.py --runtime-dir runtime

runtime-clean-keep-example:
	python3 scripts/clean_runtime.py --runtime-dir runtime --keep-example

%:
	@:
