const express = require('express');
const mqtt = require('mqtt');
const Influx = require('influx');


const influx = new Influx.InfluxDB({
  host: '1b9d-105-27-122-2.ngrok-free.app', // Hostname only, without protocol
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


influx.getDatabaseNames()
  .then(names => {
    if (!names.includes('sensor_data')) {
      return influx.createDatabase('sensor_data');
    }
  })
  .catch(err => {
    console.error('Error creating InfluxDB database!', err);
  });


const brokerUrl = 'tcp://6.tcp.eu.ngrok.io:17610';
const topic = 'esp32s3/data';


const mqttDataCache = {};

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

    await influx.writePoints(dataPoints);
    console.log(`Data written to InfluxDB for device: ${device_id}`);
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

mqttClient.on('error', (err) => {
  console.error('MQTT Error:', err);
});


const app = express();
const port = process.env.PORT || 3000;

// API Endpoint to retrieve cached MQTT data
app.get('/api/data', (req, res) => {
  const deviceId = req.query.device_id;
  if (deviceId) {
    const data = mqttDataCache[deviceId] || {};
    return res.status(200).json(data);
  }
  res.status(200).json(mqttDataCache);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
