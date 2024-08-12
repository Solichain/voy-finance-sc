// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Listed information for each asset owner and asset id
 * @param salePrice, sale price for the asset
 * @param listedFractions, number of fractions listed by owner
 * @param minFraction, minimum fraction required for buying an asset
 * @param token, address of token to receive salePrice
 */
struct ListedAssetInfo {
    uint256 mainId;
    uint256 subId;
    uint256 fractionPriceInToken; // for each fraction (use it with minimum decimal)
    uint256 listedFractions;
    uint256 minFraction;
    IERC20 token;
}

/**
 * @title storing wrapped main asset information
 * @param subIdInfo, mapping from the sub asset identifier to its info
 */
struct WrappedMainAssetInfo {
    address contractAddress;
    WrappedSubAssetInfo[] subIdInfo;
}

/**
 * @title storing wrapped main asset information
 * @param fractions, number of fractions of asset
 * @param balance, balance of asset
 * @param contractAddress, asset contract address
 */
struct WrappedSubAssetInfo {
    uint256 fractions;
    uint256 balance;
}
/**
 * @title storing asset information
 * @param initialOwner, is the initial owner of asset
 * @param purchaseDate, date that first time a fraction of asset is purchased
 */
struct AssetInfo {
    address initialOwner;
}

struct BaseAssetIdentifiers {
    uint256 mainId;
    uint256 subId;
}
