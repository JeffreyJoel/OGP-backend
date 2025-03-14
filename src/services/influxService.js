const fs = require('fs');
const path = require('path');
const Influx = require('influx');
const logger = require('../../utils/logger');
const { INFLUX_HOST, INFLUX_DATABASE } = require('../config/config'); // Fix incorrect import path

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// InfluxDB schema
const influxSchema = [
  {
    measurement: 'temperature',
    fields: { sensor1: Influx.FieldType.FLOAT, sensor2: Influx.FieldType.FLOAT },
    tags: ['device_id', 'country_code']
  },
  {
    measurement: 'ldr',
    fields: { raw_value: Influx.FieldType.INTEGER, voltage: Influx.FieldType.FLOAT, intensity: Influx.FieldType.STRING },
    tags: ['device_id', 'country_code']
  },
  {
    measurement: 'current',
    fields: { power_produced_ma: Influx.FieldType.INTEGER, battery_storage_ma: Influx.FieldType.INTEGER, power_consumed_ma: Influx.FieldType.INTEGER, device_consumption_ma: Influx.FieldType.INTEGER },
    tags: ['device_id', 'country_code']
  },
  {
    measurement: 'voltage',
    fields: { power_produced_mv: Influx.FieldType.INTEGER, battery_storage_mv: Influx.FieldType.INTEGER, power_consumed_mv: Influx.FieldType.INTEGER, device_consumption_mv: Influx.FieldType.INTEGER },
    tags: ['device_id', 'country_code']
  },
  {
    measurement: 'power',
    fields: { power_produced: Influx.FieldType.FLOAT, battery_storage: Influx.FieldType.FLOAT, power_consumed: Influx.FieldType.FLOAT, device_consumption: Influx.FieldType.FLOAT },
    tags: ['device_id', 'country_code']
  },
  {
    measurement: 'generated_power',
    fields: { power_produced: Influx.FieldType.FLOAT, battery_storage: Influx.FieldType.FLOAT, power_consumed: Influx.FieldType.FLOAT, device_consumption: Influx.FieldType.FLOAT },
    tags: ['device_id', 'country_code']
  },
  {
    measurement: 'pzem',
    fields: { voltage: Influx.FieldType.FLOAT, current: Influx.FieldType.FLOAT, power: Influx.FieldType.FLOAT, energy: Influx.FieldType.FLOAT, frequency: Influx.FieldType.FLOAT, power_factor: Influx.FieldType.FLOAT },
    tags: ['device_id', 'country_code']
  }
];

// InfluxDB client
let influx = null;

// Initialize InfluxDB connection
async function initInfluxDB() {
  try {
    influx = new Influx.InfluxDB({
      host: INFLUX_HOST,
      database: INFLUX_DATABASE,
      schema: influxSchema
    });

    // Create database if it doesn't exist
    const names = await influx.getDatabaseNames();
    if (!names.includes(INFLUX_DATABASE)) {
      await influx.createDatabase(INFLUX_DATABASE);
      logger.info(`InfluxDB database '${INFLUX_DATABASE}' created`);
    }

    logger.info('InfluxDB connection established successfully');
    return influx;
  } catch (error) {
    logger.error('Failed to initialize InfluxDB', { error });
    throw error;
  }
}

// Write data points to InfluxDB
async function writeToInfluxDB(payload) {
  try {
    if (!influx) {
      throw new Error('InfluxDB client is not initialized. Call initInfluxDB() first.');
    }
    if (!payload || !payload.device_id || !payload.country_code) {
      throw new Error('Invalid payload: Missing device_id or country_code');
    }

    const { device_id, country_code } = payload;
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

    if (dataPoints.length === 0) {
      throw new Error('No valid measurements found in payload');
    }

    await influx.writePoints(dataPoints);
    logger.info(`Data written to InfluxDB for device: ${device_id}`);
    return true;
  } catch (error) {
    logger.error('Error writing to InfluxDB', { error });
    throw error;
  }
}

// Query data from InfluxDB
async function queryFromInfluxDB(measurement, deviceId, timeRange = '24h') {
  try {
    if (!influx) {
      throw new Error('InfluxDB client is not initialized. Call initInfluxDB() first.');
    }
    if (!measurement || !deviceId) {
      throw new Error('Invalid query parameters: measurement and deviceId are required');
    }

    const query = `
      SELECT * FROM ${Influx.escape.stringLit(measurement)}
      WHERE device_id = ${Influx.escape.stringLit(deviceId)}
      AND time > now() - ${Influx.escape.stringLit(timeRange)}
    `;

    const results = await influx.query(query);
    return results;
  } catch (error) {
    logger.error('Error querying InfluxDB', { error });
    throw error;
  }
}

module.exports = {
  initInfluxDB,
  writeToInfluxDB,
  queryFromInfluxDB,
  getInfluxClient: () => influx
};
