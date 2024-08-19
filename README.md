# Decentralized Marketplace with ERC-6960 and Wrapped Assets

## Overview

This repository contains the implementation of a decentralized marketplace on the Ethereum blockchain, featuring advanced tokenization capabilities using the ERC-6960 standard. The marketplace supports the wrapping, listing, and trading of various token types, including ERC-20, ERC-721, and ERC-1155 tokens, by converting them into dual-layer tokens (DLTs).

## Contracts

### 1. **BaseAsset.sol**
   - **Inherits:** `ERC165`, `DLT`, `DLTEnumerable`, `DLTPermit`, `AccessControl`, `IBaseAsset`
   - **Purpose:** Manages the creation, burning, and URI management of dual-layer tokens (DLTs) based on ERC-6960.

### 2. **WrappedAsset.sol**
   - **Inherits:** `Context`, `AccessControl`, `IERC721Receiver`, `IERC1155Receiver`, `IWrappedAsset`
   - **Purpose:** Handles the wrapping of ERC-20, ERC-721, and ERC-1155 tokens into DLTs, enabling fractional ownership and dynamic token supply.

### 3. **FeeManager.sol**
   - **Inherits:** `ERC165`, `AccessControl`, `IFeeManager`
   - **Purpose:** Manages transaction fees within the marketplace, including setting and distributing fees to a designated wallet.

### 4. **Marketplace.sol**
   - **Inherits:** `Initializable`, `Context`, `ERC165`, `EIP712Upgradeable`, `AccessControl`, `ReentrancyGuardUpgradeable`, `IMarketplace`
   - **Purpose:** Core marketplace contract that facilitates the listing, buying, and selling of assets, integrating fee management and compliance features.

### 5. **MockERC20.sol**
   - **Inherits:** `ERC20`
   - **Purpose:** Mock implementation of an ERC-20 token for testing purposes.

### 6. **MockERC721.sol**
   - **Inherits:** `ERC721`
   - **Purpose:** Mock implementation of an ERC-721 token for testing purposes.

### 7. **MockInvoiceOwner.sol**
   - **Interacts with:** `IMarketplace`
   - **Purpose:** Demonstrates interaction with the marketplace, particularly for listing and buying assets.

## Features

- **ERC-6960 Dual Layer Tokens:** Supports hierarchical tokenization with main and sub-IDs, enabling efficient management of complex assets.
- **Asset Wrapping:** Converts ERC-20, ERC-721, and ERC-1155 tokens into fractionalized dual-layer tokens.
- **Marketplace Operations:** Listing, buying, selling, and unwrapping of assets with built-in fee management.
- **Compliance and Interoperability:** Ensures adherence to regulatory requirements and smooth integration with other Ethereum standards.

## Usage

Deploy the contracts on the Ethereum blockchain and interact through a frontend interface or directly via scripts. Wrap assets, list them on the marketplace, and facilitate transactions with automated fee distribution.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
