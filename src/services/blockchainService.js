const { ethers } = require('ethers');
const logger = require('../../utils/logger.js');
const { 
  ETHEREUM_RPC_URL, 
  CONTRACT_ADDRESS, 
  PRIVATE_KEY, 
  COUNTRY_CODES
} = require('../config/config');
const { formatDeviceId, createDataHash } = require('../../utils/dataFormatter');
const contractABI  = require("../config/abi.json");
// const { getCachedData } = require('./mqttService');

const payload = {"tfduyasjgfhsjb":{"temperature":{"sensor1":20.584074020385742,"sensor2":20.9986457824707},"ldr":{"raw_value":908,"voltage":0.7299858927726746,"intensity":"bright"},"current":{"power_produced_ma":56.7964210510254,"battery_storage_ma":71.5644073486328,"power_consumed_ma":22.260744094848633,"device_consumption_ma":55.277992248535156},"voltage":{"power_produced_mv":155.28636169433594,"battery_storage_mv":3990.033935546875,"power_consumed_mv":863.024169921875,"device_consumption_mv":3101.96044921875},"power":{"power_produced":8.81970977783203,"battery_storage":285.5444030761719,"power_consumed":19.2115592956543,"device_consumption":171.4701385498047},"generated_power":{"power_produced":0,"battery_storage":0,"power_consumed":0,"device_consumption":0},"pzem":{"voltage":234.04164123535156,"current":7.951252460479736,"power":1860.9241943359375,"energy":0,"frequency":50.6001319885254,"power_factor":0.8321346640586853},"country_code":"KE","wallet_address":"0x1234567890","device_id":"tfduyasjgfhsjb","hash":"6c26d41b73035bfe811747e8a2c57c1fa1ae98ebb401220a6e2f143f04bd28a7"}}



let provider, wallet, contract;

// Initialize blockchain connection
async function initBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

    const network = await provider.getNetwork();
    logger.info(`Connected to blockchain network: ${network.name} (chainId: ${network.chainId})`);

    const balance = await provider.getBalance(wallet.address);
    logger.info(`Wallet ${wallet.address} initialized with balance: ${ethers.formatEther(balance)} ETH`);

    startAutoSubmission(); // Start periodic submission
  } catch (error) {
    logger.error('Failed to initialize blockchain connection:', error);
    throw error;
  }
}

// Periodically fetch MQTT data and submit it to the blockchain
function startAutoSubmission() {
  setInterval(async () => {
    try {
    //   const allDevicesData = getCachedData(); // Fetch latest MQTT data
    //   for (const [deviceId, data] of Object.entries(allDevicesData)) {
        await submitToBlockchain(payload);
    //   }
    } catch (error) {
      logger.error('Error during scheduled blockchain submission:', error);
    }
  }, 0.5 * 60 * 1000); // Run every 10 minutes
}

// Submit data to blockchain
async function submitToBlockchain(payload) {
  try {
    const deviceId = formatDeviceId(payload.device_id);
    const minerWallet = payload.wallet_address;
    const kwhConsumption = Math.floor(payload.power.power_produced * 100);
    const timestamp = Math.floor(Date.now() / 1000);
    const numericCountryCode = COUNTRY_CODES[payload.country_code] || 0;
    const dataHash = payload.hash;

    if (numericCountryCode === 0) {
      throw new Error(`Unsupported country code: ${payload.country_code}`);
    }

    logger.info(`Submitting to blockchain for device: ${payload.device_id}`);
    logger.debug({
      deviceId,
      minerWallet,
      kwhConsumption,
      timestamp,
      countryCode: numericCountryCode,
      dataHash
    });

    const tx = await contract.submitPowerReading(
      deviceId,
      minerWallet,
      kwhConsumption,
      timestamp,
      numericCountryCode,
      dataHash,
      { gasLimit: 300000 }
    );

    logger.info(`Transaction submitted! Hash: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    logger.error('Error submitting to blockchain:', error);
  }
}

module.exports = {
  initBlockchain
};
