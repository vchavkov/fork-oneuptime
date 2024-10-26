#!/bin/bash

set -ex

IMAGE_VERSION='0.0.1'

# "copilot"

IMAGE_ARRAY=(
	"accounts"
	"admin-dashboard"
	"api-reference"
	"app"
	"dashboard"
	"docs"
	"e2e"
	"fluentd"
	"haraka"
	"home"
	"ingestor"
	"isolated-vm"
	"monitor"
	"nginx"
	"otel-collector"
	"probe"
	"status-page"
	"test-server"
	"worker"
	"workflow"
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
