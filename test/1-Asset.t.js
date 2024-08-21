const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { AssetManagerAccess } = require("./helpers/data.spec");

describe("Asset", function () {
  let assetContract;
  let deployer;
  let assetManager;
  let user1;
  let user2;
  let user3;

  beforeEach(async () => {
    [deployer, assetManager, user1, user2, user3] = await ethers.getSigners();

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
        .connect(user1)
        .createAsset(deployer.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user1.getAddress()
      ).toLowerCase()} is missing role ${AssetManagerAccess}`
    );
  });

  it("Should revert on burning asset by invalid caller", async function () {
    assetContract
      .connect(deployer)
      .createAsset(deployer.getAddress(), 1, 1, 10000);

    await expect(
      assetContract
        .connect(user1)
        .createAsset(deployer.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user1.getAddress()
      ).toLowerCase()} is missing role ${AssetManagerAccess}`
    );
  });

  it("Should revert on burning asset by invalid caller", async function () {
    await expect(
      assetContract.connect(user1).burnAsset(user1.getAddress(), 1, 1, 10000)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user1.getAddress()
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
      assetContract.connect(user1).setBaseURI(1, "https://ipfs2.io/ipfs")
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

  it("Should create and burn asset", async function () {
    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user1.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .burnAsset(await user1.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;
  });

  it("Should create asset, get shareholders info and asset owners info", async function () {
    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user1.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    const ownerAssets = await assetContract
      .connect(deployer)
      .getOwnerAssets(await user1.getAddress());

    expect(ownerAssets[0][0]).to.eq(1);
    expect(ownerAssets[0][1]).to.eq(1);

    const shareholders = await assetContract
      .connect(deployer)
      .getShareholdersInfo(1, 1);

    expect(shareholders[0]).to.eq(await user1.getAddress());
  });

  it("Should create multi assets for multi user, get shareholders info and asset owners info", async function () {
    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user1.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user2.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user2.getAddress(), 1, 2, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user1.getAddress(), 2, 1, 1)
    ).not.to.be.reverted;

    const owner1Assets = await assetContract
      .connect(deployer)
      .getOwnerAssets(await user1.getAddress());

    const owner2Assets = await assetContract
      .connect(deployer)
      .getOwnerAssets(await user2.getAddress());

    expect(owner1Assets[0][0]).to.eq(1);
    expect(owner1Assets[0][1]).to.eq(1);
    expect(owner1Assets[1][0]).to.eq(2);
    expect(owner1Assets[1][1]).to.eq(1);

    expect(owner2Assets[0][0]).to.eq(1);
    expect(owner2Assets[0][1]).to.eq(1);
    expect(owner2Assets[1][0]).to.eq(1);
    expect(owner2Assets[1][1]).to.eq(2);

    const shareholders1 = await assetContract
      .connect(deployer)
      .getShareholdersInfo(1, 1);

    const shareholders2 = await assetContract
      .connect(deployer)
      .getShareholdersInfo(1, 2);

    const shareholders3 = await assetContract
      .connect(deployer)
      .getShareholdersInfo(2, 1);

    expect(shareholders1[0]).to.eq(await user1.getAddress());
    expect(shareholders1[1]).to.eq(await user2.getAddress());

    expect(shareholders2[0]).to.eq(await user2.getAddress());

    expect(shareholders3[0]).to.eq(await user1.getAddress());
  });

  it(`Should create multi asset for multi user, burn some, delete shareholders 
      and get shareholders info and asset owners info`, async function () {
    // Asset Creation
    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user1.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user2.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user2.getAddress(), 2, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user2.getAddress(), 3, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .createAsset(await user3.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    // Asset Burning
    await expect(
      assetContract
        .connect(deployer)
        .burnAsset(await user2.getAddress(), 1, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .deleteShareholderInfo(await user2.getAddress(), 1, 1, 1, 0)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .burnAsset(await user2.getAddress(), 2, 1, 1)
    ).not.to.be.reverted;

    await expect(
      assetContract
        .connect(deployer)
        .deleteShareholderInfo(await user2.getAddress(), 2, 1, 0, 1)
    ).not.to.be.reverted;

    // Check deleting asset with multi shareholders of an owner who has different assets
    const ownerAssets = await assetContract
      .connect(deployer)
      .getOwnerAssets(await user2.getAddress());

    expect(ownerAssets[0][0]).to.eq(0);
    expect(ownerAssets[0][1]).to.eq(0);
    expect(ownerAssets[1][0]).to.eq(0);
    expect(ownerAssets[1][1]).to.eq(0);
    expect(ownerAssets[2][0]).to.eq(3);
    expect(ownerAssets[2][1]).to.eq(1);

    const shareholdersForFirstAsset = await assetContract
      .connect(deployer)
      .getShareholdersInfo(1, 1);

    const shareholdersForSecondAsset = await assetContract
      .connect(deployer)
      .getShareholdersInfo(2, 1);

    expect(shareholdersForFirstAsset[0]).to.eq(await user1.getAddress());
    expect(shareholdersForFirstAsset[1]).to.eq(ethers.ZeroAddress);
    expect(shareholdersForFirstAsset[2]).to.eq(await user3.getAddress());

    expect(shareholdersForSecondAsset[0]).to.eq(ethers.ZeroAddress);
  });
});
