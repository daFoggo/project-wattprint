# Run from this folder on the GPU server.   make validate && make train && make all-outputs
TEST_HOUSE ?= 101
VALID_HOUSE ?= 103
APPS ?= Kettle Microwave Dishwasher WashingMachine
EXTRA_APPS ?= Fridge TumbleDryer AC WaterHeater
RUN = docker compose run --rm pipeline

build:
	docker compose build

convert:             ## training-only datasets -> REFIT layout (raw files in NILMFormer/data/_raw/{plegma,precon})
	$(RUN) python -m pipeline.convert plegma
	$(RUN) python -m pipeline.convert precon

validate:            ## minutes-long smoke test of the whole chain (do this first)
	$(RUN) python -m pipeline.validate

train:               ## APPS (default: the 4 paper appliances) in parallel, paper protocol (50 epochs, early stopping)
	docker compose run --rm -e APPS="$(APPS)" pipeline sh pipeline/run_all.sh

train-extra:         ## appliances added on top of the paper (pipeline/appliances.yaml), same protocol
	docker compose run --rm -e APPS="$(EXTRA_APPS)" pipeline sh pipeline/run_all.sh

resume:              ## continue training 20 more epochs from the saved bundles (APPS=... to pick)
	docker compose run --rm -e APPS="$(APPS)" pipeline sh pipeline/run_all.sh --resume --epochs 20

predict:             ## raw predictions for the test and validation households
	$(RUN) python -m pipeline.predict --house $(TEST_HOUSE) --stride 64
	$(RUN) python -m pipeline.predict --house $(VALID_HOUSE) --stride 64

tune:                ## tune post-processing thresholds on the VALIDATION household
	$(RUN) python -m pipeline.postprocess tune --house $(VALID_HOUSE)

postprocess:         ## seconds, no retraining: edit pipeline/postprocess.yaml and re-run
	$(RUN) python -m pipeline.postprocess run --house $(TEST_HOUSE)

serve:               ## inference API on :${INFERENCE_PORT:-8002}
	docker compose up -d inference

all-outputs: predict tune postprocess

# one appliance on its OWN held-out houses (see pipeline/appliances.yaml), e.g. the dryer:
#   make eval-app APP=TumbleDryer APP_TEST=15 APP_VALID=13
eval-app:
	$(RUN) python -m pipeline.predict --house $(APP_VALID) --apps $(APP) --stride 64
	$(RUN) python -m pipeline.predict --house $(APP_TEST) --apps $(APP) --stride 64
	$(RUN) python -m pipeline.postprocess tune --house $(APP_VALID)
	$(RUN) python -m pipeline.postprocess run --house $(APP_TEST)

# ---- paper / report (paper/README.md) --------------------------------------------------------
PAPER_RUN = docker compose run --rm -v "$(CURDIR)/paper:/app/paper" -e GIT_COMMIT=$(shell git rev-parse --short HEAD) pipeline sh -c
OWNER = $(shell id -u):$(shell id -g)

paper-data:          ## every number of the paper -> paper/data/*.csv (GPU: re-runs the REFIT-only ablation)
	$(PAPER_RUN) 'python -m paper.scripts.export_results --ablation && chown -R $(OWNER) paper/data'

paper-figures:       ## paper/data -> paper/figures/*.pdf + paper/tables/*.tex (CPU, seconds)
	$(PAPER_RUN) 'MPLCONFIGDIR=/tmp python -m paper.scripts.make_figures && chown -R $(OWNER) paper/figures paper/tables'

paper: paper-figures ## LaTeX -> paper/build/main.pdf (host latexmk; or upload paper/ to Overleaf)
	cd paper && latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=build main.tex

demo-snapshot:       ## paper/data -> ../backend/app/demo/plegma_101.json (precomputed demo API data)
	python3 -m paper.scripts.export_demo ../backend/app/demo/plegma_101.json
