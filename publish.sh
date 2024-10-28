#!/bin/bash

IMAGE_VERSION='0.0.1'

IMAGE_ARRAY=(
	"status-page"
	"dashboard"
	"admin-dashboard"
	"accounts"
	"haraka"
	"probe"
	"e2e"
	"copilot"
	"api-reference"
	"app"
	"workflow"
	"test-server"
	"home"
	"docs"
	"worker"
	"ingestor"
	"isolated-vm"
	"nginx"
	"otel-collector"
	"fluentd"
)

IMAGE_TAGS=(
	"latest"
	"release"
	"$IMAGE_VERSION"
)

AWS_ACCOUNT=401376717990
AWS_REGION="us-east-1"
AWS_ECR_REGISTRY_COLLECTION_PREFIX="uptime"

## 401376717990.dkr.ecr.us-east-1.amazonaws.com/cbs-its/automated-zone-config:latest
AWS_ECR_REGISTRY=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REGISTRY_COLLECTION_PREFIX}/${IMAGE_NAME}${AWS_ECR_REGISTRY_SUFFIX}

IMAGE_TAGS_STR=""
for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
	IMAGE_TAGS_STR+=" -t ${AWS_ECR_REGISTRY}:$IMAGE_TAG"
done

for IMAGE_NAME in ${IMAGE_ARRAY[@]}; do
	for IMAGE_TAG in ${IMAGE_TAGS[@]}; do
		CMD="docker tag \"${AWS_ECR_REGISTRY_COLLECTION_PREFIX}-${IMAGE_NAME}:latest\" \"${AWS_ECR_REGISTRY}${IMAGE_NAME}:${IMAGE_TAG}\""
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
