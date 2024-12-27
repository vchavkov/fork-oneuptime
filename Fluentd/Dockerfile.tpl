FROM fluentd

# Update APK repositories to use the specified proxy
# RUN sed -i 's|https://.*.alpinelinux.org|http://apt-proxy.assistance.bg:3142|' /etc/apk/repositories

# This container will only run in dev env, so this is ok.
USER root

# Install bash and curl.
RUN apk add bash curl
