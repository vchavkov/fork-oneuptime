#
# StatusPage Dockerfile
#

# Pull base image nodejs image.
FROM 401376717990.dkr.ecr.us-east-1.amazonaws.com/docker-hub/library/node:22-alpine
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

# Use bash shell by default
SHELL ["/bin/bash", "-c"]

RUN npm install http-server -g

RUN mkdir /usr/src

WORKDIR /usr/src/Common
COPY ./Common/package*.json /usr/src/Common/
# Set version in ./Common/package.json to the APP_VERSION
RUN sed -i "s/\"version\": \".*\"/\"version\": \"$APP_VERSION\"/g" /usr/src/Common/package.json
RUN npm install
COPY ./Common /usr/src/Common














ENV PRODUCTION=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /usr/src/app

# Install app dependencies
COPY ./StatusPage/package*.json /usr/src/app/
RUN npm install

# Expose ports.
#   - 3105:  StatusPage
EXPOSE 3105
# API
EXPOSE 3106

RUN npm i -D webpack-cli

{{ if eq .Env.ENVIRONMENT "development" }}
RUN mkdir /usr/src/app/dev-env
RUN touch /usr/src/app/dev-env/.env
RUN npm i -D webpack-dev-server
# Run the app
CMD [ "npm", "run", "dev" ]
{{ else }}
# Copy app source
COPY ./StatusPage /usr/src/app
# Bundle app source
RUN npm run build
# Run the app
CMD [ "npm", "start" ]
{{ end }}
