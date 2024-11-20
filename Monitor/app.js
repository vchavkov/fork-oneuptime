const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config(); // Load environment variables

const app = express();
const port = process.env.PORT || 4010;
const cache = new NodeCache({ stdTTL: process.env.STD_TTL }); // Cache duration in seconds

const url = 'https://checkmk-eu-central-1.cbsinternal.net/cbs_eu_central_1/check_mk/api/1.0///domain-types/bi_aggregation/actions/aggregation_state/invoke';
// Basic Auth credentials
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');

const shouldCacheData = process.env.CACHE_FETCH_DATA === 'true'; // Read the cache boolean

// Middleware to hide Express response header
function hidePoweredBy(req, res, next) {
    res.removeHeader('X-Powered-By');
    next();
}

app.use(hidePoweredBy);

// Endpoint to fetch and cache data
app.get('/fetch-data', async (req, res) => {
    if (shouldCacheData && cache.has('apiData')) {
        console.log('Serving from cache');
        return res.json(cache.get('apiData'));
    }
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${token}`
        };
        const requestBody = {
            "filter_groups": ["Service Management Platform"]
        };
        const response = await axios.post(url, requestBody, { headers });
        const data = response.data.aggregations;

        // console.log('Response data:', JSON.stringify(response.data, null, 2));

        if (shouldCacheData) {
            // Store the data in the cache
            cache.set('apiData', data);
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching data' });
    }
});

// Helper function to extract specific error outputs
function extractErrorOutput(infos) {
    let output = '';
    const extract = (item) => {
        if (Array.isArray(item)) {
            item.forEach(extract);
        } else if (item.error && item.error.output) {
            output += `${item.error.output}; `;
        } else if (item && typeof item === 'object') {
            Object.values(item).forEach(extract);
        }
    };
    if (infos) {
        extract(infos);
    }
    return output.trim();
}

// Endpoint to get the cached data for a specific service
app.get('/service-info/:service', async (req, res) => {
    const serviceKey = req.params.service;
    const service = `Services ${serviceKey}`;
    let data = cache.get('apiData');

    if (!data) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${token}`
            };
            const requestBody = {
                "filter_groups": ["Service Management Platform"]
            };
            const response = await axios.post(url, requestBody, { headers });
            data = response.data.aggregations;

            if (shouldCacheData) {
                // Store the data in the cache
                cache.set('apiData', data);
            }
        } catch (error) {
            return res.status(500).json({ error: 'Error fetching data' });
        }
    }

    const serviceData = data[service];
    if (serviceData) {
        const { state, output, in_downtime, hosts, infos } = serviceData;
        const failureCause = extractErrorOutput(infos);
        const result = {
            service: serviceKey,
            hosts,
            state,
            output,
            in_downtime,
            failureCause
        };
        return res.json(result);
    }
    res.status(404).json({ error: 'No data in cache for the specified service' });
});

// Additional endpoints...
// Same pattern applies for the other endpoints where you fetch data and optionally cache it.

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
