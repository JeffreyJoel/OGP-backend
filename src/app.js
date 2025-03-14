const express = require('express');
const { PORT } = require('./config/config');
const logger = require('../utils/logger');
const apiRoutes = require('./routes/api');
const { initMQTTClient } = require('./services/mqttService');
// const { initInfluxDB } = require('./services/influxService');
const { initBlockchain } = require('./services/blockchainService');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

async function initializeServices() {
  try {
    // Initialize InfluxDB
    // await initInfluxDB();
    
    // Initialize Blockchain connection
    // await initBlockchain();
    
    // Initialize MQTT client
    await initMQTTClient();
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start the server
async function startServer() {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  // Close connections and cleanup
  process.exit(0);
});

// Start the application
startServer();

module.exports = app; // For testing purposes