#
# AdminDashboard Dockerfile
#

FROM node:22-alpine

# Update APK repositories to use the specified proxy
RUN sed -i 's|https://.*.alpinelinux.org|http://apt-proxy.assistance.bg:3142|' /etc/apk/repositories

# Install npm packages
# RUN mkdir /tmp/npm && chmod 2777 /tmp/npm && chown 1000:1000 /tmp/npm && npm config set cache /tmp/npm --global

# Set npm config
# RUN npm config set fetch-retries 5
# RUN npm config set fetch-retry-mintimeout 100000
# RUN npm config set fetch-retry-maxtimeout 600000

# Set environment variables
ARG GIT_SHA
ARG APP_VERSION
ENV GIT_SHA=${GIT_SHA}
ENV APP_VERSION=${APP_VERSION}

# IF APP_VERSION is not set, set it to 1.0.0
RUN if [ -z "$APP_VERSION" ]; then export APP_VERSION=1.0.0; fi

# Install bash.
RUN apk add bash && apk add curl

# Use bash shell by default
SHELL ["/bin/bash", "-c"]

# Create working directory
RUN mkdir /usr/src
WORKDIR /usr/src/Common

# Copy package.json
COPY ./Common/package*.json /usr/src/Common/

# Set version in ./Common/package.json to the APP_VERSION
RUN sed -i "s/\"version\": \".*\"/\"version\": \"$APP_VERSION\"/g" /usr/src/Common/package.json

# Install dependencies
RUN npm install

# Copy Common directory
COPY ./Common /usr/src/Common

# Set environment variables
ENV PRODUCTION=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Change working directory to app
WORKDIR /usr/src/app

# Install app dependencies
COPY ./AdminDashboard/package*.json /usr/src/app/

# Set version in ./App/package.json to the APP_VERSION
RUN sed -i "s/\"version\": \".*\"/\"version\": \"$APP_VERSION\"/g" /usr/src/app/package.json

# Install dependencies
RUN npm install

# Expose ports.
#   - 3158:  AdminDashboard
EXPOSE 3158

# Install webpack-cli
RUN npm i -D webpack-cli

# Run the app
{{ if eq .Env.ENVIRONMENT "development" }}
RUN mkdir /usr/src/app/dev-env
RUN touch /usr/src/app/dev-env/.env
RUN npm i -D webpack-dev-server
CMD [ "npm", "run", "dev" ]
{{ else }}
# Copy app source
COPY ./AdminDashboard /usr/src/app
# Bundle app source
RUN npm run build
# Run the app
CMD [ "npm", "start" ]
{{ end }}
