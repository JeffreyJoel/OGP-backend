const { getDeviceData } = require('../lib/mqtt-client');

const app = express();
const port = process.env.PORT || 3000;

// API Endpoint to retrieve cached MQTT data
app.get('/data', (req, res) => {
    const { device_id } = req.query;
  
    try {
      if (device_id) {
        const data = getDeviceData(device_id);
        return res.status(200).json(data || {});
      }
      
      const allData = getDeviceData();
      return res.status(200).json(allData);
    } catch (error) {
      console.error('API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;

