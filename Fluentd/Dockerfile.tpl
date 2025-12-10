FROM fluentd

# This container will only run in dev env, so this is ok.
USER root

# Install bash and curl.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends bash curl && \
    rm -rf /var/lib/apt/lists/*
