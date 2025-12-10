# Monitor API Documentation

## Overview

The Service Monitor API provides endpoints for retrieving service health information, availability status, and historical logs from a monitoring system integrated with Check MK and Grafana.

The API is accessible via Swagger UI at `/api` and supports caching through both in-memory (NodeCache) and Redis storage.

---

## Setup Instructions

### 1. Assume AWS Retaildev Account Role

First, assume the appropriate AWS role for your environment.

### 2. Obtain SSH Key

```bash
credstash -r eu-central-1 get ssh_aws_key > ~/.ssh/aws_key.pem
```

### 3. Open SSH Tunnel

```bash
ssh -i ~/.ssh/aws_key.pem -L localhost:3000:localhost:3000 ubuntu@uptime.cbsretail.net
```

### 4. Access Swagger API Documentation

Open your browser and navigate to:

```
http://localhost:3000/
```

---

## API Endpoints

### 1. Service Information Endpoints

#### Get Service Information

**Endpoint:** `GET /service-info/{service}`

**Description:** Retrieve information about a specific service (status, output, downtime status, and hosts).

**Service Keys by Environment:**

| Environment | Available Services |
|-------------|-------------------|
| **Prod** | `retailna`, `its`, `vrremote`, `residential`, `remote` |
| **Alarm** | `ap`, `aus`, `eu`, `hk`, `india`, `latam`, `na`, `th` |

**Parameters:**
- `service` (path parameter, required): Service key to fetch information for

**Example Request:**

```bash
curl -X 'GET' \
  'http://localhost:3000/service-info/retailna' \
  -H 'accept: application/json'
```

**Example Response:**

```json
{
  "service": "retailna",
  "state": "OK",
  "output": "Service is operational",
  "in_downtime": false,
  "hosts": ["host1", "host2"],
  "failureCause": "",
  "environment": "prod",
  "cached": true,
  "source": "nodeCache"
}
```

**Response Status Codes:**
- `200`: Service information retrieved successfully
- `404`: Service not found
- `500`: Internal server error

---

#### Get Service Information Logs

**Endpoint:** `GET /service-info-logs/{environment}`

**Description:** Retrieve historical service data logs for a specific environment. Logs are stored in Redis with a configurable retention period (default: 10,000 entries per key).

**Parameters:**
- `environment` (path parameter, required): Environment to fetch logs for (`prod` or `alarm`)
- `limit` (query parameter, optional): Number of logs to return (default: 10, max: 100)
- `datetime` (query parameter, optional): Filter logs by datetime. Supports ISO 8601 format and simple date formats (e.g., `2024-11-22` or `2024-11-22T15:30:00`). Returns logs up to and including this datetime.

**Example Request:**

```bash
curl -X 'GET' \
  'http://localhost:3000/service-info-logs/prod?limit=10&datetime=2024-11-22T15:30:00' \
  -H 'accept: application/json'
```

**Example Response:**

```json
{
  "environment": "prod",
  "count": 10,
  "total": 150,
  "end_datetime": "2024-11-22T15:30:00.000Z",
  "end_score": 1732298400,
  "logs": [
    {
      "score": 1732298400,
      "datetime": "2024-11-22T15:30:00.000Z",
      "cacheKey": "monitor_prod",
      "data": {
        "Services retailna": {
          "state": "OK",
          "output": "Service is operational",
          "in_downtime": false,
          "hosts": ["host1", "host2"]
        }
      }
    }
  ]
}
```

**Response Status Codes:**
- `200`: Logs retrieved successfully
- `400`: Invalid environment, limit, or datetime specified
- `500`: Internal server error

---

### 2. Availability Endpoints

#### Get Availability Status

**Endpoint:** `GET /availability`

**Description:** Retrieve availability status (1 = available, 0 = unavailable) for Kubernetes namespaces in specified regions. Data is fetched from Grafana and cached for 30 seconds.

**Supported Namespaces:**
- `remote`, `remodev`, `remodevnew`, `remotest`
- `residential`, `residev`, `resisand`, `resitest`
- `vrdev`, `vrremote`, `vrremoqa`, `vrremotest`

**Supported Regions:**
- `us-east-1` (N. Virginia)
- `eu-central-1` (Frankfurt)
- `ap-southeast-1` (Singapore)

**Parameters:**
- `namespaces` (query parameter, optional): Namespace(s) to check (comma-separated). Default: all supported namespaces.
- `region` (query parameter, optional): Region(s) to check (comma-separated). Default: all supported regions.

**Example Requests:**

