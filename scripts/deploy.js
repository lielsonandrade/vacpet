const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deploy do VacPet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📬 Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Saldo:", ethers.formatEther(balance), "ETH\n");

  const VacPet = await ethers.getContractFactory("VacPet");
  console.log("⏳ Fazendo deploy...");

  const contract = await VacPet.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("\n✅ Contrato deployado com sucesso!");
  console.log("📍 Endereço:", address);
  console.log("🔗 Etherscan: https://sepolia.etherscan.io/address/" + address);
  console.log("\n📝 Próximo passo:");
  console.log(`   Cole este endereço no frontend/index.html na variável CONTRACT_ADDRESS`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
