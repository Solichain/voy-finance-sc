const { expect } = require("chai");
const { network, ethers } = require("hardhat");
const { AssetManagerAccess } = require("./helpers/data.spec");
const {
  Sand1155,
  Ens721,
  Erc20,
  Ens721Signer,
  Erc20Signer,
  Sand1155Signer,
} = require("./helpers/addresses.spec");

const { EnsTokenId, SandTokenId } = require("./helpers/data.spec");
const chainId = network.config.chainId;

const getSigner = async (address) => {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.provider.getSigner(address);
};

const resetFork = async () => {
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
};

const getId = async (contract) => {
  return BigInt(
    ethers.solidityPackedKeccak256(
      ["uint256", "address"],
      [chainId, await contract.getAddress()]
    )
  );
};

describe("Wrapper Contract", function () {
  let assetContract;
  let wrapperContract;
  let user1;
  let signer20;
  let signer721;
  let signer1155;
  let erc20;
  let erc721;
  let erc1155;

  beforeEach(async () => {
    [, user1] = await ethers.getSigners();
    signer20 = await getSigner(Erc20Signer);
    signer721 = await getSigner(Ens721Signer);
    signer1155 = await getSigner(Sand1155Signer);

    erc20 = await ethers.getContractAt("IERC20", Erc20);

    erc721 = await ethers.getContractAt("IERC721", Ens721);

    erc1155 = await ethers.getContractAt("IERC1155", Sand1155);

    const AssetFactory = await ethers.getContractFactory("BaseAsset");
    assetContract = await AssetFactory.deploy(
      "Voy Asset Collection",
      "VAC",
      "1.0",
      "https://ipfs.io/ipfs"
    );
    await assetContract.waitForDeployment();

    wrapperContract = await (
      await ethers.getContractFactory("WrappedAsset")
    ).deploy(await assetContract.getAddress());

    await wrapperContract.whitelist(Erc20, true);
    await wrapperContract.whitelist(Ens721, true);
    await wrapperContract.whitelist(Sand1155, true);
    await assetContract.grantRole(
      AssetManagerAccess,
      wrapperContract.getAddress()
    );
  });

  it("Should revert to deploy with wrong asset contract address", async function () {
    await expect(
      (
        await ethers.getContractFactory("WrappedAsset")
      ).deploy(ethers.ZeroAddress)
    ).to.be.reverted;
  });

  it("Should revert on whitelist by invalid caller", async function () {
    await expect(
      wrapperContract.connect(user1).whitelist(Ens721, true)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user1.getAddress()
      ).toLowerCase()} is missing role ${ethers.zeroPadValue(
        ethers.toBeHex(0),
        32
      )}`
    );
  });

  it("Should revert on emergency unwrap erc20 by invalid caller", async function () {
    const mainId = await getId(erc20);
    await expect(
      wrapperContract
        .connect(user1)
        .emergencyUnwrapERC20(await user1.getAddress(), mainId, 10)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user1.getAddress()
      ).toLowerCase()} is missing role ${ethers.zeroPadValue(
        ethers.toBeHex(0),
        32
      )}`
    );
  });

  it("Should revert on emergency unwrap erc721 by invalid caller", async function () {
    const mainId = await getId(erc721);
    await expect(
      wrapperContract
        .connect(user1)
        .emergencyUnwrapERC721(await user1.getAddress(), mainId, 1)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user1.getAddress()
      ).toLowerCase()} is missing role ${ethers.zeroPadValue(
        ethers.toBeHex(0),
        32
      )}`
    );
  });

  it("Should revert on emergency unwrap erc1155 by invalid caller", async function () {
    const mainId = await getId(erc1155);
    await expect(
      wrapperContract
        .connect(user1)
        .emergencyUnwrapERC1155(await user1.getAddress(), mainId, 1, 10)
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user1.getAddress()
      ).toLowerCase()} is missing role ${ethers.zeroPadValue(
        ethers.toBeHex(0),
        32
      )}`
    );
  });

  it("Should revert on whitelist with invalid address", async function () {
    await expect(wrapperContract.whitelist(ethers.ZeroAddress, true)).to.be
      .reverted;
  });

  it("Should whitelist ERC20 address", async function () {
    await wrapperContract.whitelist(Erc20, true);
  });

  it("Should whitelist ERC721 address", async function () {
    await wrapperContract.whitelist(Ens721, true);
  });

  it("Should whitelist ERC1155 address", async function () {
    await wrapperContract.whitelist(Sand1155, true);
  });

  it("Should revert to wrap erc20 if there is not enough balance", async function () {
    await expect(wrapperContract.wrapERC20(Erc20, ethers.MaxUint256)).to.be
      .reverted;
  });

  it("Should revert to wrap erc20 contract address is not whitelisted", async function () {
    await expect(
      wrapperContract.wrapERC20(ethers.ZeroAddress, ethers.MaxUint256)
    ).to.be.reverted;
  });

  it("Should wrap erc20 token and get info", async function () {
    const id = await getId(erc20);
    const value = ethers.parseUnits("1000", 6);

    await erc20
      .connect(signer20)
      .approve(await wrapperContract.getAddress(), value);

    await wrapperContract.connect(signer20).wrapERC20(Erc20, value);

    expect(
      await assetContract.subBalanceOf(signer20.getAddress(), id, 0)
    ).to.be.eq(value);

    expect(await erc20.balanceOf(await wrapperContract.getAddress())).to.be.eq(
      value
    );

    const info = await wrapperContract.getWrappedInfo(id);

    expect(info[0]).to.be.eq(Erc20);
    expect(info[1][0]).to.be.eq(BigInt(0));
    expect(info[2][0]).to.be.eq(value);
    expect(info[3][0]).to.be.eq(value);
  });

  it("Should wrap erc20 token twice and increase owner balance", async function () {
    const id = await getId(erc20);
    const value = ethers.parseUnits("1000", 6);
    const newBalance = ethers.parseUnits("2000", 6);

    await erc20
      .connect(signer20)
      .approve(await wrapperContract.getAddress(), value);

    await wrapperContract.connect(signer20).wrapERC20(Erc20, value);
    await erc20
      .connect(signer20)
      .approve(await wrapperContract.getAddress(), value);

    await wrapperContract.connect(signer20).wrapERC20(Erc20, value);

    expect(
      await assetContract.subBalanceOf(signer20.getAddress(), id, 0)
    ).to.be.eq(newBalance);

    expect(await erc20.balanceOf(await wrapperContract.getAddress())).to.be.eq(
      newBalance
    );

    const info = await wrapperContract.getWrappedInfo(id);

    expect(info[0]).to.be.eq(Erc20);
    expect(info[1][0]).to.be.eq(BigInt(0));
    expect(info[2][0]).to.be.eq(newBalance);
    expect(info[3][0]).to.be.eq(newBalance);

    await resetFork();
  });

  it("Should revert to unwrap erc20 token if no enough balance", async function () {
    const id = await getId(erc20);
    const value = ethers.parseUnits("1000", 6);
    const unwrapAmount = ethers.parseUnits("1001", 6);

    await erc20
      .connect(signer20)
      .approve(await wrapperContract.getAddress(), ethers.MaxUint256);
    await wrapperContract.connect(signer20).wrapERC20(Erc20, value);
    await expect(
      wrapperContract.connect(signer20).unwrapERC20(id, unwrapAmount)
    ).to.be.reverted;
    await assetContract
      .connect(signer20)
      .transferFrom(signer20.getAddress(), user1.getAddress(), id, 0, 1);

    await expect(wrapperContract.connect(signer20).unwrapERC20(id, value)).to.be
      .reverted;

    await resetFork();
  });

  it("Should unwrap erc20 token", async function () {
    const id = await getId(erc20);
    const value = ethers.parseUnits("1000", 6);

    await erc20
      .connect(signer20)
      .approve(await wrapperContract.getAddress(), ethers.MaxUint256);
    await wrapperContract.connect(signer20).wrapERC20(Erc20, value);

    const beforeUnwrapBalance = await erc20.balanceOf(
      await signer20.getAddress()
    );
    await wrapperContract.connect(signer20).unwrapERC20(id, value);
    const afterUnwrapBalance = await erc20.balanceOf(
      await signer20.getAddress()
    );

    expect(await assetContract.totalSubSupply(id, 0)).to.be.eq(0);

    expect(afterUnwrapBalance - beforeUnwrapBalance).to.be.eq(value);

    await resetFork();
  });

  // it("Should emergency unwrap erc20 token without complete ownership", async function () {
  //   const id = await getId(erc20);
  //   const value = ethers.parseUnits("1000", 6);

  //   await erc20
  //     .connect(signer20)
  //     .approve(await wrapperContract.getAddress(), ethers.MaxUint256);
  //   await wrapperContract.connect(signer20).wrapERC20(Erc20, value);
  //   await assetContract
  //     .connect(signer20)
  //     .transferFrom(signer20.getAddress(), user1.getAddress(), id, 0, 9999);

  //   const beforeUnwrapBalance = await erc20.balanceOf(
  //     await signer20.getAddress()
  //   );
  //   await wrapperContract.emergencyUnwrapERC20(id, await signer20.getAddress(), );
  //   const afterUnwrapBalance = await erc20.balanceOf(
  //     await signer20.getAddress()
  //   );

  //   expect(
  //     await assetContract.subBalanceOf(await signer20.getAddress(), id, 1)
  //   ).to.be.eq(0);

  //   expect(afterUnwrapBalance - beforeUnwrapBalance).to.be.eq(value);

  //   await resetFork();
  // });

  it("Should revert batch wrap erc20 token without array parity", async function () {
    const value = ethers.parseUnits("1000", 6);

    await expect(
      wrapperContract.connect(signer20).batchWrapERC20([Erc20], [value, value])
    ).to.be.reverted;

    await expect(
      wrapperContract
        .connect(signer20)
        .batchWrapERC20([Erc20, Erc20], [value, value])
    ).to.be.reverted;
  });

  it("Should revert wrap erc20 token with zero balance", async function () {
    await expect(wrapperContract.connect(user1).wrapERC20(Erc20, 10000)).to.be
      .reverted;
  });

  it("Should revert wrap erc20 token with no approval for wrapper over token", async function () {
    await expect(wrapperContract.connect(signer20).wrapERC20(Erc20, 10000)).to
      .be.reverted;
  });

  it("Should batch wrap erc20 token", async function () {
    const id = await getId(erc20);

    const value = ethers.parseUnits("1000", 6);

    await erc20
      .connect(signer20)
      .approve(await wrapperContract.getAddress(), ethers.MaxUint256);
    await wrapperContract.connect(signer20).batchWrapERC20([Erc20], [value]);

    expect(
      await assetContract.subBalanceOf(signer20.getAddress(), id, 0)
    ).to.be.eq(value);

    expect(await erc20.balanceOf(await wrapperContract.getAddress())).to.be.eq(
      value
    );
    await resetFork();
  });

  it("Should revert to wrap erc721 if not owner", async function () {
    await expect(wrapperContract.wrapERC721(Ens721, EnsTokenId, 10000)).to.be
      .reverted;
  });

  it("Should revert to wrap erc721 contract address is not whitelisted", async function () {
    await expect(
      wrapperContract.wrapERC721(ethers.ZeroAddress, EnsTokenId, 10000)
    ).to.be.reverted;
  });

  it("Should revert to wrap erc721 contract address is not IERC721", async function () {
    await expect(wrapperContract.wrapERC721(Erc20, EnsTokenId, 10000)).to.be
      .reverted;
  });

  it("Should wrap erc721 token and get info", async function () {
    const id = await getId(erc721);

    await erc721
      .connect(signer721)
      .setApprovalForAll(await wrapperContract.getAddress(), true);
    await wrapperContract
      .connect(signer721)
      .wrapERC721(Ens721, EnsTokenId, 10000);

    expect(
      await assetContract.subBalanceOf(signer721.getAddress(), id, EnsTokenId)
    ).to.be.eq(10000);

    expect(await erc721.ownerOf(EnsTokenId)).to.be.eq(
      await wrapperContract.getAddress()
    );

    const info = await wrapperContract.getWrappedInfo(id);
    expect(info[0]).to.be.eq(Ens721);
    expect(info[1][0]).to.be.eq(EnsTokenId);
    expect(info[2][0]).to.be.eq(10000);
    expect(info[3][0]).to.be.eq(10000);

    await resetFork();
  });

  it("Should revert to wrap erc721 token twice", async function () {
    const id = await getId(erc721);
    await assetContract.grantRole(
      AssetManagerAccess,
      await signer721.getAddress()
    );
    await assetContract
      .connect(signer721)
      .createAsset(signer721.getAddress(), id, EnsTokenId, 10000);

    await erc721
      .connect(signer721)
      .setApprovalForAll(await wrapperContract.getAddress(), true);

    await expect(
      wrapperContract.connect(signer721).wrapERC721(Ens721, EnsTokenId, 10000)
    ).to.be.reverted;

    await resetFork();
  });

  it("Should revert to unwrap erc721 token without complete ownership", async function () {
    const id = await getId(erc721);

    await erc721
      .connect(signer721)
      .setApprovalForAll(await wrapperContract.getAddress(), true);

    await wrapperContract
      .connect(signer721)
      .wrapERC721(Ens721, EnsTokenId, 10000);

    await assetContract
      .connect(signer721)
      .transferFrom(
        signer721.getAddress(),
        user1.getAddress(),
        id,
        EnsTokenId,
        1
      );

    await expect(
      wrapperContract.connect(signer721).unwrapERC721(id, EnsTokenId)
    ).to.be.reverted;

    await resetFork();
  });

  it("Should unwrap erc721 token", async function () {
    const id = await getId(erc721);

    await erc721
      .connect(signer721)
      .setApprovalForAll(await wrapperContract.getAddress(), true);

    await wrapperContract
      .connect(signer721)
      .wrapERC721(Ens721, EnsTokenId, 10000);

    await wrapperContract.connect(signer721).unwrapERC721(id, EnsTokenId);

    expect(await assetContract.totalSubSupply(id, EnsTokenId)).to.be.eq(0);

    expect(await erc721.ownerOf(EnsTokenId)).to.be.eq(
      await signer721.getAddress()
    );

    await resetFork();
  });

  // it("Should emergency unwrap erc721 token without complete ownership", async function () {
  //   const id = await getId(wrapperContract);

  //   await erc721
  //     .connect(signer721)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);
  //   await wrapperContract
  //     .connect(signer721)
  //     .wrapERC721(Ens721, EnsTokenId, 10000);
  //   await assetContract
  //     .connect(signer721)
  //     .transferFrom(signer721.getAddress(), user1.getAddress(), id, 1, 9999);

  //   await wrapperContract.emergencyUnwrapERC721(
  //     id,
  //     await signer721.getAddress()
  //   );

  //   expect(
  //     await assetContract.subBalanceOf(await signer721.getAddress(), id, 1)
  //   ).to.be.eq(0);

  //   expect(await erc721.ownerOf(EnsTokenId)).to.be.eq(
  //     await signer721.getAddress()
  //   );

  //   await resetFork();
  // });

  // it("Should revert batch wrap erc721 token without array parity", async function () {
  //   await expect(
  //     wrapperContract
  //       .connect(signer721)
  //       .batchWrapERC721([Ens721], [EnsTokenId], [10000, 1])
  //   ).to.be.reverted;

  //   await expect(
  //     wrapperContract
  //       .connect(signer721)
  //       .batchWrapERC721([Ens721], [EnsTokenId, EnsTokenId], [10000])
  //   ).to.be.reverted;
  // });

  // it("Should batch wrap erc721 token", async function () {
  //   const id = await getId(wrapperContract);

  //   await erc721
  //     .connect(signer721)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);
  //   await wrapperContract
  //     .connect(signer721)
  //     .batchWrapERC721([Ens721], [EnsTokenId], [10000]);

  //   expect(
  //     await assetContract.subBalanceOf(signer721.getAddress(), id, 1)
  //   ).to.be.eq(10000);

  //   expect(await erc721.ownerOf(EnsTokenId)).to.be.eq(
  //     await wrapperContract.getAddress()
  //   );
  // });

  // it("Should revert to wrap erc1155 if not owner", async function () {
  //   await expect(wrapperContract.wrapERC1155(Sand1155, SandTokenId, 1, 10000))
  //     .to.be.reverted;
  // });

  // it("Should revert to wrap erc1155 with zero balance", async function () {
  //   await expect(wrapperContract.wrapERC1155(Sand1155, SandTokenId, 0, 10000))
  //     .to.be.reverted;
  // });

  // it("Should revert to wrap erc1155 contract address is not whitelisted", async function () {
  //   await expect(
  //     wrapperContract.wrapERC1155(ethers.ZeroAddress, SandTokenId, 1, 10000)
  //   ).to.be.reverted;
  // });

  // it("Should revert to wrap erc1155 contract address is wrong", async function () {
  //   await expect(wrapperContract.wrapERC1155(Ens721, SandTokenId, 1, 10000)).to
  //     .be.reverted;
  // });

  // it("Should wrap erc1155 token and get info", async function () {
  //   const id = await getId(wrapperContract);

  //   const balance = await erc1155.balanceOf(
  //     signer1155.getAddress(),
  //     SandTokenId
  //   );

  //   await erc1155
  //     .connect(signer1155)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);
  //   await wrapperContract
  //     .connect(signer1155)
  //     .wrapERC1155(Sand1155, SandTokenId, balance, 10000);

  //   expect(
  //     await assetContract.subBalanceOf(signer1155.getAddress(), id, 1)
  //   ).to.be.eq(10000);

  //   expect(
  //     await erc1155.balanceOf(wrapperContract.getAddress(), SandTokenId)
  //   ).to.be.eq(balance);

  //   const info = await wrapperContract.getWrappedInfo(id);
  //   expect(info[0]).to.be.eq(SandTokenId);
  //   expect(info[1]).to.be.eq(10000);
  //   expect(info[2]).to.be.eq(balance);
  //   expect(info[3]).to.be.eq(Sand1155);

  //   await resetFork();
  // });

  // it("Should revert to wrap erc1155 token twice", async function () {
  //   await erc1155
  //     .connect(signer1155)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);

  //   const id = await getId(wrapperContract);

  //   await assetContract.grantRole(
  //     AssetManagerAccess,
  //     await signer1155.getAddress()
  //   );
  //   await assetContract
  //     .connect(signer1155)
  //     .createAsset(signer1155.getAddress(), id, 1, 1);

  //   await expect(
  //     wrapperContract
  //       .connect(signer1155)
  //       .wrapERC1155(Sand1155, SandTokenId, 1, 10000)
  //   ).to.be.reverted;

  //   await resetFork();
  // });

  // it("Should revert to unwrap erc1155 token without complete ownership", async function () {
  //   const id = await getId(wrapperContract);

  //   await erc1155
  //     .connect(signer1155)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);
  //   await wrapperContract
  //     .connect(signer1155)
  //     .wrapERC1155(Sand1155, SandTokenId, 1, 10000);
  //   await assetContract
  //     .connect(signer1155)
  //     .transferFrom(signer1155.getAddress(), user1.getAddress(), id, 1, 1);

  //   await expect(wrapperContract.connect(signer1155).unwrapERC1155(id)).to.be
  //     .reverted;

  //   await resetFork();
  // });

  // it("Should unwrap erc1155 token", async function () {
  //   const id = await getId(wrapperContract);

  //   const balance = await erc1155.balanceOf(
  //     await signer1155.getAddress(),
  //     SandTokenId
  //   );

  //   await erc1155
  //     .connect(signer1155)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);
  //   await wrapperContract
  //     .connect(signer1155)
  //     .wrapERC1155(Sand1155, SandTokenId, 1, 10000);

  //   await wrapperContract.connect(signer1155).unwrapERC1155(id);

  //   expect(await assetContract.totalSubSupply(id, 1)).to.be.eq(0);

  //   expect(
  //     await erc1155.balanceOf(await signer1155.getAddress(), SandTokenId)
  //   ).to.be.eq(balance);

  //   await resetFork();
  // });

  // it("Should emergency unwrap erc1155 token without complete ownership", async function () {
  //   const id = await getId(wrapperContract);

  //   const balance = await erc1155.balanceOf(
  //     await signer1155.getAddress(),
  //     SandTokenId
  //   );

  //   await erc1155
  //     .connect(signer1155)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);
  //   await wrapperContract
  //     .connect(signer1155)
  //     .wrapERC1155(Sand1155, SandTokenId, 1, 10000);
  //   await assetContract
  //     .connect(signer1155)
  //     .transferFrom(signer1155.getAddress(), user1.getAddress(), id, 1, 9999);

  //   await wrapperContract.emergencyUnwrapERC1155(
  //     id,
  //     await signer1155.getAddress()
  //   );

  //   expect(
  //     await assetContract.subBalanceOf(await signer1155.getAddress(), id, 1)
  //   ).to.be.eq(0);

  //   expect(
  //     await erc1155.balanceOf(await signer1155.getAddress(), SandTokenId)
  //   ).to.be.eq(balance);

  //   await resetFork();
  // });

  // it("Should revert batch wrap erc1155 token without array parity", async function () {
  //   await expect(
  //     wrapperContract
  //       .connect(signer1155)
  //       .batchWrapERC1155([Sand1155], [SandTokenId], [1], [10000, 1])
  //   ).to.be.reverted;

  //   await expect(
  //     wrapperContract
  //       .connect(signer1155)
  //       .batchWrapERC1155([Sand1155], [SandTokenId], [1, 1], [10000])
  //   ).to.be.reverted;

  //   await expect(
  //     wrapperContract
  //       .connect(signer1155)
  //       .batchWrapERC1155([Sand1155], [SandTokenId, SandTokenId], [1], [10000])
  //   ).to.be.reverted;
  // });

  // it("Should batch wrap erc1155 token", async function () {
  //   const id = await getId(wrapperContract);

  //   const balance = await erc1155.balanceOf(
  //     await signer1155.getAddress(),
  //     SandTokenId
  //   );

  //   await erc1155
  //     .connect(signer1155)
  //     .setApprovalForAll(await wrapperContract.getAddress(), true);
  //   await wrapperContract
  //     .connect(signer1155)
  //     .batchWrapERC1155([Sand1155], [SandTokenId], [balance], [10000]);

  //   expect(
  //     await assetContract.subBalanceOf(signer1155.getAddress(), id, 1)
  //   ).to.be.eq(10000);

  //   expect(
  //     await erc1155.balanceOf(wrapperContract.getAddress(), SandTokenId)
  //   ).to.be.eq(balance);
  // });

  // it("Should revert to transfer erc721 token directly to contract", async function () {
  //   await expect(
  //     erc721
  //       .connect(signer721)
  //       .safeTransferFrom(
  //         await signer721.getAddress(),
  //         await wrapperContract.getAddress(),
  //         EnsTokenId
  //       )
  //   ).to.be.reverted;
  //   await resetFork();
  // });

  // it("Should revert to transfer erc1155 token directly to contract", async function () {
  //   await expect(
  //     erc1155
  //       .connect(signer1155)
  //       .safeTransferFrom(
  //         await signer1155.getAddress(),
  //         await wrapperContract.getAddress(),
  //         SandTokenId,
  //         1,
  //         "0x"
  //       )
  //   ).to.be.reverted;
  //   await resetFork();
  // });

  // it("Should revert to batch transfer erc1155 token directly to contract", async function () {
  //   await expect(
  //     erc1155
  //       .connect(signer1155)
  //       .safeBatchTransferFrom(
  //         await signer1155.getAddress(),
  //         await wrapperContract.getAddress(),
  //         [SandTokenId],
  //         [1],
  //         "0x"
  //       )
  //   ).to.be.reverted;
  //   await resetFork();
  // });

  // it("Should revert unwrap20 with invalid id", async function () {
  //   await expect(wrapperContract.connect(signer20).unwrapERC20(1)).to.be
  //     .reverted;
  // });

  // it("Should revert unwrap721 with invalid id", async function () {
  //   await expect(wrapperContract.connect(signer721).unwrapERC721(1)).to.be
  //     .reverted;
  // });

  // it("Should revert unwrap1155 with invalid id", async function () {
  //   await expect(wrapperContract.connect(signer1155).unwrapERC1155(1)).to.be
  //     .reverted;
  // });
});
