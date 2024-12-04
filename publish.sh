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
)

AWS_ACCOUNT=401376717990
AWS_REGION="us-east-1"
AWS_ECR_REGISTRY_COLLECTION_PREFIX="uptime"

## tag images
for IMAGE_NAME in ${IMAGE_ARRAY[@]}; do
	AWS_ECR_REGISTRY=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REGISTRY_COLLECTION_PREFIX}/${IMAGE_NAME}${AWS_ECR_REGISTRY_SUFFIX}
	for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
		if [ "$IMAGE_TAG" != "$APP_TAG" ]; then
			CMD="docker tag ${AWS_ECR_REGISTRY}:${APP_TAG} ${AWS_ECR_REGISTRY}:${IMAGE_TAG}"
			printf "\n$CMD\n"
			eval "$CMD"
		fi
	done
done

## push images
for IMAGE_NAME in ${IMAGE_ARRAY[@]}; do
	for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
		AWS_ECR_REGISTRY=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REGISTRY_COLLECTION_PREFIX}/${IMAGE_NAME}${AWS_ECR_REGISTRY_SUFFIX}
		CMD="docker push \"${AWS_ECR_REGISTRY}:${IMAGE_TAG}\""
		printf "\n$CMD\n"
		eval "$CMD"
	done
done
