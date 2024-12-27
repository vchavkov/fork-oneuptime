#
# CBS Uptime-App Dockerfile
#

# Pull base image nodejs image.
FROM node:22-alpine

# Update APK repositories to use the specified proxy
RUN cat /etc/apk/repositories | sed -e s#https://.*.alpinelinux.org#http://apt.assistance.bg:3142# | tee /etc/apk/repositories

# Install npm packages
RUN mkdir /tmp/npm && chmod 2777 /tmp/npm && chown 1000:1000 /tmp/npm && npm config set cache /tmp/npm --global

# Set npm config
RUN npm config set fetch-retries 5
RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

ARG GIT_SHA
ARG APP_VERSION

ENV GIT_SHA=${GIT_SHA}
ENV APP_VERSION=${APP_VERSION}

# IF APP_VERSION is not set, set it to 1.0.0
RUN if [ -z "$APP_VERSION" ]; then export APP_VERSION=1.0.0; fi

# Install bash.
RUN apk add bash && apk add curl

# Install python
RUN apk update && apk add --no-cache --virtual .gyp python3 make g++

# Use bash shell by default
SHELL ["/bin/bash", "-c"]

RUN mkdir /usr/src

WORKDIR /usr/src/Common
COPY ./Common/package*.json /usr/src/Common/
# Set version in ./Common/package.json to the APP_VERSION
RUN sed -i "s/\"version\": \".*\"/\"version\": \"$APP_VERSION\"/g" /usr/src/Common/package.json
RUN npm install
COPY ./Common /usr/src/Common

ENV PRODUCTION=true

WORKDIR /usr/src/app

# Install app dependencies
COPY ./Workflow/package*.json /usr/src/app/
# Set version in ./App/package.json to the APP_VERSION
RUN sed -i "s/\"version\": \".*\"/\"version\": \"$APP_VERSION\"/g" /usr/src/app/package.json
RUN npm install

# Expose ports.
#   - 3099: CBS Uptime-workflow
EXPOSE 3099

{{ if eq .Env.ENVIRONMENT "development" }}
  # Run the app
  CMD [ "npm", "run", "dev" ]
{{ else }}
  # Copy app source
  COPY ./Workflow /usr/src/app
  # Bundle app source
  RUN npm run compile
  # Run the app
  CMD [ "npm", "start" ]
{{ end }}
