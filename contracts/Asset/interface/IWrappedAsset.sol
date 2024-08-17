// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { WrappedAssetInfo, BaseAssetIdentifiers, IERC20 } from "contracts/lib/structs.sol";
import { GenericErrors } from "contracts/lib/errors.sol";

interface IWrappedAsset is GenericErrors {
    /**
     * @dev Emitted when an erc20 asset is unwrapped
     * @param owner, address of the asset owner
     * @param contractAddress, addres of asset contract
     * @param mainId, unique idetifier of wrapped asset
     * @param amount, amount of the wnwrapped assets
     
     */
    event ERC20Unwrapped(
        address indexed owner,
        address indexed contractAddress,
        uint256 mainId,
        uint256 amount
    );

    /**
     * @dev Emitted when an asset is unwrapped
     * @param owner, address of the asset owner
     * @param contractAddress, addres of asset contract
     * @param mainId, unique idetifier of wrapped asset
     * @param tokenId, unique idetifier of asset
     */
    event ERC721Unwrapped(
        address indexed owner,
        address indexed contractAddress,
        uint256 mainId,
        uint256 tokenId
    );

    /**
     * @dev Emitted when an asset is unwrapped
     * @param owner, address of the asset owner
     * @param contractAddress, addres of asset contract
     * @param mainId, unique idetifier of wrapped asset
     * @param tokenId, unique idetifier of asset
     * @param balance, balance of wrapped asset
     */
    event ERC1155Unwrapped(
        address indexed owner,
        address indexed contractAddress,
        uint256 mainId,
        uint256 tokenId,
        uint256 balance
    );

    /**
     * @dev Emitted when an erc20 asset is wrapped to DLT
     * @param owner, address of the asset owner
     * @param contractAddress, addres of asset contract
     * @param mainId, unique idetifier of asset
     * @param amount, amount of wrapped assets
     * @param nonce, nonce of the address for the owner transactions
     */
    event ERC20Wrapped(
        address indexed owner,
        address indexed contractAddress,
        uint256 mainId,
        uint256 amount,
        uint256 nonce
    );

    /**
     * @dev Emitted when an asset is wrapped to DLT
     * @param owner, address of the asset owner
     * @param contractAddress, addres of asset contract\
     * @param mainId, unique idetifier of wrapped asset
     * @param tokenId, unique idetifier of asset
     */
    event ERC721Wrapped(
        address indexed owner,
        address indexed contractAddress,
        uint256 mainId,
        uint256 tokenId,
        uint256 nonce
    );

    /**
     * @dev Emitted when an asset is wrapped to DLT
     * @param owner, address of the asset owner
     * @param contractAddress, addres of asset contract
     * @param mainId, unique idetifier of wrapped asset
     * @param tokenId, unique idetifier of asset
     * @param balance, balance of wrapped asset
     */
    event ERC1155Wrapped(
        address indexed owner,
        address indexed contractAddress,
        uint256 mainId,
        uint256 tokenId,
        uint256 balance,
        uint256 nonce
    );

    event StatusChanged(address indexed contractAddress, bool status);

    /**
     * @dev Reverted on unsupported interface detection
     */
    error UnableToReceive();
    error NotWhitelisted();
    error PartialOwnership();
    error InvalidBalance();
    error AssetAlreadyCreated();
    error WrongAssetId();

    /**
     * @dev Whitelist a contract address status to be whitelisted
     * @param contractAddress, address of ERC20, ERC721 or ERC1155 contract
     * @param status, updated status of contract address
     */
    function whitelist(address contractAddress, bool status) external;

    /**
     * @dev Wrapps a number of token of ERC20
     * @param contractAddress, address of ERC20 contract
     * @param amount, number of fractions to fractionalize DLT
     * @dev Needs owner to approve WrappedAsset contract to transfer the ERC20 token
     * @dev Locks the asset in contract
     */
    function wrapERC20(
        address contractAddress,
        uint256 amount
    ) external returns (uint256);

    /**
     * @dev Batch functionality of WrapERC20
     * @param contractAddresses, array address of ERC20 contract
     * @param amount, array number of fractions to fractionalize DLT
     */
    function batchWrapERC20(
        address[] calldata contractAddresses,
        uint256[] calldata amount
    ) external returns (uint256[] memory);

