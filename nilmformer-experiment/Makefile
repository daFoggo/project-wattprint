# Run from this folder on the GPU server.   make validate && make train && make all-outputs
TEST_HOUSE ?= 2
VALID_HOUSE ?= 9
RUN = docker compose run --rm pipeline

build:
	docker compose build

validate:            ## minutes-long smoke test of the whole chain (do this first)
	$(RUN) python -m pipeline.validate

train:               ## 4 appliance models in parallel, paper protocol (50 epochs, early stopping)
	$(RUN) sh pipeline/run_all.sh

resume:              ## continue training 20 more epochs from the saved bundles
	$(RUN) sh pipeline/run_all.sh --resume --epochs 20

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
