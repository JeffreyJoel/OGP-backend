const { getDeviceData } = require('../lib/mqtt-client');

module.exports = async (req, res) => {
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
};