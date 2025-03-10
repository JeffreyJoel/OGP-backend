const Influx = require('influx');

const influx = new Influx.InfluxDB({
  host: process.env.INFLUXDB_HOST,
  database: 'sensor_data',
  schema: [
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
  ]
});

const initDatabase = async () => {
  try {
    const names = await influx.getDatabaseNames();
    if (!names.includes('sensor_data')) {
      await influx.createDatabase('sensor_data');
      console.log('InfluxDB database created');
    }
  } catch (err) {
    console.error('Error creating InfluxDB database:', err);
  }
};

const writeDataPoints = async (dataPoints) => {
  try {
    await influx.writePoints(dataPoints);
    return true;
  } catch (error) {
    console.error('Error writing to InfluxDB:', error);
    return false;
  }
};

module.exports = {
  influx,
  initDatabase,
  writeDataPoints
};