const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration object
const config = {
  // Server configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // MQTT configuration
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'tcp://6.tcp.eu.ngrok.io:17610',
  MQTT_TOPIC: process.env.MQTT_TOPIC || 'esp32s3/data',
  
  // InfluxDB configuration
  INFLUX_HOST: process.env.INFLUX_HOST || '1b9d-105-27-122-2.ngrok-free.app',
  INFLUX_DATABASE: process.env.INFLUX_DATABASE || 'sensor_data',
  
  // Blockchain configuration
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'https://rpc.sepolia-api.lisk.com',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  DEFAULT_MINER_WALLET: process.env.DEFAULT_MINER_WALLET,
  
  // Country code mappings
  COUNTRY_CODES: {
    'NG': 234, // Nigeria
    'KE': 254, // Kenya
    'ZA': 27,  // South Africa
    // Add more as needed
  }
};

// Validate required configuration
function validateConfig() {
  const required = ['CONTRACT_ADDRESS', 'PRIVATE_KEY', 'DEFAULT_MINER_WALLET'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Try to validate but don't crash in development
try {
  validateConfig();
} catch (error) {
  if (config.NODE_ENV === 'production') {
    throw error;
  } else {
    console.warn('WARNING:', error.message);
    console.warn('Some features may not work correctly.');
  }
}

module.exports = config;