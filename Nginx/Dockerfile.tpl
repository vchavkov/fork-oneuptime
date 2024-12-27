FROM nginx:1.26.1-alpine

# Update APK repositories to use the specified proxy
RUN sed -i 's|https://.*.alpinelinux.org|http://apt-proxy.assistance.bg:3142|' /etc/apk/repositories

ARG GIT_SHA
ARG APP_VERSION

ENV GIT_SHA=${GIT_SHA}
ENV APP_VERSION=${APP_VERSION}

# IF APP_VERSION is not set, set it to 1.0.0
RUN if [ -z "$APP_VERSION" ]; then export APP_VERSION=1.0.0; fi

# Install bash.
RUN apk add bash && apk add curl && apk add openssl

# Install NJS module
RUN apk add nginx-module-njs

COPY ./Nginx/envsubst-on-templates.sh /etc/nginx/envsubst-on-templates.sh

RUN chmod +x /etc/nginx/envsubst-on-templates.sh

COPY ./Nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY ./Nginx/nginx.conf /etc/nginx/nginx.conf

# Now install nodejs

RUN apk add nodejs npm

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
COPY ./Nginx/package*.json /usr/src/app/
RUN npm install

COPY ./Nginx /usr/src/app
# Bundle app source
RUN npm run compile

RUN chmod +x ./run.sh

CMD ./run.sh