```bash
# Single namespace and region
curl -X 'GET' \
  'http://localhost:3000/availability?namespaces=residential&region=eu-central-1' \
  -H 'accept: application/json'

# Multiple namespaces
curl -X 'GET' \
  'http://localhost:3000/availability?namespaces=remote,residential,vrremote' \
  -H 'accept: application/json'

# Multiple regions
curl -X 'GET' \
  'http://localhost:3000/availability?region=eu-central-1,us-east-1' \
  -H 'accept: application/json'
```

**Example Response (Single namespace/region):**

```json
{
  "timestamp": "2023-11-22T15:30:00.000Z",
  "namespace": "residential",
  "region": "eu-central-1",
  "status": 1,
  "source": "grafana",
  "cached": false
}
```

**Example Response (Multiple namespaces/regions):**

```json
{
  "timestamp": "2023-11-22T15:30:00.000Z",
  "status": 1,
  "availabilityStatus": {
    "remote": 1,
    "residential": 1,
    "vrremote": 0
  },
  "region": {
    "eu-central-1": 1,
    "us-east-1": 1,
    "ap-southeast-1": 0
  },
  "detailedStatus": [
    {
      "namespace": "remote",
      "region": "eu-central-1",
      "status": 1
    },
    {
      "namespace": "remote",
      "region": "us-east-1",
      "status": 1
    },
    {
      "namespace": "residential",
      "region": "eu-central-1",
      "status": 1
    },
    {
      "namespace": "vrremote",
      "region": "ap-southeast-1",
      "status": 0
    }
  ],
  "source": "grafana",
  "cached": false
}
```

**Status Values:**
- `1`: Service is available
- `0`: Service is unavailable
- `null`: Service status is unknown

**Response Status Codes:**
- `200`: Availability status retrieved successfully
- `400`: Invalid namespace or region parameters
- `500`: Internal server error or missing Grafana credentials

---

#### Get Availability Logs

**Endpoint:** `GET /availability-logs`

**Description:** Retrieve historical availability data logs from Redis. Logs contain detailed availability information for all namespaces and regions.

**Parameters:**
- `namespace` (query parameter, optional): Filter logs by namespace
- `region` (query parameter, optional): Filter logs by region
- `limit` (query parameter, optional): Number of logs to return (default: 10, max: 100)
- `datetime` (query parameter, optional): Filter logs by datetime. Supports ISO 8601 format and simple date formats (e.g., `2024-11-22` or `2024-11-22T15:30:00`).

**Example Request:**

```bash
curl -X 'GET' \
  'http://localhost:3000/availability-logs?namespace=residential&region=eu-central-1&limit=5' \
  -H 'accept: application/json'
```

**Example Response:**

```json
{
  "namespace": "residential",
  "region": "eu-central-1",
  "count": 5,
  "total": 42,
  "end_datetime": "2024-11-22T15:30:00.000Z",
  "end_score": 1732298400,
  "logs": [
    {
      "score": 1732298400,
      "datetime": "2024-11-22T15:30:00.000Z",
      "cacheKey": "grafana_availability_residential_5",
      "data": {
        "timestamp": "2024-11-22T15:30:00.000Z",
        "availabilityStatus": {
          "residential": 1
        },
        "regionStatus": {
          "eu-central-1": 1
        },
        "detailedStatus": [
          {
            "namespace": "residential",
            "region": "eu-central-1",
            "status": 1
          }
        ],
        "status": 1
      }
    }
  ]
}
```

**Response Status Codes:**
- `200`: Logs retrieved successfully
- `400`: Invalid limit or datetime specified
- `500`: Internal server error

---

#### Test Availability Endpoint

**Endpoint:** `GET /availability-test`

**Description:** Test endpoint that simulates availability responses with configurable status values. Useful for testing client conditions like `{{ responseBody.status !== 1 }}`.

**Parameters:**
- `status` (query parameter, optional): Override status value (`0`, `1`, or `null`). Default: `1`
- `namespace` (query parameter, optional): Test namespace to simulate. Default: `remote`
- `region` (query parameter, optional): Test region to simulate. Default: `eu-central-1`
- `delay` (query parameter, optional): Add artificial delay in milliseconds (0-5000). Default: `0`

**Example Test Scenarios:**

```bash
# Available service (status = 1)
curl -X 'GET' \
  'http://localhost:3000/availability-test?status=1' \
  -H 'accept: application/json'

# Unavailable service (status = 0)
curl -X 'GET' \
  'http://localhost:3000/availability-test?status=0' \
  -H 'accept: application/json'

# Unknown status
curl -X 'GET' \
  'http://localhost:3000/availability-test?status=null' \
  -H 'accept: application/json'

# Custom namespace and region with 2 second delay
curl -X 'GET' \
  'http://localhost:3000/availability-test?namespace=residential&region=us-east-1&status=0&delay=2000' \
  -H 'accept: application/json'
```