    /**
     * @dev Wrapps an ERC721 token into DLT
     * @param contractAddress, address of ERC721 contract
     * @param tokenId, unique identifier of ERC721 token
     * @param amount, number of fractions to fractionalize DLT
     * @dev Needs owner to approve WrappedAsset contract to transfer the ERC721 token
     * @dev Locks the asset in contract
     */
    function wrapERC721(
        address contractAddress,
        uint256 tokenId,
        uint256 amount
    ) external returns (uint256);

    /**
     * @dev Batch functionality of WrapERC721
     * @param contractAddresses, array address of ERC721 contract
     * @param tokenIds, array token ids of ERC721 token
     * @param amount, array number of fractions to fractionalize DLT
     */
    function batchWrapERC721(
        address[] calldata contractAddresses,
        uint256[] calldata tokenIds,
        uint256[] calldata amount
    ) external returns (uint256[] memory);

    /**
     * @dev Wrapps an ERC1155 token into DLT
     * @param contractAddress, address of ERC1155 contract
     * @param tokenId, unique identifier of ERC1155 token
     * @param amount, number of fractions to fractionalize DLT
     * @dev Needs owner to approve WrappedAsset contract to transfer the ERC1155 token
     * @dev Locks the asset in contract
     */
    function wrapERC1155(
        address contractAddress,
        uint256 tokenId,
        uint256 amount
    ) external returns (uint256);

    /**
     * @dev Batch functionality of WrapERC1155
     * @param contractAddresses, array address of ERC1155 contract
     * @param tokenIds, array token ids of ERC1155 token
     * @param amount, array number of fractions to fractionalize DLT
     */
    function batchWrapERC1155(
        address[] calldata contractAddresses,
        uint256[] calldata tokenIds,
        uint256[] calldata amount
    ) external returns (uint256[] memory);

    /**
     * @dev Unwrapps a DLT to ERC20 token
     * @param mainId, unique identifier of wrapped asset
     * @param amount, amount of the fractions to be unwrapped
     * @dev Unlocks the underlying ERC20 and transfer it to owner
     */
    function unwrapERC20(uint256 mainId, uint256 amount) external;

    /**
     * @dev Unwrapps a DLT to ERC721 token
     * @param mainId, unique identifier of wrapped asset
     * @param subId, sub id of wrapped asset
     * @dev Unlocks the underlying ERC721 and transfer it to owner
     */
    function unwrapERC721(uint256 mainId, uint256 subId) external;

    /**
     * @dev Unwrapps a DLT to ERC1155 token
     * @param mainId, unique identifier of wrapped asset
     * @param subId, sub id of wrapped asset
     * @param amount, amount of the fractions to be unwrapped
     * @dev Unlocks the underlying ERC1155 and transfer it to owner
     */
    function unwrapERC1155(
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external;

    /**
     * @dev Emergency Unwrapps a DLT to ERC20 token
     * @param receiver, address of receiver of asset must have at least a fraction of asset
     * @param mainId, unique identifier of wrapped asset
     * @param amount, amount of the fractions to be unwrapped
     */
    function emergencyUnwrapERC20(
        address receiver,
        uint256 mainId,
        uint256 amount
    ) external;

    /**
     * @dev Emergency Unwrapps a DLT to ERC721 token
     * @param receiver, address of receiver of asset must have at least a fraction of asset
     * @param mainId, unique identifier of wrapped asset
     * @param subId, sub id of wrapped asset
     
     */
    function emergencyUnwrapERC721(
        address receiver,
        uint256 mainId,
        uint256 subId
    ) external;

    /**
     * @dev Emergency Unwrapps a DLT to ERC1155 token
     * @param mainId, unique identifier of wrapped asset
     * @param subId, sub id of wrapped asset
     * @param receiver, address of receiver of asset must have at least a fraction of asset
     * @param amount, amount of the fractions to be unwrapped
     */
    function emergencyUnwrapERC1155(
        address receiver,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external;

    function updateBaseAssetInfo(
        address owner,
        uint256 mainId,
        uint256 subId
    ) external;

    /**
     * @dev Gets the wrapped information
     * @param wrappedMainId, unique identifier of property
     * @return WrappedInfo struct
     */
    function getWrappedInfo(
        uint256 wrappedMainId
    ) external view returns (WrappedAssetInfo memory);
}
