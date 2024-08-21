const { ethers, upgrades } = require("hardhat");
// const { tokenAddress, treasuryWallet, feeWallet } = require("./data");
const { tokenAddress, feeWallet } = require("./data");
const hre = require("hardhat");
async function main() {

  const AssetManagerAccess = ethers.keccak256(
    ethers.toUtf8Bytes("ASSET_MANAGER")
  );

  const AssetFactory = await ethers.getContractFactory("BaseAsset");
  const asset = await AssetFactory.deploy(
    "VoyRealWorldAssets",
    "VRWA",
    "1.0",
    "https://voy.finance/"
  );
  await asset.waitForDeployment();

  console.log({ baseAsset: await asset.getAddress() });

  const TokenFactory = await ethers.getContractFactory("MockERC20");
  const token = TokenFactory.attach(tokenAddress);

  console.log({ mockedErc20token: await token.getAddress() });

  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(100, 200, feeWallet);
  await feeManager.waitForDeployment();

  console.log({ feeManager: await feeManager.getAddress() });
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await upgrades.deployProxy(Marketplace, [
    await asset.getAddress(),
    await feeManager.getAddress(),
  ]);
  await marketplace.waitForDeployment();

  console.log({ marketplace: await marketplace.getAddress() });

  const WrapperFactory = await ethers.getContractFactory("WrappedAsset");
  const wrapperAsset = await WrapperFactory.deploy(await asset.getAddress());
  await wrapperAsset.waitForDeployment();
  const baseAssetAddress = await asset.getAddress();
  const wrapperAssetAddress = await wrapperAsset.getAddress();
  const marketplaceAddress = await marketplace.getAddress();
  const feeManagerAddress = await feeManager.getAddress();

  console.log({ wrappedAsset: await wrapperAsset.getAddress() });

  await token.approve(marketplaceAddress, ethers.MaxUint256);

  await asset.grantRole(AssetManagerAccess, marketplaceAddress);
  await asset.grantRole(AssetManagerAccess, wrapperAssetAddress);

  await asset.setApprovalForAll(marketplaceAddress, true);

  // base asset confirmation
  await hre.run("verify:verify", {
    address: baseAssetAddress,
    constructorArguments: [
      "VoyRealWorldAssets",
      "VRWA",
      "1.0",
      "https://voy.finance/",
    ],
  });

  // wrapped asset confirmation
  await hre.run("verify:verify", {
    address: wrapperAssetAddress,
    constructorArguments: [baseAssetAddress],
  });

  // marketplace confirmation
  await hre.run("verify:verify", {
    address: marketplaceAddress,
    constructorArguments: [],
  });

  // Fee Manager confirmation
  await hre.run("verify:verify", {
    address: feeManagerAddress,
    constructorArguments: [100, 200, feeWallet],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  throw new Error(error);
});