**Example Response:**

```json
{
  "timestamp": "2023-11-22T15:30:00.000Z",
  "namespace": "remote",
  "region": "eu-central-1",
  "status": 0,
  "source": "test",
  "cached": false,
  "test": true
}
```

**Response Status Codes:**
- `200`: Test response generated successfully
- `400`: Invalid status parameter
- `500`: Internal server error

---

## Environment Configuration

The API requires the following environment variables to be set:

### Required Variables

For each environment (`DEV`, `ALARM`, `PROD`), set:
- `{ENV}_USERNAME`: Basic auth username for Check MK API
- `{ENV}_PASSWORD`: Basic auth password for Check MK API
- `{ENV}_API_HOST`: Check MK API host
- `{ENV}_API_GROUP`: Check MK API group
- `{ENV}_API_AGGREGATION`: Check MK aggregation identifier

### Optional Variables

- `NODE_ENV`: Current environment (`prod`, `dev`, or `alarm`). Default: `prod`
- `PORT`: Server port. Default: `3000`
- `STD_TTL`: NodeCache TTL in seconds. Default: `300` (5 minutes)
- `CACHE_FETCH_DATA`: Enable data caching in Redis. Default: `false`
- `REDIS_PASSWORD`: Redis password for authentication
- `GRAFANA_TOKEN`: Grafana API token (required for availability endpoint)
- `GRAFANA_UID`: Grafana datasource UID (required for availability endpoint)
- `GRAFANA_TIME_RANGE`: Time range for Grafana queries in minutes. Default: `5`
- `GRAFANA_QUERY_TEMPLATE`: Custom Grafana query template. Default: built-in template
- `DEBUG`: Enable detailed debug logging. Default: `false`
- `REDIS_WRITE_DEBOUNCE`: Redis write debounce time in milliseconds. Default: `300000` (5 minutes)

---

## Caching Strategy

The API uses a multi-layer caching approach:

1. **In-Memory Cache (NodeCache)**: Fast access to frequently requested data with configurable TTL
2. **Redis Cache**: Persistent storage of historical data across server restarts

### Service Information Caching

- Service information is cached in both NodeCache and Redis
- Cache key: `monitor_{environment}`
- Write debounce: 5 minutes (configurable via `REDIS_WRITE_DEBOUNCE`)
- Retention: 10,000 most recent entries per key

### Availability Caching

- Availability data is cached in NodeCache only by default
- Cache key: `availability_{namespaces}_{region}_{timeRange}`
- TTL: 30 seconds
- Data source: Grafana Prometheus queries

---

## Response Format Notes

### Cache and Source Fields

All responses include:
- `cached`: Boolean indicating if data was retrieved from cache (true for NodeCache, false for fresh data)
- `source`: Source of the data (`grafana`, `nodeCache`, `test`, or `server`)

### DateTime Handling

- All timestamps are in ISO 8601 format
- Datetime queries accept both ISO 8601 and simple date formats
- Future dates are converted to current time automatically

### Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

---

## Example Workflows

### Check if a service is available

```bash
curl -X 'GET' \
  'http://localhost:3000/availability?namespaces=residential&region=eu-central-1' \
  -H 'accept: application/json'
```

### Get recent service status changes

```bash
curl -X 'GET' \
  'http://localhost:3000/service-info-logs/prod?limit=20' \
  -H 'accept: application/json'
```

### Retrieve availability history for a specific namespace

```bash
curl -X 'GET' \
  'http://localhost:3000/availability-logs?namespace=remote&limit=50' \
  -H 'accept: application/json'
```

### Test alert condition (check if service is unavailable)

```bash
# This simulates a monitoring alert that triggers when service is NOT available
curl -X 'GET' \
  'http://localhost:3000/availability-test?status=0' \
  -H 'accept: application/json'
```

---

## Troubleshooting

### Missing Grafana Credentials

If you see errors about missing `GRAFANA_TOKEN` or `GRAFANA_UID`:
- Ensure both environment variables are set
- Check that your Grafana API token is valid
- Verify the datasource UID matches your Prometheus datasource

### No Data in Redis

If availability or service logs return empty:
- Check Redis connection with `redis-cli`
- Verify `CACHE_FETCH_DATA` is set to `true` for service info caching
- Check that availability queries are being made (at least one request needed to populate cache)

### Port Already in Use

The API will automatically find the next available port if the preferred port is in use. Check the startup log for the actual port number.

---

## API Documentation

For interactive API documentation and to test endpoints directly, visit:

```
http://localhost:3000/
```

This provides a Swagger UI interface where you can:
- View all available endpoints
- See request/response schemas
- Test endpoints with different parameters
- View example responses
