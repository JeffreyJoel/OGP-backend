const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { getCachedData } = require('../services/mqttService');
const { queryFromInfluxDB } = require('../services/influxService');
const { queueTransaction, getTransactionStatus } = require('../services/blockchainService');

// GET /api/data - Get cached data
router.get('/data', (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const data = getCachedData(deviceId);
    
    if (deviceId && !data) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    logger.error('Error retrieving data:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/historical - Get historical data
router.get('/historical', async (req, res) => {
  try {
    const { device_id, measurement, timeRange } = req.query;
    
    if (!device_id || !measurement) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const data = await queryFromInfluxDB(measurement, device_id, timeRange || '24h');
    res.status(200).json(data);
  } catch (error) {
    logger.error('Error retrieving historical data:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;