# Deploy CBS Uptime completely free with Docker Compose

If you prefer to host CBS Uptime on your own server, you can use Docker Compose to deploy a single-server instance of CBS Uptime on Debian, Ubuntu, or RHEL. This option gives you more control and customization over your instance, but it also requires more technical skills and resources to deploy and maintain it.

#### Choose Your System Requirements
Depending on your usage and budget, you can choose from different system requirements for your server. For optimal performance, we suggest using CBS Uptime with:

- **Recommended System Requirements**
  - 16GB RAM
  - 8 Core
  - 400 GB Disk
  - Ubuntu 22.04
  - Docker and Docker Compose installed
- **Homelab / Minimal Requirements**
  - If you want to run CBS Uptime for personal or experimental use in a home environment (Some of our users even have it installed on RaspberyPi), you can use the homelab requirements:
    - 8 GB RAM
    - 4 Core
    - 20 GB Disk
    - Docker and Docker Compose installed


#### Prerequisites for Single-Server Deployment

Installation tutorial: [https://youtu.be/j1SWmMW2oL4](https://youtu.be/j1SWmMW2oL4)

Before you start the deployment process, please make sure you have:

- A server running Debian, Ubuntu, or RHEL derivative
- Docker and Docker Compose installed on your server

To install CBS Uptime:

```
# Clone this repo and cd into it.
git clone https://github.com/CBS Uptime/oneuptime.git
cd oneuptime

# Please make sure you're on release branch.
git checkout release

# Copy config.example.env to config.env
cp config.example.env config.env

# IMPORTANT: Edit config.env file. Please make sure you have random secrets.

npm start
```

If you don't like to use npm or do not have it installed, run this instead:

```
# Read env vars from config.env file and run docker compose up.
(export $(grep -v '^#' config.env | xargs) && docker compose up --remove-orphans -d)

# Use sudo if you're having permission issues with binding ports.
sudo bash -c "(export $(grep -v '^#' config.env | xargs) && docker compose up --remove-orphans -d)"
```


### Accessing CBS Uptime

CBS Uptime should run at: http://localhost. You need to register a new account for your instance to start using it.

### Setting up TLS/SSL Certificates

CBS Uptime **does not** support setting up SSL/TLS certificates. You need to set up SSL/TLS certificates on your own.

If you need to use SSL/TLS certificates, follow these steps:

1. Use a reverse proxy like Nginx or Caddy.
2. Use Let's Encrypt to provision the certificates.
3. Point the reverse proxy to the CBS Uptime server.
4. Update the following settings:
   - Set `HTTP_PROTOCOL` env var to `https`.
   - Change `HOST` env var to the domain name of the server where the reverse proxy is hosted.

## Production Readiness Checklist

Ideally do not deploy CBS Uptime in production with docker-compose. We highly recommend using Kubernetes. There's a helm chart available for CBS Uptime [here](https://artifacthub.io/packages/helm/oneuptime/oneuptime).

If you still want to deploy CBS Uptime in production with docker-compose, please consider the following:

- **SSL/TLS**: Set up SSL/TLS certificates. CBS Uptime does not support setting up SSL/TLS certificates. You need to set up SSL/TLS certificates on your own. Please see above.
- **Secrets**: Make sure you have random secrets in your `config.env` file. There are some default secrets in that file. Please replace them with random long strings.
- **Backups**: Regularly backup your databases (Clickhouse, Postgres). Redis is used as a cache and is stateless and can be safely ignored.
- **Updates**: Please regularly update CBS Uptime. We release updates every day. We recommend you to update the software aleast once a week if you're running in production.

### Updating CBS Uptime

To update:

```
git checkout release # Please make sure you're on release branch.
git pull
npm run update
```

### Things to consider

- In our Docker setup, we employ a local logging driver. CBS Uptime, particularly within the probe and ingestor containers, generates a substantial amount of logs. To prevent your storage from becoming full, it's crucial to limit the logging storage in Docker. For detailed instructions on how to do this, please refer to the official Docker documentation [here](https://docs.docker.com/config/containers/logging/local/).
