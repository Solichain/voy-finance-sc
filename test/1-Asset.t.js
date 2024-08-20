const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { AssetManagerAccess } = require("./helpers/data.spec");

describe("Asset", function () {
  let assetContract;
  let deployer;
  let assetManager;
  let user;

  beforeEach(async () => {
    [deployer, assetManager, user] = await ethers.getSigners();

    const AssetFactory = await ethers.getContractFactory("BaseAsset");
    assetContract = await AssetFactory.deploy(
      "Voy Asset Collection",
      "VAC",
      "1.0",
      "https://ipfs.io/ipfs"
    );

    await assetContract.waitForDeployment();

    await assetContract.grantRole(AssetManagerAccess, deployer.getAddress());
  });

  it("Should revert on creating asset by invalid caller", async function () {
    await expect(
      assetContract
        .connect(user)
        .createAsset(deployer.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role ${AssetManagerAccess}`
    );
  });

  it("Should revert on burning asset by invalid caller", async function () {
    assetContract
      .connect(deployer)
      .createAsset(deployer.getAddress(), 1, 1, 10000);

    await expect(
      assetContract
        .connect(user)
        .createAsset(deployer.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role ${AssetManagerAccess}`
    );
  });

  it("Should revert on burning asset by invalid caller", async function () {
    await expect(
      assetContract.connect(user).burnAsset(user.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role ${AssetManagerAccess}`
    );
  });

  it("Should to set new base uri", async function () {
    await assetContract
      .connect(deployer)
      .grantRole(AssetManagerAccess, assetManager);

    await expect(
      assetContract.connect(assetManager).setBaseURI(1, "https://ipfs2.io/ipfs")
    ).to.not.be.reverted;
  });

  it("Should revert to set new base uri by invalid caller", async function () {
    await expect(
      assetContract.connect(user).setBaseURI(1, "https://ipfs2.io/ipfs")
    ).to.be.reverted;

    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: "https://rpc.ankr.com/eth",
            blockNumber: 18314577,
          },
        },
      ],
    });
  });

  it("Should create asset and burn", async function () {
    await expect(
      await assetContract
        .connect(deployer)
        .createAsset(await user.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;
    await expect(
      await assetContract
        .connect(deployer)
        .burnAsset(await user.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;
  });
});
