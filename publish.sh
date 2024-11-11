#!/bin/bash

export $(grep -v '^#' config.env | xargs)

IMAGE_ARRAY=(
	"accounts"
	"admin-dashboard"
	"api-reference"
	"app"
	"copilot"
	"dashboard"
	"docs"
	"e2e"
	"fluentd"
	"haraka"
	"home"
	"ingestor"
	"isolated-vm"
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
)

AWS_ACCOUNT=401376717990
AWS_REGION="us-east-1"
AWS_ECR_REGISTRY_COLLECTION_PREFIX="uptime"

AWS_ECR_REGISTRY=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REGISTRY_COLLECTION_PREFIX}/${IMAGE_NAME}${AWS_ECR_REGISTRY_SUFFIX}

IMAGE_TAGS_STR=""
for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
	IMAGE_TAGS_STR+=" -t ${AWS_ECR_REGISTRY}:$IMAGE_TAG"
done

for IMAGE_NAME in ${IMAGE_ARRAY[@]}; do
	for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
		CMD="docker tag \"${AWS_ECR_REGISTRY_COLLECTION_PREFIX}-${IMAGE_NAME}:$APP_TAG\" \"${AWS_ECR_REGISTRY}${IMAGE_NAME}:${IMAGE_TAG}\""
		printf "\n$CMD\n"
		eval "$CMD"
	done
done

for IMAGE_NAME in ${IMAGE_ARRAY[@]}; do
	for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
		CMD="docker push \"${AWS_ECR_REGISTRY}${IMAGE_NAME}:${IMAGE_TAG}\""
		printf "\n$CMD\n"
		eval "$CMD"
	done
done
