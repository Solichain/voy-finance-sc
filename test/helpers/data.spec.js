const { ethers } = require("hardhat");

const DECIMALS = {
  TWO: 2,
  SIX: 6,
  EIGHTEEN: 18,
};

const MarketplaceAccess = ethers.keccak256(
  ethers.toUtf8Bytes("MARKETPLACE_ROLE")
);

const AssetManagerAccess = ethers.keccak256(
  ethers.toUtf8Bytes("ASSET_MANAGER")
);

const DAY = 24n * 60n * 60n;
const YEAR = 360n * DAY;

const createList = async (
  fractionPriceInToken,
  listedFractions,
  minFraction,
  token
) => {
  return {
    fractionPriceInToken,
    listedFractions,
    minFraction,
    token,
  };
};

const offer = {
  offerPrice: ethers.parseUnits("5", DECIMALS.SIX),
  deadline: 3n * DAY, // in seconds
};

const SandTokenId =
  "53343204100803765692379285688171671302437967278842259121980540727211386210304";

const EnsTokenId =
  "88702082417345488823430055150938155509739316843104657636167181501132256854145";

module.exports = {
  EnsTokenId,
  SandTokenId,
  DAY,
  YEAR,
  createList,
  offer,
  DECIMALS,
  MarketplaceAccess,
  AssetManagerAccess,
};
