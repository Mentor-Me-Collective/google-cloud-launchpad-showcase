.PHONY: install run test scan demo hooks docker
install:      ## create venv and install deps
	python3 -m venv .venv && . .venv/bin/activate && pip install -r backend/requirements-dev.txt
run:          ## start API + console at http://localhost:8080
	cd backend && uvicorn app.main:app --reload --port 8080
test:
	cd backend && python3 -m pytest -q
scan:         ## secret scan (run before EVERY push)
	python3 scripts/scan_secrets.py
demo:         ## rehearse the full approval flow against the running server
	python3 scripts/demo_flow.py
hooks:        ## block commits that contain secrets
	printf '#!/bin/sh\npython3 scripts/scan_secrets.py --staged\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
docker:
	docker build -t climateops-api . && docker run --rm -p 8080:8080 -e DEMO_MODE=true climateops-api
