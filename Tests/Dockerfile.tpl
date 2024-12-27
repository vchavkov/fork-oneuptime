#
# Tests Dockerfile
#
# Pull base image nodejs image.
FROM node:22-alpine

# Update APK repositories to use the specified proxy
RUN cat /etc/apk/repositories | sed -e s#https://.*.alpinelinux.org#http://apt.assistance.bg:3142# | tee /etc/apk/repositories

# Install npm packages
RUN mkdir /tmp/npm &&  chmod 2777 /tmp/npm && chown 1000:1000 /tmp/npm && npm config set cache /tmp/npm --global

# Set npm config
RUN npm config set fetch-retries 5
RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

# Install bash.
RUN apk add bash && apk add curl

ARG GIT_SHA
ARG APP_VERSION

ENV GIT_SHA=${GIT_SHA}
ENV APP_VERSION=${APP_VERSION}

# IF APP_VERSION is not set, set it to 1.0.0
RUN if [ -z "$APP_VERSION" ]; then export APP_VERSION=1.0.0; fi

RUN apk add bash

COPY ./Tests .

RUN chmod -R +x Scripts

CMD ["bash start.sh"]
