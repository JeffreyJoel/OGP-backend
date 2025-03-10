const mqtt = require('mqtt');
const { writeDataPoints } = require('./influxdb');

// In-memory cache for MQTT data
let mqttDataCache = {};

// Function to get device data
const getDeviceData = (deviceId) => {
  if (deviceId) {
    return mqttDataCache[deviceId] || null;
  }
  return mqttDataCache;
};

// This is the MQTT connection and handler logic
// Note: This will not work as a long-running process in Vercel's serverless environment
const connectMqtt = () => {
  if (typeof window !== 'undefined') {
    // Don't run on client-side
    return;
  }

  const brokerUrl = process.env.MQTT_BROKER_URL;
  const topic = process.env.MQTT_TOPIC || 'esp32s3/data';

  const mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error('Subscription error:', err);
      } else {
        console.log(`Subscribed to topic: ${topic}`);
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const { device_id, country_code } = payload;

      if (!device_id || !country_code) {
        console.error('Invalid JSON format: missing device_id or country_code', payload);
        return;
      }

      mqttDataCache[device_id] = payload;

      const dataPoints = [];
      for (const key of ['temperature', 'ldr', 'current', 'voltage', 'power', 'generated_power', 'pzem']) {
        if (payload[key]) {
          dataPoints.push({
            measurement: key,
            tags: { device_id, country_code },
            fields: payload[key]
          });
        }
      }

      await writeDataPoints(dataPoints);
      console.log(`Data written to InfluxDB for device: ${device_id}`);
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
  });

  return mqttClient;
};

// Don't try to connect during build time
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_BUILD) {
  // Note: This won't work with Vercel's serverless model
  // See step 5 below for alternatives
}

module.exports = {
  getDeviceData,
  connectMqtt
};