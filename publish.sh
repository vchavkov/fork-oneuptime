#!/bin/bash

export $(grep -v '^#' config.env | xargs)

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

BUILD_DATE=$(date +%s)

IMAGE_TAGS=(
	"latest"
	"$APP_TAG"
	"release"
)

AWS_ACCOUNT=401376717990
AWS_REGION="us-east-1"
AWS_ECR_REGISTRY_COLLECTION_PREFIX="uptime"

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
