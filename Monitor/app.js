const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");
const Redis = require("ioredis");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
require("dotenv").config();

// Validate required environment variables
function validateEnvVars() {
  const environments = ["DEV", "ALARM", "PROD"];
  const requiredVars = [
    "USERNAME",
    "PASSWORD",
    "API_HOST",
    "API_GROUP",
    "API_AGGREGATION",
  ];

  for (const env of environments) {
    for (const varName of requiredVars) {
      const envVar = process.env[`${env}_${varName}`];
      if (!envVar) {
        console.error(
          `Missing required environment variable: ${env}_${varName}`
        );
        process.exit(1);
      }
    }
  }

  // Check Grafana credentials
  if (!process.env.GRAFANA_TOKEN) {
    console.warn("Missing GRAFANA_TOKEN environment variable. Availability endpoint will not function correctly.");
  }

  if (!process.env.GRAFANA_UID) {
    console.warn("Missing GRAFANA_UID environment variable. Availability endpoint will not function correctly.");
  }

  // Set default value for GRAFANA_TIME_RANGE if not provided
  if (!process.env.GRAFANA_TIME_RANGE) {
    process.env.GRAFANA_TIME_RANGE = "5";
    console.info("GRAFANA_TIME_RANGE not set, using default value of 5 minutes.");
  }

  // Set default Grafana query templates if not provided
  if (!process.env.GRAFANA_QUERY_TEMPLATE) {
    process.env.GRAFANA_QUERY_TEMPLATE = "min_over_time(max_over_time(namespace:availability_no_critical_alerts{namespace=~\"{{NAMESPACES}}\"{{REGION_FILTER}}}[1m:30s])[1m:30s])";
    console.info("GRAFANA_QUERY_TEMPLATE not set, using default query template.");
  }
}

validateEnvVars();

const envConfigs = {
  dev: {
    USERNAME: process.env.DEV_USERNAME,
    PASSWORD: process.env.DEV_PASSWORD,
    API_HOST: process.env.DEV_API_HOST,
    API_GROUP: process.env.DEV_API_GROUP,
    API_AGGREGATION: process.env.DEV_API_AGGREGATION,
  },
  alarm: {
    USERNAME: process.env.ALARM_USERNAME,
    PASSWORD: process.env.ALARM_PASSWORD,
    API_HOST: process.env.ALARM_API_HOST,
    API_GROUP: process.env.ALARM_API_GROUP,
    API_AGGREGATION: process.env.ALARM_API_AGGREGATION,
  },
  prod: {
    USERNAME: process.env.PROD_USERNAME,
    PASSWORD: process.env.PROD_PASSWORD,
    API_HOST: process.env.PROD_API_HOST,
    API_GROUP: process.env.PROD_API_GROUP,
    API_AGGREGATION: process.env.PROD_API_AGGREGATION,
  },
};

const env = process.env.NODE_ENV || "prod";
const config = envConfigs[env];

