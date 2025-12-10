const net = require('net');

/**
 * Checks if a port is available
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - Returns true if port is available, false if not
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use
        resolve(false);
      } else {
        // Some other error occurred
        console.error('Port check error:', err);
        resolve(false);
      }
    });

    server.once('listening', () => {
      // Port is available, close the server
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port);
  });
}

/**
 * Finds an available port starting from the given port
 * @param {number} startPort - The port to start checking from
 * @param {number} [maxTries=10] - Maximum number of consecutive ports to check
 * @returns {Promise<number|null>} - Returns available port or null if none found
 */
async function findAvailablePort(startPort, maxTries = 10) {
  for (let i = 0; i < maxTries; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);

    if (available) {
      return port;
    }
  }
  return null; // No available port found
}

module.exports = { isPortAvailable, findAvailablePort };
