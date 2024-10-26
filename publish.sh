#!/bin/bash

set -ex

IMAGE_VERSION='0.0.1'

IMAGE_ARRAY=(
	"uptime-status-page"
	"uptime-dashboard"
	"uptime-admin-dashboard"
	"uptime-accounts"
	"uptime/haraka"
	"uptime-probe-2"
	"uptime-probe-1"
	"uptime-e2e"
	"uptime-copilot"
	"uptime-api-reference"
	"uptime-app"
	"uptime-workflow"
	"uptime-test-server"
	"uptime-home"
	"uptime-docs"
	"uptime-worker"
	"uptime-ingestor"
	"uptime-isolated-vm"
	"uptime-ingress"
	"uptime-otel-collector"
	"uptime-fluentd"
)

IMAGE_TAGS=(
	"latest"
	"$IMAGE_VERSION"
)

AWS_ACCOUNT=401376717990
AWS_REGION="us-east-1"
AWS_ECR_REGISTRY_COLLECTION_PREFIX="uptime"

## 401376717990.dkr.ecr.us-east-1.amazonaws.com/cbs-its/automated-zone-config:latest
AWS_ECR_REGISTRY=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REGISTRY_COLLECTION_PREFIX}/${IMAGE_NAME}${AWS_ECR_REGISTRY_SUFFIX}

IMAGE_TAGS_STR="";
for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
  IMAGE_TAGS_STR+=" -t ${AWS_ECR_REGISTRY}:$IMAGE_TAG";
done;

for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
	CMD="${DOCKER_CMD} push ${AWS_ECR_REGISTRY}:$IMAGE_TAG"
	printf "\n$CMD\n\n"
	eval "$CMD"
done;
