const mqtt = require('mqtt');
const logger = require('../../utils/logger');
const { MQTT_BROKER_URL, MQTT_TOPIC } = require('../config/config'); // Fixed import path
const { writeToInfluxDB } = require('./influxService');
const { queueTransaction } = require('./blockchainService');

// MQTT client
let mqttClient;

// Cache for MQTT data
const mqttDataCache = {};

// Initialize MQTT client with reconnection handling
async function initMQTTClient() {
  return new Promise((resolve, reject) => {
    try {
      mqttClient = mqtt.connect(MQTT_BROKER_URL, {
        reconnectPeriod: 5000, // Attempt reconnection every 5 seconds
        keepalive: 60,
        connectTimeout: 10 * 1000, // 10 seconds timeout
      });

      mqttClient.on('connect', () => {
        logger.info('Connected to MQTT broker');
        subscribeToTopic();
        resolve(mqttClient);
      });

      mqttClient.on('reconnect', () => {
        logger.warn('Reconnecting to MQTT broker...');
      });

      mqttClient.on('offline', () => {
        logger.warn('MQTT client is offline.');
      });

      mqttClient.on('error', (error) => {
        logger.error('MQTT connection error', { error });
        reject(error);
      });

      mqttClient.on('message', handleMQTTMessage);
      
    } catch (error) {
      logger.error('Failed to initialize MQTT client', { error });
      reject(error);
    }
  });
}

// Subscribe to MQTT topic with retry logic
function subscribeToTopic(retryCount = 0) {
  if (!mqttClient || !mqttClient.connected) {
    logger.warn('Cannot subscribe, MQTT client is not connected.');
    return;
  }

  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      logger.error(`MQTT subscription error (Attempt ${retryCount + 1}):`, err);
      if (retryCount < 3) {
        setTimeout(() => subscribeToTopic(retryCount + 1), 5000); // Retry after 5 sec
      } else {
        logger.error('Failed to subscribe to MQTT topic after multiple attempts.');
      }
    } else {
      logger.info(`Subscribed to MQTT topic: ${MQTT_TOPIC}`);
    }
  });
}

// Handle MQTT messages
async function handleMQTTMessage(topic, message) {
  try {
    let payload;
    
    // Ensure message is JSON
    try {
      payload = JSON.parse(message.toString());
    } catch (jsonError) {
      logger.error('Received malformed MQTT message', { message: message.toString(), error: jsonError });
      return;
    }

    const { device_id, country_code } = payload;
    if (!device_id || !country_code) {
      logger.error('Invalid MQTT payload: missing device_id or country_code', { payload });
      return;
    }

    // Cache the data
    mqttDataCache[device_id] = payload;

    // Store in InfluxDB
    await writeToInfluxDB(payload);

    // Submit to blockchain if power data exists
    if (payload.power && typeof payload.power.power_produced === 'number') {
      try {
        await queueTransaction(payload);
      } catch (blockchainError) {
        logger.error('Failed to queue blockchain transaction', { error: blockchainError });
      }
    }
  } catch (error) {
    logger.error('Error processing MQTT message', { error });
  }
}

// Get cached MQTT data
function getCachedData(deviceId = null) {
  return deviceId ? mqttDataCache[deviceId] || null : mqttDataCache;
}

// Publish to MQTT topic
function publishToMQTT(topic, message) {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      reject(new Error('MQTT client not connected'));
      return;
    }

    mqttClient.publish(topic, typeof message === 'string' ? message : JSON.stringify(message), (error) => {
      if (error) {
        logger.error('Error publishing to MQTT', { error });
        reject(error);
      } else {
        resolve(true);
      }
    });
  });
}

// Close MQTT connection
function closeMQTTConnection() {
  return new Promise((resolve) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.end(false, () => {
        logger.info('MQTT connection closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initMQTTClient,
  getCachedData,
  publishToMQTT,
  closeMQTTConnection
};
