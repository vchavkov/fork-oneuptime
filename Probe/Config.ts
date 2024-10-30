import URL from "Common/Types/API/URL";
import ObjectID from "Common/Types/ObjectID";
import logger from "Common/Server/Utils/Logger";

if (!process.env["INGESTOR_URL"] && !process.env["ONEUPTIME_URL"]) {
  logger.error("INGESTOR_URL or ONEUPTIME_URL is not set");
  process.exit();
}

export let INGESTOR_URL: URL = URL.fromString(
  process.env["ONEUPTIME_URL"] ||
    process.env["INGESTOR_URL"] ||
    "https://uptime.cbsretail.net",
);

// If probe api does not have the path. Add it.
if (
  !INGESTOR_URL.toString().endsWith("ingestor") &&
  !INGESTOR_URL.toString().endsWith("ingestor/")
) {
  INGESTOR_URL = URL.fromString(INGESTOR_URL.addRoute("/ingestor").toString());
}

export const PROBE_NAME: string | null = process.env["PROBE_NAME"] || null;

export const PROBE_DESCRIPTION: string | null =
  process.env["PROBE_DESCRIPTION"] || null;

export const PROBE_ID: ObjectID | null = process.env["PROBE_ID"]
  ? new ObjectID(process.env["PROBE_ID"])
  : null;

if (!process.env["PROBE_KEY"]) {
  logger.error("PROBE_KEY is not set");
  process.exit();
}

export const PROBE_KEY: string = process.env["PROBE_KEY"];

let probeMonitoringWorkers: string | number =
  process.env["PROBE_MONITORING_WORKERS"] || 1;

if (typeof probeMonitoringWorkers === "string") {
  probeMonitoringWorkers = parseInt(probeMonitoringWorkers);
}

export const PROBE_MONITORING_WORKERS: number = probeMonitoringWorkers;

let monitorFetchLimit: string | number =
  process.env["PROBE_MONITOR_FETCH_LIMIT"] || 10;

if (typeof monitorFetchLimit === "string") {
  monitorFetchLimit = parseInt(monitorFetchLimit);
}

export const PROBE_MONITOR_FETCH_LIMIT: number = monitorFetchLimit;

export const HOSTNAME: string = process.env["HOSTNAME"] || "localhost";

export const PROBE_SYNTHETIC_MONITOR_SCRIPT_TIMEOUT_IN_MS: number = process.env[
  "PROBE_SYNTHETIC_MONITOR_SCRIPT_TIMEOUT_IN_MS"
]
  ? parseInt(
      process.env["PROBE_SYNTHETIC_MONITOR_SCRIPT_TIMEOUT_IN_MS"].toString(),
    )
  : 60000;

export const PROBE_CUSTOM_CODE_MONITOR_SCRIPT_TIMEOUT_IN_MS: number = process
  .env["PROBE_CUSTOM_CODE_MONITOR_SCRIPT_TIMEOUT_IN_MS"]
  ? parseInt(
      process.env["PROBE_CUSTOM_CODE_MONITOR_SCRIPT_TIMEOUT_IN_MS"].toString(),
    )
  : 60000;