if (!config) {
  console.error(
    `Invalid environment: ${env}. Valid options are: prod, dev, alarm.`
  );
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const cache = new NodeCache({ stdTTL: Number(process.env.STD_TTL) || 300 });
const shouldCacheData =
  (process.env.CACHE_FETCH_DATA || "").toLowerCase() === "true";

// Debug configuration
const DEBUG = (process.env.DEBUG || "").toLowerCase() === "true";

function debugLog(message) {
  if (DEBUG) {
    const datetime = new Date().toISOString();
    console.log(`[${datetime}] [NodeCache] ${message}`);
  }
}

// Read Redis write debounce time from env (default 5 minutes)
const REDIS_WRITE_DEBOUNCE = Number(process.env.REDIS_WRITE_DEBOUNCE) || 300000; // 5 minutes in milliseconds
const lastWriteTime = new Map(); // Track last write time for each key

// Initialize Redis client
const redis = new Redis({
  port: 6310,
  host: "localhost",
  password: process.env.REDIS_PASSWORD,
});

// Redis connection handling
redis.on("connect", () => {
  console.log("Successfully connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

// Test Redis connection
async function testRedisConnection() {
  try {
    await redis.set("test_key", "test_value");
    const value = await redis.get("test_key");
    console.log("Redis test successful:", value === "test_value");
    await redis.del("test_key");
  } catch (error) {
    console.error("Redis test failed:", error);
  }
}

// Test Redis connection and migrate data
async function initializeRedis() {
  try {
    await testRedisConnection();
  } catch (error) {
    console.error("Redis initialization error:", error);
  }
}

// Initialize Redis
initializeRedis();

// Helper function to format date in a user-friendly way
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return {
    iso: isoString,
    formatted: date.toUTCString(),
  };
}

// Function to log service data to Redis
async function logServiceData(cacheKey, data, shouldLog = true) {
  if (!shouldLog) {
    debugLog(`[Redis Write] Skipped for key: ${cacheKey} (shouldLog=false)`);
    return;
  }

  const now = new Date();
  const currentTime = now.getTime();

  // Check if we've written recently
  const lastWrite = lastWriteTime.get(cacheKey) || 0;
  if (currentTime - lastWrite < REDIS_WRITE_DEBOUNCE) {
    debugLog(
      `[Redis Write] Skipped - recent write exists for key: ${cacheKey} (next write in ${Math.ceil((REDIS_WRITE_DEBOUNCE - (currentTime - lastWrite)) / 1000)}s)`
    );
    return;
  }

  const score = Math.floor(currentTime / 1000); // Convert to Unix timestamp in seconds

  debugLog(`[Redis Write] Writing new entry for key: ${cacheKey}`);

  // Store just the data with timestamp as the score
  await redis.zadd(`${cacheKey}_logs`, score, JSON.stringify(data));
  lastWriteTime.set(cacheKey, currentTime);

  // Get the current size of the sorted set
  const setSize = await redis.zcard(`${cacheKey}_logs`);

  // Only trim if we have more than 10000 entries
  if (setSize > 10000) {
    // Keep the 10000 most recent entries by removing older ones
    const trimCount = setSize - 10000;
    await redis.zremrangebyrank(`${cacheKey}_logs`, 0, trimCount - 1);
    debugLog(`[Redis Trim] Removed ${trimCount} old entries from ${cacheKey}_logs`);
  }
}

// Group services by environment for better organization and maintenance
const SERVICE_ENV_CONFIG = {
  prod: ["retailna", "its", "vrremote", "residential", "remote"],
  alarm: ["ap", "aus", "eu", "hk", "india", "latam", "na", "th"],
};

// Create a fast lookup map (computed once at startup)
const SERVICE_MAP = Object.entries(SERVICE_ENV_CONFIG).reduce(
  (map, [env, services]) => {
    services.forEach((service) => (map[service.toLowerCase()] = env));
    return map;
  },
  {}
);

function getCredentials(serviceKey) {
  // Fast lookup using pre-computed map, case-insensitive
  const envKey = SERVICE_MAP[serviceKey.toLowerCase()] || env;
  return { ...envConfigs[envKey], envKey };
}

function hidePoweredBy(req, res, next) {
  res.removeHeader("X-Powered-By");
  next();
}

app.use(hidePoweredBy);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Service Monitor API",
      version: "1.0.0",
      description: "API documentation for the Service Monitor application",
    },
    servers: [
      {
        url: "http://localhost:" + (process.env.PORT || 3000),
        description: "Service Monitor API server",
      },
    ],
  },
  apis: ["./app.js"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI setup
app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Default route redirect to API documentation
app.get("/", (req, res) => {
  res.redirect("/api");
});

/**
 * @swagger
 * /service-info/{service}:
 *   get:
 *     summary: Get service information
 *     description: Retrieve information about a specific service
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         description: |
 *           Service key to fetch information for. Available environments:
 *           - Prod: retailna, its
 *           - Alarm: AP, AUS, EU, HK, INDIA, LATAM, NA, TH
 *         schema:
 *           type: string
 *           enum:
 *             # Prod environments
 *             - retailna
 *             - its
 *             # Alarm environments
 *             - AP
 *             - AUS
 *             - EU
 *             - HK
 *             - INDIA
 *             - LATAM
 *             - NA
 *             - TH
 *     responses:
 *       200:
 *         description: Service information retrieved successfully
 *       400:
 *         description: Invalid service key or bad request
 *       500:
 *         description: Internal server error
 */
app.get("/service-info/:service", async (req, res) => {
  const serviceKey = req.params.service;
  const credentials = getCredentials(serviceKey);
  const cacheKey = getCacheKey(credentials.envKey);

  try {
    let data = cache.get(cacheKey);
    let source = "nodeCache";

    if (!data) {
      console.log(`${new Date().toISOString()}: Cache miss for key: ${cacheKey}`);
      data = await fetchAggregationData(credentials);
      source = "server";

      if (data) {
        // Update caches with new data - Redis enabled only for service-info
        if (shouldCacheData) {
          cache.set(cacheKey, data);
          // Log to Redis for service-info APIs only
          try {
            await logServiceData(cacheKey, data, true);
          } catch (error) {
            console.error("Failed to update Redis cache:", error);
            cache.set(cacheKey, data);
          }
        }
      }
    } else {
      console.log(`${new Date().toISOString()}: Cache hit for key: ${cacheKey}`);
    }

    // Look for the service with both formats
    const formattedService = `Services ${serviceKey}`;
    const serviceData = data[formattedService] || data[serviceKey];

    if (serviceData) {
      const { state, output, in_downtime, hosts, infos } = serviceData;
      const failureCause = extractErrorOutput(infos);
      return res.json({
        service: serviceKey,
        state,
        output,
        in_downtime,
        hosts,
        failureCause,
        environment: credentials.envKey,
        cached: data !== undefined,
        source,
      });
    }

    console.log("Available services:", Object.keys(data));
    res.status(404).json({
      error: "Service not found",
      availableServices: Object.keys(data),
      searchedService: formattedService,
      searchedServiceAlt: serviceKey,
      environment: credentials.envKey,
      cached: data !== undefined,
      source,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching service data",
      details: (error.response && error.response.data) || error.message,
      service: serviceKey,
      environment: credentials.envKey,
    });
  }
});

// Helper function to get data from Redis
async function getFromRedis(cacheKey) {
  try {
    // Get the latest entry for this cache key
    const entries = await redis.zrevrangebyscore(
      `${cacheKey}_logs`,
      "+inf",
      "-inf",
      "LIMIT",
      0,
      1
    );
    console.log(
      `[${new Date().toISOString()}] [Redis Read] Key: ${cacheKey}, Found entries: ${
        entries.length
      }`
    );
    if (entries && entries.length > 0) {
      return JSON.parse(entries[0]);
    }
  } catch (error) {
    console.error(`Error getting data from Redis for key ${cacheKey}:`, error);
  }
  return null;
}

function extractErrorOutput(infos) {
  let output = "";
  const extract = (item) => {
    if (Array.isArray(item)) item.forEach(extract);
    else if (item && item.error && item.error.output)
      output += `${item.error.output}; `;
    else if (typeof item === "object") Object.values(item).forEach(extract);
  };
  if (infos) extract(infos);
  return output.trim();
}

// Create axios instance with common configuration
const createAxiosInstance = (credentials) => {
  const token = Buffer.from(
    `${credentials.USERNAME}:${credentials.PASSWORD}`,
    "utf8"
  ).toString("base64");
  const baseURL = `https://${credentials.API_HOST}/${credentials.API_GROUP}/check_mk/api/1.0`; // Dev/Prod environments

  return axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${token}`,
    },
    maxRedirects: 5,
    validateStatus: function (status) {
      return status >= 200 && status < 400; // Accept status codes in 2xx and 3xx range
    },
  });
};

async function fetchAggregationData(credentials) {
  try {
    const api = createAxiosInstance(credentials);
    const response = await api.post(
      "/domain-types/bi_aggregation/actions/aggregation_state/invoke",
      {
        filter_groups: [credentials.API_AGGREGATION],
      }
    );
    return response.data.aggregations || {};
  } catch (error) {
    console.error("API Error:", {
      message: error.message,
      status: error.response && error.response.status,
      data: error.response && error.response.data,
    });
    throw error;
  }
}

/**
 * @swagger
 * /service-info-logs/{environment}:
 *   get:
 *     summary: Get logs for a specific environment
 *     description: Retrieve service data logs for a specific environment (prod or alarm)
 *     parameters:
 *       - in: path
 *         name: environment
 *         required: true
 *         description: Environment to fetch logs for (prod, alarm)
 *         schema:
 *           type: string
 *           enum: [prod, alarm]
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of logs to return (default 10, max 100)
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: datetime
 *         required: false
 *         description: Filter logs by datetime. Supports ISO 8601 format and simple date formats (e.g., '2024-11-22', '2024-11-22T15:30:00')
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *       400:
 *         description: Invalid environment, limit, or datetime specified
 *       500:
 *         description: Internal server error
 */
app.get("/service-info-logs/:environment", async (req, res) => {
  const { environment } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  try {
    let datetime;
    if (req.query.datetime) {
      // For future dates, convert to current time
      const parsedDate = new Date(req.query.datetime);
      const now = new Date();
      datetime = parsedDate > now ? now : parsedDate;
    } else {
      // Use current time if no datetime provided
      datetime = new Date();
      debugLog(`No datetime provided, using current time: ${datetime.toISOString()}`);
    }

    // Ensure we have a valid datetime
    if (!(datetime instanceof Date) || isNaN(datetime)) {
      return res.status(400).json({
        error: "Invalid datetime format",
        details: "Please use ISO 8601 format (e.g., '2024-11-22' or '2024-11-22T15:30:00')"
      });
    }

    // Validate environment - exclude dev environment
    if (!SERVICE_ENV_CONFIG[environment] || environment === 'dev') {
      return res.status(400).json({
        error: "Invalid environment",
        validEnvironments: ['prod', 'alarm'],
      });
    }

    const logs = [];

    // Get cache key for the environment
    const cacheKey = getCacheKey(environment);
    const endScore = Math.floor(datetime.getTime() / 1000); // Convert datetime to Unix timestamp in seconds
    debugLog(`Fetching logs for cache key: ${cacheKey}, up to datetime: ${datetime.toISOString()} (score: ${endScore})`);

    // First check if we have any data in Redis
    const totalEntries = await redis.zcard(`${cacheKey}_logs`);
    debugLog(`Total entries in Redis for ${cacheKey}: ${totalEntries}`);

    if (totalEntries === 0) {
      return res.json({
        environment,
        count: 0,
        total: 0,
        end_datetime: datetime.toISOString(),
        end_score: endScore,
        logs: [],
      });
    }

    // Get the score range in Redis
    const [minScore, maxScore] = await redis.zrange(`${cacheKey}_logs`, 0, -1, 'WITHSCORES');
    debugLog(`Redis score range for ${cacheKey}: ${minScore} to ${maxScore}`);

    // Get log entries using Unix timestamp scores, filtering entries <= endScore
    const logEntries = await redis.zrevrangebyscore(
      `${cacheKey}_logs`,
      endScore,    // Max score (inclusive)
      '-inf',      // Min score (no lower limit)
      'LIMIT',
      0,
      limit
    );

    debugLog(
      `Found ${logEntries.length} log entries for ${cacheKey} with score <= ${endScore}`
    );

    // Parse logs
    for (const logStr of logEntries) {
      try {
        const log = JSON.parse(logStr);
        // Get the score for this entry
        const scores = await redis.zmscore(`${cacheKey}_logs`, logStr);
        const score = scores[0]; // zmscore returns an array of scores

        logs.push({
          score: Number(score), // Redis score (Unix timestamp in seconds)
          datetime: new Date(Number(score) * 1000).toISOString(), // Convert score to ISO datetime
          environment,
          cacheKey: cacheKey,
          data: log,
        });
      } catch (error) {
        console.error("Error processing log entry:", error);
        continue;
      }
    }

    // Sort logs by score in descending order (newest first)
    logs.sort((a, b) => b.score - a.score);

    const limitedLogs = logs.slice(0, limit);

    res.json({
      environment,
      count: limitedLogs.length,
      total: logs.length,
      end_datetime: datetime.toISOString(),
      end_score: endScore,
      logs: limitedLogs,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs", details: error.message });
  }
});

/**
 * @swagger
 * /availability:
 *   get:
 *     summary: Get availability status for services
 *     description: |
 *       Retrieve availability status (1 or 0) for supported namespaces.
 *       Status value of 1 indicates service is available, 0 indicates service is unavailable.
 *     parameters:
 *       - in: query
 *         name: namespaces
 *         schema:
 *           type: string
 *           example: "remote"
 *           enum:
 *             - remote
 *             - remodev
 *             - remodevnew
 *             - remotest
 *             - residential
 *             - residev
 *             - resisand
 *             - resitest
 *             - vrdev
 *             - vrremote
 *             - vrremoqa
 *             - vrremotest
 *         description: |
 *           Namespace(s) to check availability for.
 *           Can be a single namespace or multiple namespaces separated by commas.
 *           Default is all supported namespaces.
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           example: "eu-central-1"
 *           enum:
 *             - us-east-1
 *             - eu-central-1
 *             - ap-southeast-1
 *         description: |
 *           AWS region(s) to check availability for.
 *           Can be a single region or multiple regions separated by commas.
 *           If not specified, all regions will be checked.
 *     responses:
 *       200:
 *         description: Availability status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Single namespace and region response
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of when the data was retrieved
 *                       example: "2023-11-22T15:30:00.000Z"
 *                     namespace:
 *                       type: string
 *                       description: The requested namespace
 *                       example: "residential"
 *                     region:
 *                       type: string
 *                       description: The requested region
 *                       example: "eu-central-1"
 *                     status:
 *                       type: integer
 *                       description: Status for the namespace (1 = available, 0 = unavailable, null = unknown)
 *                       example: 1
 *                       enum: [0, 1, null]
 *                     source:
 *                       type: string
 *                       description: Source of the data (grafana or nodeCache)
 *                       example: "grafana"
 *                       enum: ["grafana", "nodeCache"]
 *                     cached:
 *                       type: boolean
 *                       description: Whether the data was retrieved from cache
 *                       example: false
 *                 - type: object
 *                   description: Multiple namespaces or regions response
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of when the data was retrieved
 *                       example: "2023-11-22T15:30:00.000Z"
 *                     status:
 *                       type: integer
 *                       description: Overall status (1 = all available, 0 = any unavailable, null = unknown)
 *                       example: 1
 *                       enum: [0, 1, null]
 *                     namespace:
 *                       type: string
 *                       description: The namespace when only one is requested
 *                       example: "remote"
 *                     availabilityStatus:
 *                       type: object
 *                       description: Status for each namespace (1 = available, 0 = unavailable, null = unknown)
 *                       example: {
 *                         "remote": 1,
 *                         "residential": 1,
 *                         "vrremote": 0
 *                       }
 *                       additionalProperties:
 *                         type: integer
 *                         enum: [0, 1, null]
 *                     region:
 *                       type: object
 *                       description: Status for each region (1 = all services available, 0 = any service unavailable)
 *                       example: {
 *                         "eu-central-1": 1,
 *                         "us-east-1": 1,
 *                         "ap-southeast-1": 0
 *                       }
 *                     detailedStatus:
 *                       type: array
 *                       description: Detailed status for each service in each region
 *                       example: [
 *                         {
 *                           "namespace": "remote",
 *                           "region": "eu-central-1",
 *                           "status": 1
 *                         }
 *                       ]
 *                       items:
 *                         type: object
 *                         properties:
 *                           namespace:
 *                             type: string
 *                             example: "remote"
 *                           region:
 *                             type: string
 *                             example: "eu-central-1"
 *                           status:
 *                             type: integer
 *                             enum: [0, 1, null]
 *                             example: 1
 *                     source:
 *                       type: string
 *                       description: Source of the data (grafana or nodeCache)
 *                       example: "grafana"
 *                       enum: ["grafana", "nodeCache"]
 *                     cached:
 *                       type: boolean
 *                       description: Whether the data was retrieved from cache
 *                       example: false
 *             examples:
 *               single_namespace_region:
 *                 summary: Single namespace and region
 *                 description: Response when requesting a single namespace in a single region
 *                 value: {
 *                   "timestamp": "2023-11-22T15:30:00.000Z",
 *                   "namespace": "residential",
 *                   "region": "eu-central-1",
 *                   "status": 1,
 *                   "source": "grafana",
 *                   "cached": false
 *                 }
 *               multiple_response:
 *                 summary: Multiple namespaces or regions
 *                 description: Response when requesting multiple namespaces or regions
 *                 value: {
 *                   "timestamp": "2023-11-22T15:30:00.000Z",
 *                   "status": 1,
 *                   "availabilityStatus": {
 *                     "remote": 1,
 *                     "residential": 1,
 *                     "vrremote": 0
 *                   },
 *                   "region": {
 *                     "eu-central-1": 1,
 *                     "us-east-1": 1,
 *                     "ap-southeast-1": 0
 *                   },
 *                   "detailedStatus": [
 *                     {
 *                       "namespace": "remote",
 *                       "region": "eu-central-1",
 *                       "status": 1
 *                     }
 *                   ],
 *                   "source": "grafana",
 *                   "cached": false
 *                 }
 *       400:
 *         description: Bad request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid namespace parameter"
 *       500:
 *         description: Internal server error or missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch availability data"
 *                 details:
 *                   type: string
 *                   example: "Missing required environment variables: GRAFANA_TOKEN or GRAFANA_UID"
 */
app.get("/availability", async (req, res) => {
  try {
    const grafanaToken = process.env.GRAFANA_TOKEN;
    const grafanaUid = process.env.GRAFANA_UID;

    if (!grafanaToken || !grafanaUid) {
      return res.status(500).json({
        error: "Missing required environment variables: GRAFANA_TOKEN or GRAFANA_UID"
      });
    }

    // Supported namespaces, sorted alphabetically
    const supportedNamespaces = [
      "remodev",
      "remodevnew",
      "remotest",
      "remote",
      "residev",
      "resisand",
      "residential",
      "resitest",
      "vrdev",
      "vrremote",
      "vrremoqa",
      "vrremotest"
    ].sort();

    // Parse request parameters
    let namespaces = req.query.namespaces || supportedNamespaces.join(",");
    namespaces = namespaces
      .split(",")
      .map(n => n.trim())
      .filter(n => supportedNamespaces.includes(n))
      .sort()
      .join(",");

    const regions = req.query.region || "";

    // Get time range from environment variable
    const timeRange = parseInt(process.env.GRAFANA_TIME_RANGE) || 5;

    // Create cache key (include region in the key if specified)
    const regionPart = regions ? `_${regions}` : '';
    const cacheKey = `availability_${namespaces}${regionPart}_${timeRange}`;

    // Check cache first
    let result = cache.get(cacheKey);
    let source = "nodeCache";

    if (!result) {
      debugLog(`Cache miss for key: ${cacheKey}`);
      // Calculate time range
      const startTime = Math.floor(Date.now() / 1000) - (timeRange * 60);
      const endTime = Math.floor(Date.now() / 1000);

      // Convert comma-separated namespaces to regex pattern
      const namespacePattern = namespaces.split(',').join('|');

      // Build query using the combined template
      let regionFilter = '';
      if (regions) {
        const regionPattern = regions.split(',').join('|');
        regionFilter = `,cluster_region=~"${regionPattern}"`;
      }

      const query = process.env.GRAFANA_QUERY_TEMPLATE
        .replace('{{NAMESPACES}}', namespacePattern)
        .replace('{{REGION_FILTER}}', regionFilter);

      // Remove any escaped quotes that might cause issues
      const cleanQuery = query.replace(/\\"/g, '"');

      debugLog(`Grafana query: ${cleanQuery}`);

      // Make request to Grafana
      const response = await axios({
        method: 'get',
        url: `https://grafana.cbsinternal.net/api/datasources/proxy/uid/${grafanaUid}/api/v1/query_range`,
        headers: {
          'X-Grafana-Org-Id': '1',
          'Authorization': `Bearer ${grafanaToken}`
        },
        params: {
          query: cleanQuery,
          start: startTime,
          end: endTime,
          step: 5  // Reduced from 10 to 5 seconds for higher resolution
        }
      });

      // Extract the status from the response
      result = {
        timestamp: new Date().toISOString(),
        availabilityStatus: {},
        regionStatus: {},
        detailedStatus: []
      };
      source = "grafana";

      if (response.data && response.data.data && response.data.data.result) {
        debugLog(`Grafana returned ${response.data.data.result.length} metric results`);

        // Process each result item
        response.data.data.result.forEach(item => {
          // Check if we have metric labels
          if (item.metric) {
            const namespace = item.metric.namespace;
            const region = item.metric.cluster_region;

            // Get the most recent value
            const values = item.values || [];
            const lastValue = values.length > 0 ? values[values.length - 1] : null;

            // Status is the second element in the value array
            // Convert to number (0 or 1), treat null/unknown as 1 to avoid false alarms
            const status = lastValue && lastValue[1] !== null ? Number(lastValue[1]) : 1;

            debugLog(`Processing: namespace=${namespace}, region=${region}, status=${status}`);

            // Store in detailedStatus array
            result.detailedStatus.push({
              namespace,
              region,
              status
            });

            // Update namespace status (take the worst status if multiple regions)
            if (result.availabilityStatus[namespace] === undefined || status === 0) {
              result.availabilityStatus[namespace] = status;
            }

            // Update region status (take the worst status if multiple namespaces)
            if (result.regionStatus[region] === undefined || status === 0) {
              result.regionStatus[region] = status;
            }
          }
        });

        debugLog(`Found namespaces in Grafana: ${Object.keys(result.availabilityStatus).join(', ')}`);

        // Calculate overall status (0 if any namespace is down, 1 if all are up or no data)
        const namespaceStatuses = Object.values(result.availabilityStatus);
        if (namespaceStatuses.length > 0) {
          // If any status is 0, overall status is 0
          result.status = namespaceStatuses.includes(0) ? 0 : 1;
        } else {
          // No data available - return 1 to avoid false alarms
          result.status = 1;
        }
      } else {
        debugLog("Unexpected Grafana response format:", JSON.stringify(response.data));
        result.status = 1; // No data available - return 1 to avoid false alarms
      }

      // Cache the result (60 second TTL) - NodeCache only, no Redis for availability
      cache.set(cacheKey, result, 60);
    } else {
      debugLog(`Cache hit for key: ${cacheKey}`);
    }

    // Filter results based on request parameters
    const requestedNamespaces = namespaces.split(",");
    const requestedRegions = regions ? regions.split(",") : [];

    // If specific namespace(s) and/or region(s) are requested, filter the results
    if (requestedNamespaces.length > 0 && namespaces !== supportedNamespaces.join(",")) {
      // Filter availabilityStatus to only include requested namespaces
      const filteredAvailabilityStatus = {};
      requestedNamespaces.forEach(ns => {
        if (result.availabilityStatus.hasOwnProperty(ns)) {
          filteredAvailabilityStatus[ns] = result.availabilityStatus[ns];
        }
      });
      result.availabilityStatus = filteredAvailabilityStatus;

      // Filter detailedStatus to only include requested namespaces
      result.detailedStatus = result.detailedStatus.filter(item =>
        requestedNamespaces.includes(item.namespace)
      );
    }

    if (requestedRegions.length > 0) {
      // Filter regionStatus to only include requested regions
      const filteredRegionStatus = {};
      requestedRegions.forEach(region => {
        if (result.regionStatus.hasOwnProperty(region)) {
          filteredRegionStatus[region] = result.regionStatus[region];
        }
      });
      result.regionStatus = filteredRegionStatus;

      // Further filter detailedStatus to only include requested regions
      result.detailedStatus = result.detailedStatus.filter(item =>
        requestedRegions.includes(item.region)
      );

      // Recalculate availabilityStatus based on filtered regions
      const recalculatedAvailabilityStatus = {};
      result.detailedStatus.forEach(item => {
        const ns = item.namespace;
        const st = item.status;
        // Take the worst status (0) if any region for this namespace is down
        if (recalculatedAvailabilityStatus[ns] === undefined || st === 0) {
          recalculatedAvailabilityStatus[ns] = st;
        }
      });
      result.availabilityStatus = recalculatedAvailabilityStatus;
    }

    // Recalculate overall status based on filtered results
    const filteredNamespaceStatuses = Object.values(result.availabilityStatus);
    if (filteredNamespaceStatuses.length > 0) {
      result.status = filteredNamespaceStatuses.includes(0) ? 0 : 1;
    } else {
      // No data available - return 1 to avoid false alarms
      result.status = 1;
    }

    // Optimize response format for single namespace/region requests
    let responseData = { ...result };

    // If single namespace and single region, optimize the response
    if (requestedNamespaces.length === 1 && requestedRegions.length === 1) {
      const namespace = requestedNamespaces[0];
      const region = requestedRegions[0];

      // Use nullish coalescing to properly handle status=0, default to 1 if no data
      const namespaceStatus = result.availabilityStatus[namespace] !== undefined
        ? result.availabilityStatus[namespace]
        : 1;

      responseData = {
        timestamp: result.timestamp,
        namespace: namespace,
        region: region,
        status: namespaceStatus,
        source: source,
        cached: source === "nodeCache"
      };
    } else {
      // For multi-namespace/region requests, rename regionStatus to region
      responseData.region = responseData.regionStatus;
      delete responseData.regionStatus;

      // Add namespace info for clarity
      if (requestedNamespaces.length === 1) {
        responseData.namespace = requestedNamespaces[0];
      }
    }

    // Send response with optimized data
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching availability:", error);

    // Add more detailed error logging
    if (error.response) {
      console.error("Grafana response status:", error.response.status);
      console.error("Grafana response data:", error.response.data);
    }

    res.status(500).json({
      error: "Failed to fetch availability data",
      details: error.message,
      status: error.response?.status,
      grafanaError: error.response?.data,
      stack: DEBUG ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /availability-test:
 *   get:
 *     summary: Test availability endpoint with configurable status
 *     description: |
 *       Test endpoint that simulates availability responses with configurable status values.
 *       Useful for testing client conditions like `{{ responseBody.status !== 1 }}`.
 *
 *       **Test Scenarios:**
 *       - Available service: `?status=1` (default)
 *       - Unavailable service: `?status=0`
 *       - With delay: `?status=0&delay=2000`
 *       - Custom namespace/region: `?namespace=residential&region=us-east-1&status=0`
 *     tags:
 *       - Testing
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         description: |
 *           Override the status value:
 *           - `1` = Service available (your condition `{{ responseBody.status !== 1 }}` will be `false`)
 *           - `0` = Service unavailable (your condition `{{ responseBody.status !== 1 }}` will be `true`)
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *           default: "1"
 *         examples:
 *           available:
 *             value: "1"
 *             summary: Service available
 *           unavailable:
 *             value: "0"
 *             summary: Service unavailable
 *       - in: query
 *         name: namespace
 *         required: false
 *         description: Test namespace to simulate (all supported namespaces from availability endpoint)
 *         schema:
 *           type: string
 *           enum:
 *             - remote
 *             - remodev
 *             - remodevnew
 *             - remotest
 *             - residential
 *             - residev
 *             - resisand
 *             - resitest
 *             - vrdev
 *             - vrremote
 *             - vrremoqa
 *             - vrremotest
 *           default: "remote"
 *         examples:
 *           remote:
 *             value: "remote"
 *             summary: Remote namespace
 *           remodev:
 *             value: "remodev"
 *             summary: Remote dev namespace
 *           remodevnew:
 *             value: "remodevnew"
 *             summary: Remote dev new namespace
 *           remotest:
 *             value: "remotest"
 *             summary: Remote test namespace
 *           residential:
 *             value: "residential"
 *             summary: Residential namespace
 *           residev:
 *             value: "residev"
 *             summary: Residential dev namespace
 *           resisand:
 *             value: "resisand"
 *             summary: Residential sandbox namespace
 *           resitest:
 *             value: "resitest"
 *             summary: Residential test namespace
 *           vrdev:
 *             value: "vrdev"
 *             summary: VR dev namespace
 *           vrremote:
 *             value: "vrremote"
 *             summary: VR Remote namespace
 *           vrremoqa:
 *             value: "vrremoqa"
 *             summary: VR Remote QA namespace
 *           vrremotest:
 *             value: "vrremotest"
 *             summary: VR Remote test namespace
 *       - in: query
 *         name: region
 *         required: false
 *         description: Test region to simulate (all supported regions from availability endpoint)
 *         schema:
 *           type: string
 *           enum:
 *             - us-east-1
 *             - eu-central-1
 *             - ap-southeast-1
 *           default: "eu-central-1"
 *         examples:
 *           us_east:
 *             value: "us-east-1"
 *             summary: US East region (N. Virginia)
 *           eu_central:
 *             value: "eu-central-1"
 *             summary: EU Central region (Frankfurt)
 *           ap_southeast:
 *             value: "ap-southeast-1"
 *             summary: Asia Pacific Southeast region (Singapore)
 *       - in: query
 *         name: delay
 *         required: false
 *         description: |
 *           Add artificial delay in milliseconds to simulate slow responses.
 *           Useful for testing timeout scenarios.
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 5000
 *           default: 0
 *         examples:
 *           no_delay:
 *             value: 0
 *             summary: No delay (instant response)
 *           slow_response:
 *             value: 2000
 *             summary: 2 second delay
 *           timeout_test:
 *             value: 5000
 *             summary: 5 second delay (max)
 *     responses:
 *       200:
 *         description: Test availability response (always returns 200 unless invalid parameters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - timestamp
 *                 - namespace
 *                 - region
 *                 - status
 *                 - source
 *                 - cached
 *                 - test
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: ISO 8601 timestamp when response was generated
 *                   example: "2023-11-22T15:30:00.000Z"
 *                 namespace:
 *                   type: string
 *                   description: The namespace being tested
 *                   example: "remote"
 *                   enum:
 *                     - remote
 *                     - remodev
 *                     - remodevnew
 *                     - remotest
 *                     - residential
 *                     - residev
 *                     - resisand
 *                     - resitest
 *                     - vrdev
 *                     - vrremote
 *                     - vrremoqa
 *                     - vrremotest
 *                 region:
 *                   type: string
 *                   description: The region being tested
 *                   example: "eu-central-1"
 *                   enum:
 *                     - us-east-1
 *                     - eu-central-1
 *                     - ap-southeast-1
 *                 status:
 *                   type: integer
 *                   description: |
 *                     Availability status:
 *                     - `1` = Available
 *                     - `0` = Unavailable
 *                   example: 1
 *                   enum: [0, 1]
 *                 source:
 *                   type: string
 *                   description: Always "test" for test endpoint
 *                   example: "test"
 *                   enum: ["test"]
 *                 cached:
 *                   type: boolean
 *                   description: Always false for test endpoint
 *                   example: false
 *                 test:
 *                   type: boolean
 *                   description: Always true to identify test responses
 *                   example: true
 *             examples:
 *               available_service:
 *                 summary: Available service (status = 1)
 *                 description: |
 *                   Service is available. Your condition `{{ responseBody.status !== 1 }}` will be `false`.
 *                   Use: `/availability-test?status=1`
 *                 value:
 *                   timestamp: "2023-11-22T15:30:00.000Z"
 *                   namespace: "remote"
 *                   region: "eu-central-1"
 *                   status: 1
 *                   source: "test"
 *                   cached: false
 *                   test: true
 *               unavailable_service:
 *                 summary: Unavailable service (status = 0)
 *                 description: |
 *                   Service is unavailable. Your condition `{{ responseBody.status !== 1 }}` will be `true`.
 *                   Use: `/availability-test?status=0`
 *                 value:
 *                   timestamp: "2023-11-22T15:30:00.000Z"
 *                   namespace: "remote"
 *                   region: "eu-central-1"
 *                   status: 0
 *                   source: "test"
 *                   cached: false
 *                   test: true
 *               resisand_us_east:
 *                 summary: Resisand namespace in US East region
 *                 description: |
 *                   Test with resisand namespace in us-east-1 region.
 *                   Use: `/availability-test?namespace=resisand&region=us-east-1&status=0`
 *                 value:
 *                   timestamp: "2023-11-22T15:30:00.000Z"
 *                   namespace: "resisand"
 *                   region: "us-east-1"
 *                   status: 0
 *                   source: "test"
 *                   cached: false
 *                   test: true
 *               vrremote_ap_southeast:
 *                 summary: VR Remote namespace in AP Southeast region
 *                 description: |
 *                   Test with vrremote namespace in ap-southeast-1 region.
 *                   Use: `/availability-test?namespace=vrremote&region=ap-southeast-1&status=1`
 *                 value:
 *                   timestamp: "2023-11-22T15:30:00.000Z"
 *                   namespace: "vrremote"
 *                   region: "ap-southeast-1"
 *                   status: 1
 *                   source: "test"
 *                   cached: false
 *                   test: true
 *               delayed_response:
 *                 summary: Response with artificial delay
 *                 description: |
 *                   Test with 2 second delay to simulate slow responses.
 *                   Use: `/availability-test?status=0&delay=2000`
 *                 value:
 *                   timestamp: "2023-11-22T15:30:00.000Z"
 *                   namespace: "remote"
 *                   region: "eu-central-1"
 *                   status: 0
 *                   source: "test"
 *                   cached: false
 *                   test: true
 *       400:
 *         description: Invalid parameters provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid status parameter"
 *                 details:
 *                   type: string
 *                   example: "Status must be '0', '1', or 'null'"
 *                 validValues:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["0", "1", "null"]
 *             examples:
 *               invalid_status:
 *                 summary: Invalid status parameter
 *                 value:
 *                   error: "Invalid status parameter"
 *                   details: "Status must be '0' or '1'"
 *                   validValues: ["0", "1"]
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Test endpoint error"
 *                 details:
 *                   type: string
 *                   example: "Error message details"
 */
app.get("/availability-test", async (req, res) => {
  try {
    // Parse parameters
    const statusParam = req.query.status || "1";
    const namespace = req.query.namespace || "remote";
    const region = req.query.region || "eu-central-1";
    const delay = Math.min(Math.max(parseInt(req.query.delay) || 0, 0), 5000);

    // Convert status parameter to appropriate type
    const status = parseInt(statusParam);
    if (![0, 1].includes(status)) {
      return res.status(400).json({
        error: "Invalid status parameter",
        details: "Status must be '0' or '1'",
        validValues: ["0", "1"]
      });
    }

    // Add artificial delay if requested
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Generate test response in same format as real availability endpoint
    const response = {
      timestamp: new Date().toISOString(),
      namespace: namespace,
      region: region,
      status: status,
      source: "test",
      cached: false,
      test: true
    };

    debugLog(`Test availability response: status=${status}, namespace=${namespace}, region=${region}, delay=${delay}ms`);

    res.json(response);
  } catch (error) {
    console.error("Error in availability test endpoint:", error);
    res.status(500).json({
      error: "Test endpoint error",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /availability-logs:
 *   get:
 *     summary: Get availability logs
 *     description: Retrieve availability data logs from Redis cache
 *     parameters:
 *       - in: query
 *         name: namespace
 *         required: false
 *         description: Filter logs by namespace
 *         schema:
 *           type: string
 *           enum:
 *             - remote
 *             - remodev
 *             - remodevnew
 *             - remotest
 *             - residential
 *             - residev
 *             - resisand
 *             - resitest
 *             - vrdev
 *             - vrremote
 *             - vrremoqa
 *             - vrremotest
 *       - in: query
 *         name: region
 *         required: false
 *         description: Filter logs by region
 *         schema:
 *           type: string
 *           enum:
 *             - us-east-1
 *             - eu-central-1
 *             - ap-southeast-1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of logs to return (default 10, max 100)
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: datetime
 *         required: false
 *         description: Filter logs by datetime. Supports ISO 8601 format and simple date formats (e.g., '2024-11-22', '2024-11-22T15:30:00')
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability logs retrieved successfully
 *       400:
 *         description: Invalid limit or datetime specified
 *       500:
 *         description: Internal server error
 */
app.get("/availability-logs", async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
  const namespaceFilter = req.query.namespace;
  const regionFilter = req.query.region;

  try {
    let datetime;
    if (req.query.datetime) {
      // For future dates, convert to current time
      const parsedDate = new Date(req.query.datetime);
      const now = new Date();
      datetime = parsedDate > now ? now : parsedDate;
    } else {
      // Use current time if no datetime provided
      datetime = new Date();
      debugLog(`No datetime provided, using current time: ${datetime.toISOString()}`);
    }

    // Ensure we have a valid datetime
    if (!(datetime instanceof Date) || isNaN(datetime)) {
      return res.status(400).json({
        error: "Invalid datetime format",
        details: "Please use ISO 8601 format (e.g., '2024-11-22' or '2024-11-22T15:30:00')"
      });
    }

    const logs = [];
    const endScore = Math.floor(datetime.getTime() / 1000); // Convert datetime to Unix timestamp in seconds
    debugLog(`Fetching availability logs up to datetime: ${datetime.toISOString()} (score: ${endScore})`);

    // Get all availability-related keys from Redis
    let availabilityKeys = await redis.keys("grafana_availability_*_logs");

    // Filter keys by namespace if specified
    if (namespaceFilter) {
      availabilityKeys = availabilityKeys.filter(key =>
        key.includes(`_${namespaceFilter}_`) ||
        key.includes(`_${namespaceFilter},`) ||
        key.includes(`,${namespaceFilter}_`) ||
        key.includes(`,${namespaceFilter},`) ||
        key.endsWith(`_${namespaceFilter}_5_logs`)
      );
      debugLog(`Filtered availability log keys by namespace '${namespaceFilter}': ${availabilityKeys.length}`);
    }

    // Filter keys by region if specified
    if (regionFilter) {
      availabilityKeys = availabilityKeys.filter(key =>
        key.includes(`_${regionFilter}_`) ||
        key.includes(`_${regionFilter},`) ||
        key.includes(`,${regionFilter}_`) ||
        key.includes(`,${regionFilter},`) ||
        key.endsWith(`_${regionFilter}_5_logs`)
      );
      debugLog(`Filtered availability log keys by region '${regionFilter}': ${availabilityKeys.length}`);
    }

    debugLog(`Found availability log keys: ${availabilityKeys.length}`);

    if (availabilityKeys.length === 0) {
      return res.json({
        namespace: namespaceFilter || null,
        region: regionFilter || null,
        count: 0,
        total: 0,
        end_datetime: datetime.toISOString(),
        end_score: endScore,
        logs: [],
      });
    }

    // Collect logs from all availability keys
    for (const key of availabilityKeys) {
      const totalEntries = await redis.zcard(key);
      debugLog(`Total entries in Redis for ${key}: ${totalEntries}`);

      if (totalEntries === 0) continue;

      // Get log entries using Unix timestamp scores, filtering entries <= endScore
      const logEntries = await redis.zrevrangebyscore(
        key,
        endScore,    // Max score (inclusive)
        '-inf',      // Min score (no lower limit)
        'LIMIT',
        0,
        limit * 2  // Get more entries to allow for sorting across all keys
      );

      debugLog(`Found ${logEntries.length} log entries for ${key} with score <= ${endScore}`);

      // Parse logs
      for (const logStr of logEntries) {
        try {
          const log = JSON.parse(logStr);
          // Get the score for this entry
          const scores = await redis.zmscore(key, logStr);
          const score = scores[0]; // zmscore returns an array of scores

          // Additional filtering by namespace in the log data if namespace filter is specified
          if (namespaceFilter && log.availabilityStatus && !log.availabilityStatus.hasOwnProperty(namespaceFilter)) {
            continue; // Skip this log entry if it doesn't contain the requested namespace
          }

          // Additional filtering by region in the log data if region filter is specified
          if (regionFilter && log.regionStatus && !log.regionStatus.hasOwnProperty(regionFilter)) {
            continue; // Skip this log entry if it doesn't contain the requested region
          }

          logs.push({
            score: Number(score), // Redis score (Unix timestamp in seconds)
            datetime: new Date(Number(score) * 1000).toISOString(), // Convert score to ISO datetime
            cacheKey: key,
            data: log,
          });
        } catch (error) {
          console.error("Error processing availability log entry:", error);
          continue;
        }
      }
    }

    // Sort logs by score in descending order (newest first)
    logs.sort((a, b) => b.score - a.score);

    // Limit to requested number of logs
    const limitedLogs = logs.slice(0, limit);

    res.json({
      namespace: namespaceFilter || null,
      region: regionFilter || null,
      count: limitedLogs.length,
      total: logs.length,
      end_datetime: datetime.toISOString(),
      end_score: endScore,
      logs: limitedLogs,
    });
  } catch (error) {
    console.error("Error fetching availability logs:", error);
    res.status(500).json({ error: "Failed to fetch availability logs", details: error.message });
  }
});

// Import the port checker
const { findAvailablePort } = require('./port-checker');

// Remove any duplicate app.listen calls and replace with this
async function startServer() {
  const preferredPort = Number(process.env.PORT) || 3000;

  try {
    const availablePort = await findAvailablePort(preferredPort);

    if (!availablePort) {
      console.error(`Could not find an available port starting from ${preferredPort}`);
      process.exit(1);
    }

    app.listen(availablePort, () => {
      console.log(
        `Server running at http://localhost:${availablePort} (Environment: ${env})`
      );

      if (availablePort !== preferredPort) {
        console.log(`Note: Using port ${availablePort} instead of preferred port ${preferredPort}`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Cache key generation function
function getCacheKey(envKey) {
  return `monitor_${envKey}`;
}

function isValidISODate(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date) && dateStr.includes("T");
}

// Start the server
startServer();
