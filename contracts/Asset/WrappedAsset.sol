// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { WrappedAssetInfo, IWrappedAsset, BaseAssetIdentifiers, IERC20 } from "contracts/Asset/interface/IWrappedAsset.sol";
import { ERC165Checker } from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/interfaces/IERC1155Receiver.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IBaseAsset } from "contracts/Asset/interface/IBaseAsset.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { Counters } from "contracts/lib/Counters.sol";

/**
 * @title The wrapped asset contract based on ERC6960
 * @author SoliChain - Mutaz Abu Alrub - Adam Budjema - Mohammad Hammoud
 */
contract WrappedAsset is
    Context,
    AccessControl,
    IERC721Receiver,
    IERC1155Receiver,
    IWrappedAsset
{
    using ERC165Checker for address;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    Counters.Counter internal _nonce;
    IBaseAsset internal _baseAsset;

    uint256 private immutable _chainId;

    mapping(uint256 => WrappedAssetInfo) internal _wrappedInfo;

    mapping(uint256 => mapping(uint256 => uint256)) internal _subidIndex;

    mapping(address => bool) private _isWhitelisted;

    bytes4 private constant _ASSET_INTERFACE_ID = type(IBaseAsset).interfaceId;
    bytes4 private constant _ERC721_INTERFACE_ID = type(IERC721).interfaceId;
    bytes4 private constant _ERC1155_INTERFACE_ID = type(IERC1155).interfaceId;

    modifier isWhitelisted(address contractAddress) {
        if (!_isWhitelisted[contractAddress]) {
            revert NotWhitelisted();
        }
        _;
    }

    /**
     * @dev Constructor for the type contract
     * @param baseAsset_, Address of the asset collection used in the type contract
     */
    constructor(address baseAsset_) {
        if (!baseAsset_.supportsInterface(_ASSET_INTERFACE_ID)) {
            revert UnsupportedInterface();
        }

        _baseAsset = IBaseAsset(baseAsset_);
        _chainId = block.chainid;

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function whitelist(
        address contractAddress,
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (contractAddress == address(0)) {
            revert UnsupportedInterface();
        }
        _isWhitelisted[contractAddress] = status;

        emit StatusChanged(contractAddress, status);
    }

    /**
     * @dev See {IWrappedAsset-wrapERC20}.
     */
    function wrapERC20(
        address contractAddress,
        uint256 amount
    ) external returns (uint256) {
        return _wrapERC20(contractAddress, amount);
    }

    /**
     * @dev See {IWrappedAsset-batchWrapERC20}.
     */
    function batchWrapERC20(
        address[] calldata contractAddresses,
        uint256[] calldata amounts
    ) external returns (uint256[] memory) {
        uint256 length = contractAddresses.length;

        if (length != amounts.length) {
            revert NoArrayParity();
        }

        uint256[] memory ids = new uint256[](length);
        for (uint256 i = 0; i < length; ) {
            ids[i] = _wrapERC20(contractAddresses[i], amounts[i]);
            unchecked {
                ++i;
            }
        }
        return ids;
    }

    /**
     * @dev See {IWrappedAsset-wrapERC721}.
     */
    function wrapERC721(
        address contractAddress,
        uint256 tokenId,
        uint256 amount
    ) external returns (uint256) {
        return _wrapERC721(contractAddress, tokenId, amount);
    }

    /**
     * @dev See {IWrappedAsset-batchWrapERC721}.
     */
    function batchWrapERC721(
        address[] calldata contractAddresses,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external returns (uint256[] memory) {
        uint256 length = contractAddresses.length;
        if (tokenIds.length != length || length != amounts.length) {
            revert NoArrayParity();
        }
        uint256[] memory ids = new uint256[](length);
        for (uint256 i = 0; i < length; ) {
            ids[i] = _wrapERC721(contractAddresses[i], tokenIds[i], amounts[i]);
            unchecked {
                ++i;
            }
        }
        return ids;
    }

    /**
     * @dev See {IWrappedAsset-wrapERC1155}.
     */
    function wrapERC1155(
        address contractAddress,
        uint256 tokenId,
        uint256 amount
    ) external returns (uint256) {
        return _wrapERC1155(contractAddress, tokenId, amount);
    }

    /**
     * @dev See {IWrappedAsset-batchWrapERC1155}.
     */
    function batchWrapERC1155(
        address[] calldata contractAddresses,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external returns (uint256[] memory) {
        uint256 length = contractAddresses.length;
        if (tokenIds.length != length || length != amounts.length) {
            revert NoArrayParity();
        }
        uint256[] memory ids = new uint256[](length);
        for (uint256 i = 0; i < length; ) {
            ids[i] = _wrapERC1155(
                contractAddresses[i],
                tokenIds[i],
                amounts[i]
            );

            unchecked {
                ++i;
            }
        }
        return ids;
    }

    /**
     * @dev See {IWrappedAsset-emergencyUnwrapERC20}.
     */
    function emergencyUnwrapERC20(
        address receiver,
        uint256 mainId,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unwrapERC20(receiver, mainId, amount);
    }

    /**
     * @dev See {IWrappedAsset-emergencyUnwrapERC721}.
     */
    function emergencyUnwrapERC721(
        address receiver,
        uint256 mainId,
        uint256 subId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unwrapERC721(receiver, mainId, subId);
    }

    /**
     * @dev See {IWrappedAsset-emergencyUnwrapERC1155}.
     */
    function emergencyUnwrapERC1155(
        address receiver,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unwrapERC1155(receiver, mainId, subId, amount);
    }

    /**
     * @dev See {IWrappedAsset-unwrapERC20}.
     */
    function unwrapERC20(uint256 mainId, uint256 amount) external {
        _unwrapERC20(_msgSender(), mainId, amount);
    }

    /**
     * @dev See {IWrappedAsset-unwrapERC721}.
     */
    function unwrapERC721(uint256 mainId, uint256 subId) external {
        if (
            _wrappedInfo[mainId].fractions[_subidIndex[mainId][subId]] !=
            _baseAsset.subBalanceOf(_msgSender(), mainId, subId)
        ) {
            revert PartialOwnership();
        }
        _unwrapERC721(_msgSender(), mainId, subId);
    }

    /**
     * @dev See {IWrappedAsset-unwrapERC1155}.
     */
    function unwrapERC1155(
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external {
        _unwrapERC1155(_msgSender(), mainId, subId, amount);
    }

    function getWrappedInfo(
        uint256 wrappedMainId
    ) external view returns (WrappedAssetInfo memory) {
        return _wrappedInfo[wrappedMainId];
    }

    /**
     * @dev See {IWrappedAsset-getNonce}.
     */
    function getNonce(address account) external view virtual returns (uint256) {
        return _nonce.current(account);
    }

    function onERC1155Received(
        address operator,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external view override returns (bytes4 result) {
        if (operator == address(this)) {
            return IERC1155Receiver.onERC1155Received.selector;
        }
    }

    function onERC721Received(
        address operator,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4 result) {
        if (operator == address(this)) {
            return IERC721Receiver.onERC721Received.selector;
        }
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert UnableToReceive();
    }

    function updateBaseAssetInfo(
        address owner,
        uint256 mainId,
        uint256 subId
    ) public {
        BaseAssetIdentifiers[] memory ownerAssets = _baseAsset.getOwnerAssets(
            owner
        );
        address[] memory shareholders = _baseAsset.getShareholdersInfo(
            mainId,
            subId
        );

        if (_baseAsset.subBalanceOf(owner, mainId, subId) == 0) {
            uint256 assetIndex;
            uint256 ownerIndex;

            for (uint256 i = 0; i < ownerAssets.length; i++) {
                if (
                    ownerAssets[i].mainId == mainId &&
                    ownerAssets[i].subId == subId
                ) {
                    assetIndex = i;

                    break;
                }
            }
            for (uint256 i = 0; i < shareholders.length; i++) {
                if (shareholders[i] == owner) {
                    ownerIndex = i;
                    break;
                }
            }
            _baseAsset.deleteShareholderInfo(
                owner,
                mainId,
                subId,
                ownerIndex,
                assetIndex
            );
        }
    }

    function isWhitelistedContract(
        address contractAddress
    ) public view returns (bool) {
        return _isWhitelisted[contractAddress];
    }

    function getMainId(address contractAddress) public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(_chainId, contractAddress)));
    }

    function _wrapERC20(
        address contractAddress,
        uint256 amount
    ) private isWhitelisted(contractAddress) returns (uint256 mainId) {
        if (amount == 0) {
            revert InvalidAmount();
        }

        IERC20 token = IERC20(contractAddress);

        uint256 actualBalance = token.balanceOf(_msgSender());

        if (actualBalance < amount) {
            revert NotEnoughBalance();
        }

        mainId = getMainId(contractAddress);

        WrappedAssetInfo storage wrappedErc20Info = _wrappedInfo[mainId];

        if (wrappedErc20Info.contractAddress == address(0)) {
            wrappedErc20Info.contractAddress = contractAddress;
            wrappedErc20Info.subIds.push(0);
            wrappedErc20Info.fractions.push(amount);
            wrappedErc20Info.balances.push(amount);
        } else {
            wrappedErc20Info.fractions[0] += amount;
            wrappedErc20Info.balances[0] += amount;
        }

        token.safeTransferFrom(_msgSender(), address(this), amount);

        _baseAsset.createAsset(_msgSender(), mainId, 0, amount);

        emit ERC20Wrapped(
            _msgSender(),
            contractAddress,
            mainId,
            amount,
            _nonce.current(_msgSender())
        );
    }

    function _wrapERC721(
        address contractAddress,
        uint256 tokenId,
        uint256 amount
    ) private isWhitelisted(contractAddress) returns (uint256 mainId) {
        if (!contractAddress.supportsInterface(_ERC721_INTERFACE_ID)) {
            revert UnsupportedInterface();
        }

        IERC721 token = IERC721(contractAddress);

        if (_msgSender() != token.ownerOf(tokenId)) {
            revert InvalidOwner();
        }

        mainId = getMainId(contractAddress);

        if (_baseAsset.totalSubSupply(mainId, tokenId) != 0) {
            revert AssetAlreadyCreated();
        }

        WrappedAssetInfo storage wrappedErc721Info = _wrappedInfo[mainId];

        wrappedErc721Info.contractAddress = contractAddress;
        wrappedErc721Info.subIds.push(tokenId);
        wrappedErc721Info.fractions.push(amount);
        wrappedErc721Info.balances.push(amount);

        token.safeTransferFrom(_msgSender(), address(this), tokenId, "");

        _baseAsset.createAsset(_msgSender(), mainId, tokenId, amount);

        emit ERC721Wrapped(
            _msgSender(),
            contractAddress,
            mainId,
            tokenId,
            _nonce.current(_msgSender())
        );
    }

    function _wrapERC1155(
        address contractAddress,
        uint256 tokenId,
        uint256 amount
    ) private isWhitelisted(contractAddress) returns (uint256 mainId) {
        if (amount == 0) {
            revert InvalidBalance();
        }

        if (!contractAddress.supportsInterface(_ERC1155_INTERFACE_ID)) {
            revert UnsupportedInterface();
        }

        IERC1155 token = IERC1155(contractAddress);
        uint256 actualBalance = token.balanceOf(_msgSender(), tokenId);

        if (actualBalance < amount) {
            revert NotEnoughBalance();
        }

        mainId = getMainId(contractAddress);

        WrappedAssetInfo storage wrappedErc1155Info = _wrappedInfo[mainId];

        if (
            wrappedErc1155Info.contractAddress == address(0) ||
            _subidIndex[mainId][tokenId] == 0
        ) {
            wrappedErc1155Info.contractAddress = contractAddress;
            wrappedErc1155Info.subIds.push(tokenId);
            wrappedErc1155Info.fractions.push(amount);
            wrappedErc1155Info.balances.push(amount);
            _subidIndex[mainId][tokenId] = wrappedErc1155Info.subIds.length - 1;
        } else {
            uint256 subIdIndex = _subidIndex[mainId][tokenId];
            wrappedErc1155Info.fractions[subIdIndex] += amount;
            wrappedErc1155Info.balances[subIdIndex] += amount;
        }

        token.safeTransferFrom(
            _msgSender(),
            address(this),
            tokenId,
            amount,
            ""
        );

        _baseAsset.createAsset(_msgSender(), mainId, tokenId, amount);

        emit ERC1155Wrapped(
            _msgSender(),
            contractAddress,
            mainId,
            tokenId,
            amount,
            _nonce.current(_msgSender())
        );
    }

    function _unwrapERC20(
        address receiver,
        uint256 mainId,
        uint256 amount
    ) private {
        uint256 actualBalance = _baseAsset.subBalanceOf(receiver, mainId, 0);

        if (actualBalance < amount) {
            revert NotEnoughBalance();
        }

        WrappedAssetInfo storage wrappedErc20Info = _wrappedInfo[mainId];

        IERC20 token = IERC20(wrappedErc20Info.contractAddress);

        wrappedErc20Info.fractions[0] -= amount;
        wrappedErc20Info.balances[0] -= amount;

        _baseAsset.burnAsset(receiver, mainId, 0, amount);

        token.safeTransfer(receiver, amount);
        updateBaseAssetInfo(_msgSender(), mainId, 0);
        emit ERC20Unwrapped(
            receiver,
            wrappedErc20Info.contractAddress,
            mainId,
            amount
        );
    }

    function _unwrapERC721(
        address receiver,
        uint256 mainId,
        uint256 subId
    ) private {
        WrappedAssetInfo storage wrappedErc721Info = _wrappedInfo[mainId];

        if (wrappedErc721Info.contractAddress == address(0)) {
            revert InvalidAddress();
        }

        if (wrappedErc721Info.fractions[_subidIndex[mainId][subId]] == 0) {
            revert WrongAssetId();
        }

        IERC721 token = IERC721(wrappedErc721Info.contractAddress);

        _baseAsset.burnAsset(
            receiver,
            mainId,
            subId,
            _baseAsset.subBalanceOf(receiver, mainId, subId)
        );

        token.safeTransferFrom(address(this), receiver, subId, "");
        updateBaseAssetInfo(_msgSender(), mainId, subId);
        emit ERC721Unwrapped(
            receiver,
            wrappedErc721Info.contractAddress,
            mainId,
            subId
        );

        delete _wrappedInfo[mainId];
    }

    function _unwrapERC1155(
        address receiver,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) private {
        WrappedAssetInfo storage wrappedErc1155Info = _wrappedInfo[mainId];

        uint256 actualBalance = _baseAsset.subBalanceOf(
            receiver,
            mainId,
            subId
        );

        if (actualBalance < amount) {
            revert NotEnoughBalance();
        }

        uint256 subIdIndex = _subidIndex[mainId][subId];
        wrappedErc1155Info.fractions[subIdIndex] -= amount;
        wrappedErc1155Info.balances[subIdIndex] -= amount;

        _baseAsset.burnAsset(receiver, mainId, subId, amount);

        IERC1155 token = IERC1155(wrappedErc1155Info.contractAddress);

        token.safeTransferFrom(address(this), receiver, subId, amount, "");

        updateBaseAssetInfo(_msgSender(), mainId, subId);

        emit ERC1155Unwrapped(
            receiver,
            wrappedErc1155Info.contractAddress,
            mainId,
            subId,
            amount
        );
    }
}
