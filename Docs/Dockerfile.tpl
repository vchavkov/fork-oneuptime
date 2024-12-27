#
# CBS Uptime-App Dockerfile
#

FROM node:22-alpine
RUN mkdir /tmp/npm &&  chmod 2777 /tmp/npm && chown 1000:1000 /tmp/npm && npm config set cache /tmp/npm --global

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
COPY ./Docs/package*.json /usr/src/app/
RUN npm install

# Bundle app source
COPY ./Docs /usr/src/app

# Set version in package.json to the APP_VERSION
RUN sed -i "s/\"version\": \".*\"/\"version\": \"$APP_VERSION\"/g" /usr/src/app/package.json

# Expose ports.
#   - 3600: CBS Uptime-docs
EXPOSE 3600

# Start the app
CMD ["npm", "start"]
