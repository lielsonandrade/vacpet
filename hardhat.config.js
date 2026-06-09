require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

// Valida se a PRIVATE_KEY tem exatamente 32 bytes (64 hex chars, com ou sem "0x")
const rawKey = process.env.PRIVATE_KEY || "";
const cleanKey = rawKey.startsWith("0x") ? rawKey.slice(2) : rawKey;
const validKey = cleanKey.length === 64 ? [`0x${cleanKey}`] : [];

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: validKey,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};