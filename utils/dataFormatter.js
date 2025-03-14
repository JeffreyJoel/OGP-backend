const { ethers } = require('ethers');

/**
 * Format a string device ID to bytes32 format
 * @param {string} deviceId - The device ID to format
 * @returns {string} - The formatted bytes32 string
 */
function formatDeviceId(deviceId) {
  // Convert string to bytes32
  return ethers.encodeBytes32String(deviceId);
}

/**
 * Create a data hash from payload
 * @param {Object} payload - The data payload
 * @returns {string} - The hash as a hex string
 */
function createDataHash(payload) {
  // Create a hash of the important data fields
  return ethers.utils.solidityKeccak256(
    ['bytes32', 'uint96', 'uint64'],
    [
      formatDeviceId(payload.device_id),
      Math.floor(payload.power.power_produced * 100), // Convert to integer and scale
      Math.floor(Date.now() / 1000) // Current Unix timestamp
    ]
  );
}

/**
 * Format country code from string to number
 * @param {string} countryCode - The country code (e.g., "KE")
 * @param {Object} countryMapping - Mapping of country codes
 * @returns {number} - The numeric country code
 */
function formatCountryCode(countryCode, countryMapping) {
  return countryMapping[countryCode] || 0;
}

module.exports = {
  formatDeviceId,
  createDataHash,
  formatCountryCode
};