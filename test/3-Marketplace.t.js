const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const {
    createList,
    MarketplaceAccess,
    AssetManagerAccess,
} = require("./helpers/data.spec");

describe("Marketplace", function () {
    let assetContract;
    let stableTokenContract;
    let marketplaceContract;
    let deployer;
    let user1;
    let buyer;
    let feeWallet;
    let feeManager;

    beforeEach(async () => {
        [deployer, user1, buyer, feeWallet] = await ethers.getSigners();

        const AssetFactory = await ethers.getContractFactory("BaseAsset");
        assetContract = await AssetFactory.deploy(
            "Voy Asset Collection",
            "VAC",
            "1.0",
            "https://ipfs.io/ipfs"
        );

        const FeeManagerFactory = await ethers.getContractFactory("FeeManager");

        feeManager = await FeeManagerFactory.deploy(
            0,
            0,
            await feeWallet.getAddress()
        );

        await feeManager.waitForDeployment();

        stableTokenContract = await (
            await ethers.getContractFactory("MockERC20")
        ).deploy("USD Dollar", "USDC", 6, buyer.getAddress(), 2000000);


        marketplaceContract = await upgrades.deployProxy(
            await ethers.getContractFactory("Marketplace"),
            [await assetContract.getAddress(), await feeManager.getAddress()]
        );

        await assetContract.grantRole(
            AssetManagerAccess,
            deployer.getAddress()
        );

        await assetContract.setBaseURI(2, "https://ipfs.io/ipfs");

        await assetContract
            .connect(buyer)
            .setApprovalForAll(marketplaceContract.getAddress(), true);

        await assetContract
            .connect(user1)
            .setApprovalForAll(marketplaceContract.getAddress(), true);

        await assetContract.grantRole(
            MarketplaceAccess,
            marketplaceContract.getAddress()
        );
    });

    it("Should revert to initialize the contract twice", async function () {
        await expect(
            marketplaceContract
                .connect(deployer)
                .initialize(
                    await assetContract.getAddress(),
                    await feeWallet.getAddress()
                )
        ).to.revertedWith("Initializable: contract is already initialized");
    });

    it("Should revert on passing non-compatible asset collection Address", async function () {
        await expect(
            upgrades.deployProxy(
                await ethers.getContractFactory("Marketplace"),
                [
                    await stableTokenContract.getAddress(), // non compatible to asset contract
                    await feeWallet.getAddress(),
                ]
            )
        ).to.be.reverted;
    });

    it("Should revert on listing with invalid token address", async function () {
        await expect(
            marketplaceContract.list(
                1,
                1,
                await createList(
                    10,
                    1,
                    100,
                    ethers.ZeroAddress
                )
            )
        ).to.reverted;
    });

    it("Should revert on listing with invalid sale price", async function () {
        await expect(
            marketplaceContract.list(
                1,
                1,
                await createList(
                    0,
                    1,
                    100,
                    await stableTokenContract.getAddress()
                )
            )
        ).to.reverted;
    });

    it("Should revert on listing an asset without ownership", async function () {
        await expect(
            marketplaceContract
                .connect(user1)
                .list(
                    1,
                    1,
                    await createList(
                        100,
                        100,
                        100,
                        stableTokenContract.getAddress()
                    )
                )
        ).to.be.reverted;
    });

    it("Should revert on listing with zero minimum fraction ot buy", async function () {
        await expect(
            marketplaceContract
                .connect(user1)
                .list(
                    1,
                    1,
                    await createList(
                        100,
                        100,
                        0,
                        stableTokenContract.getAddress()
                    )
                )
        ).to.be.reverted;
    });

    it("Should revert on listing fractions less than Min. fraction", async function () {
        await expect(
            marketplaceContract
                .connect(buyer)
                .list(
                    1,
                    1,
                    await createList(
                        100,
                        100,
                        200,
                        stableTokenContract.getAddress()
                    )
                )
        ).to.be.reverted;
    });

    it("Should revert on listing without enough balance to sell", async function () {

        await assetContract.createAsset(await user1.getAddress(), 1, 1, 10);

        await expect(
            marketplaceContract
                .connect(user1)
                .list(
                    1,
                    1,
                    await createList(
                        100,
                        200,
                        100,
                        stableTokenContract.getAddress()
                    )
                )
        ).to.be.reverted;
    });

    it("Should revert on listing and buying with less than Min. fraction", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 10);

        await marketplaceContract
            .connect(user1)
            .list(
                1,
                1,
                await createList(
                    100,
                    10,
                    10,
                    stableTokenContract.getAddress()
                )
            );

        await stableTokenContract
            .connect(buyer)
            .approve(marketplaceContract.getAddress(), 10000);

        await expect(
            marketplaceContract.connect(buyer).buy(1, 1, 9, user1.getAddress())
        ).to.be.reverted;
    });

    it("Should revert on listing and buying more than listed amount", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 10);

        await marketplaceContract
            .connect(user1)
            .list(
                1,
                1,
                await createList(
                    100,
                    10,
                    10,
                    stableTokenContract.getAddress()
                )
            );

        await stableTokenContract
            .connect(buyer)
            .approve(marketplaceContract.getAddress(), 11000);

        await expect(
            marketplaceContract.connect(buyer).buy(1, 1, 11, user1.getAddress())
        ).to.be.reverted;
    });

    it("Should revert on listing and buying without enough balance to sell", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 10);

        await marketplaceContract
            .connect(user1)
            .list(
                1,
                1,
                await createList(
                    100,
                    10,
                    10,
                    stableTokenContract.getAddress()
                )
            );

        await stableTokenContract
            .connect(buyer)
            .approve(marketplaceContract.getAddress(), 10000);

        await assetContract
            .connect(user1)
            .safeTransferFrom(
                await user1.getAddress(),
                await buyer.getAddress(),
                1,
                1,
                1
            );

        await expect(
            marketplaceContract.connect(buyer).buy(1, 1, 10, user1.getAddress())
        ).to.be.reverted;
    });

    it("Should revert on passing invalid fee wallet Address", async function () {
        await expect(
            upgrades.deployProxy(await ethers.getContractFactory("Marketplace"), [
                await assetContract.getAddress(),
                ethers.ZeroAddress,
            ])
        ).to.reverted;
    });

    it("Should revert to batch List without array parity", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 10);

        const list = await createList(
            100,
            5,
            5,
            stableTokenContract.getAddress()
        );

        await expect(
            marketplaceContract.batchList(
                [1],
                [1, 1],
                [list, list]
            )
        ).to.reverted;

        await expect(
            marketplaceContract.connect(user1).batchList(
                [1, 1],
                [1],
                [list, list]
            )
        ).to.reverted;

        await expect(
            marketplaceContract.batchList(
                [1, 1],
                [1, 1],
                [list]
            )
        ).to.reverted;
    });

    it("Should revert to batch List more than 30 limit", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);
        const list = await createList(
            100,
            1,
            1,
            stableTokenContract.getAddress()
        );

        await expect(
            marketplaceContract.connect(user1).batchList(Array(31).fill(1), Array(31).fill(1), Array(31).fill(list))
        ).to.reverted;
    });

    it("Should revert to batch Unlist without array parity", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);

        await expect(marketplaceContract.batchUnlist([1], [1, 1])).to.reverted;
        await expect(marketplaceContract.batchUnlist([1, 1], [1])).to.reverted;
    });

    it("Should revert to batch Buy and Unlist more than 30 limit", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);

        await expect(marketplaceContract.batchUnlist(Array(31).fill(1), Array(31).fill(1))).to
            .reverted;

        await expect(
            marketplaceContract
                .connect(buyer)
                .batchBuy(
                    Array(31).fill(1),
                    Array(31).fill(1),
                    Array(31).fill(1000),
                    Array(31).fill(user1.getAddress())
                )
        ).to.be.reverted;
    });

    it("Should revert to unlist not listed assets", async function () {

        await expect(marketplaceContract.unlist(1, 1)).to.reverted;
    });

    it("Should batch create assets and batch list", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);
        await assetContract.createAsset(await user1.getAddress(), 1, 2, 1);
        await assetContract.createAsset(await user1.getAddress(), 1, 3, 1);

        const list = await createList(
            100,
            1,
            1,
            stableTokenContract.getAddress()
        );

        await marketplaceContract
            .connect(user1)
            .batchList([1, 1, 1], [1, 2, 3], [list, list, list]);
    });

    it("Should batch create properties and batch list and unlisted", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);
        await assetContract.createAsset(await user1.getAddress(), 1, 2, 1);
        await assetContract.createAsset(await user1.getAddress(), 1, 3, 1);

        const list = await createList(
            100,
            1,
            1,
            stableTokenContract.getAddress()
        );

        await marketplaceContract
            .connect(user1)
            .batchList([1, 1, 1], [1, 2, 3], [list, list, list]);

        await marketplaceContract
            .connect(user1)
            .batchUnlist([1, 1, 1], [1, 2, 3]);
    });

    it("Should return the listed info struct", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);

        await marketplaceContract
            .connect(user1)
            .list(
                1,
                1,
                await createList(
                    100,
                    1,
                    1,
                    stableTokenContract.getAddress()
                )
            );

        const info = await marketplaceContract.getListedAssetInfo(
            user1.getAddress(),
            1,
            1
        );

        expect(info[0]).to.eq(100);
        expect(info[1]).to.eq(1);
        expect(info[2]).to.eq(1);
    });

    it("Should return the deleted unlisted info struct", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);

        const list = await createList(
            100,
            1,
            1,
            stableTokenContract.getAddress()
        );

        await marketplaceContract.connect(user1).list(1, 1, list);

        await marketplaceContract.connect(user1).unlist(1, 1);

        const info = await marketplaceContract.getListedAssetInfo(
            user1.getAddress(),
            1,
            0
        );

        expect(info[0]).to.eq(0);
        expect(info[1]).to.eq(0);
        expect(info[2]).to.eq(0);
        expect(info[3]).to.eq(ethers.ZeroAddress);
    });

    it("Should return the batch listed info struct", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);
        await assetContract.createAsset(await user1.getAddress(), 1, 2, 1);
        await assetContract.createAsset(await user1.getAddress(), 1, 3, 1);

        const list = await createList(
            100,
            1,
            1,
            stableTokenContract.getAddress()
        );

        await marketplaceContract
            .connect(user1)
            .batchList([1, 1, 1], [1, 2, 3], [list, list, list]);

        const info1 = await marketplaceContract.getListedAssetInfo(
            user1.getAddress(),
            1,
            1
        );

        const info2 = await marketplaceContract.getListedAssetInfo(
            user1.getAddress(),
            1,
            2
        );

        const info3 = await marketplaceContract.getListedAssetInfo(
            user1.getAddress(),
            1,
            2
        );

        expect(info1[0]).to.eq(100);
        expect(info1[1]).to.eq(1);
        expect(info1[2]).to.eq(1);
        expect(info1[3]).to.eq(await stableTokenContract.getAddress());

        expect(info2[0]).to.eq(100);
        expect(info2[1]).to.eq(1);
        expect(info2[2]).to.eq(1);
        expect(info2[3]).to.eq(await stableTokenContract.getAddress());

        expect(info3[0]).to.eq(100);
        expect(info3[1]).to.eq(1);
        expect(info3[2]).to.eq(1);
        expect(info3[3]).to.eq(await stableTokenContract.getAddress());
    });

    it("Should return the asset contract address while calling getAssetCollection()", async function () {
        expect(await marketplaceContract.getBaseAsset()).to.eq(
            await assetContract.getAddress()
        );
    });

    it("Should set a new fee manager address while calling setFeeManager()", async function () {
        await expect(
            await marketplaceContract.setFeeManager(await feeManager.getAddress())
        ).not.to.be.reverted;

        expect(await marketplaceContract.getFeeManager()).to.eq(
            await feeManager.getAddress()
        );
    });

    it("Should revert when setting a new fee manager by invalid caller address while calling setFeeManager()", async function () {
        await expect(
            marketplaceContract.connect(user1).setFeeManager(feeManager.getAddress())
        ).to.be.revertedWith(
            `AccessControl: account ${(
                await user1.getAddress()
            ).toLowerCase()} is missing role ${ethers.zeroPadValue(
                ethers.toBeHex(0),
                32
            )}`
        );
    });

    it("Should create asset, list it and selling it to buyer through Marketplace", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);

        const list = await createList(
            2000,
            1,
            1,
            stableTokenContract.getAddress()
        );

        await marketplaceContract.connect(user1).list(1, 1, list);

        await stableTokenContract
            .connect(buyer)
            .approve(marketplaceContract.getAddress(), 2020);

        await feeManager.setBuyingFee(1, 1, 100);

        await expect(
            await marketplaceContract
                .connect(buyer)
                .buy(1, 1, 1, user1.getAddress())
        ).not.to.be.reverted;

        expect(
            await stableTokenContract.balanceOf(await feeWallet.getAddress())
        ).to.eq(2020 % 100);

        expect(await assetContract.subBalanceOf(buyer.getAddress(), 1, 1)).to.eq(
            1
        );
    });

    it("Should revert to buy when asset is not listed", async function () {
        await assetContract.createAsset(await user1.getAddress(), 1, 1, 1);

        await stableTokenContract
            .connect(buyer)
            .approve(marketplaceContract.getAddress(), 100);

        await expect(
            marketplaceContract.connect(buyer).buy(1, 1, 1, user1.getAddress())
        ).to.be.reverted;
    });
});
