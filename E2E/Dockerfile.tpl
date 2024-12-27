FROM node:22

#
# CBS Uptime-E2E Dockerfile
# This file is used to build the E2E docker image which is used to run the E2E tests.
#

# Update APK repositories to use the specified proxy
RUN cat /etc/apk/repositories | sed -e s#https://.*.alpinelinux.org#http://apt.assistance.bg:3142# | tee /etc/apk/repositories

# Update APT repositories to use the specified proxy
RUN echo 'Acquire::http { Proxy "http://apt.assistance.bg:3142/"; };' > /etc/apt/apt.conf.d/02proxy

# Install npm packages
RUN mkdir /tmp/npm &&  chmod 2777 /tmp/npm && chown 1000:1000 /tmp/npm && npm config set cache /tmp/npm --global

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
RUN apt-get install bash -y && apt-get install curl -y

# Install python
RUN apt-get update && apt-get install -y .gyp python3 make g++

# Install playwright dependencies
RUN apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libgtk-3-0 libpango-1.0-0 libcairo2 libgdk-pixbuf2.0-0 libasound2 libatspi2.0-0

# Use bash shell by default
SHELL ["/bin/bash", "-c"]

WORKDIR /usr/src/Common
COPY ./Common/package*.json /usr/src/Common/
# Set version in ./Common/package.json to the APP_VERSION
RUN sed -i "s/\"version\": \".*\"/\"version\": \"$APP_VERSION\"/g" /usr/src/Common/package.json
RUN npm install
COPY ./Common /usr/src/Common

ENV PRODUCTION=true

# Do not show the html report in the browser when job fails.
ENV PW_TEST_HTML_REPORT_OPEN='never'

WORKDIR /usr/src/app

# Install app dependencies
COPY ./E2E/package*.json /usr/src/app/
RUN npm install

# Copy app source
COPY ./E2E /usr/src/app

RUN npm run compile

# Run the app
CMD [ "npm", "test" ]
