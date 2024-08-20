// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { EIP712Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import { ListedAssetInfo, BaseAssetIdentifiers, IMarketplace, IERC20 } from "contracts/Marketplace/interface/IMarketplace.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { ERC165Checker } from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { IFeeManager } from "contracts/Marketplace/interface/IFeeManager.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { IBaseAsset } from "contracts/Asset/interface/IBaseAsset.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { Counters } from "contracts/lib/Counters.sol";
import "hardhat/console.sol";

/**
 * @title The common marketplace for the all types of ERC-6960 assets
 * @author SoliChain - Mutaz Abu Alrub - Adam Budjema - Mohammad Hammoud
 */
contract Marketplace is
    Initializable,
    Context,
    ERC165,
    EIP712Upgradeable,
    AccessControl,
    ReentrancyGuardUpgradeable,
    IMarketplace
{
    using SafeERC20 for IERC20;
    using ERC165Checker for address;
    using Counters for Counters.Counter;

    IBaseAsset private _baseAsset;
    IFeeManager private _feeManager;
    Counters.Counter private _nonce;

    mapping(uint256 => mapping(uint256 => mapping(address => ListedAssetInfo)))
        private _listedAssetInfo;

    // solhint-disable-next-line var-name-mixedcase
    bytes32 private constant _OFFER_TYPEHASH =
        keccak256(
            abi.encodePacked(
                "offer(",
                "address owner,",
                "address offeror,",
                "address token,",
                "uint256 offerPrice,",
                "uint256 mainId,",
                "uint256 subId,",
                "uint256 fractionsToBuy,",
                "uint256 nonce,",
                "uint256 deadline",
                ")"
            )
        );
    bytes4 private constant _ASSET_INTERFACE_ID = type(IBaseAsset).interfaceId;

    bytes4 private constant _FEEMANAGER_INTERFACE_ID =
        type(IFeeManager).interfaceId;

    /**
     * @dev Initializer for the main Marketplace
     * @param baseAasset_, Address of the base asset collection used in the marketplace
     * @param feeManager_, Address of the fee manager
     */
    function initialize(
        address baseAasset_,
        address feeManager_
    ) external initializer {
        __EIP712_init("Voyfinance", "1.0");
        __ReentrancyGuard_init();

        if (!baseAasset_.supportsInterface(_ASSET_INTERFACE_ID)) {
            revert UnsupportedInterface();
        }

        _baseAsset = IBaseAsset(baseAasset_);
        _setFeeManager(feeManager_);
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @dev See {IMarketplace-offer}.
     */
    function offer(
        address owner,
        address offeror,
        address token,
        uint256 offerPrice,
        uint256 mainId,
        uint256 subId,
        uint256 fractionsToBuy,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        {
            if (block.timestamp > deadline) {
                revert OfferExpired();
            }
            if (_msgSender() != owner) {
                revert InvalidOwner();
            }

            uint256 nonce = _nonce.useNonce(offeror);
            bytes32 offerHash = keccak256(
                abi.encode(
                    _OFFER_TYPEHASH,
                    owner,
                    offeror,
                    token,
                    offerPrice,
                    mainId,
                    subId,
                    fractionsToBuy,
                    nonce,
                    deadline
                )
            );

            bytes32 hash = _hashTypedDataV4(offerHash);
            address signer = ECDSA.recover(hash, v, r, s);
            if (signer != offeror) {
                revert InvalidSignature();
            }
        }
        {
            _buyOffer(
                mainId,
                subId,
                offerPrice,
                fractionsToBuy,
                owner,
                offeror,
                token
            );
        }
    }

    /**
     * @dev See {IMarketplace-batchList}.
     */
    function batchList(
        uint256[] calldata mainIds,
        uint256[] calldata subIds,
        ListedAssetInfo[] calldata listedAssetInfo
    ) external {
        uint256 length = mainIds.length;
        if (length > 30) {
            revert BatchLimitExceeded();
        }

        if (subIds.length != length || length != listedAssetInfo.length) {
            revert NoArrayParity();
        }

        for (uint256 i = 0; i < length; ) {
            list(mainIds[i], subIds[i], listedAssetInfo[i]);
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev See {IMarketplace-batchUnlist}.
     */
    function batchUnlist(
        uint256[] calldata mainIds,
        uint256[] calldata subIds
    ) external {
        uint256 length = mainIds.length;
        if (length > 30) {
            revert BatchLimitExceeded();
        }

        if (subIds.length != length) {
            revert NoArrayParity();
        }
        for (uint256 i = 0; i < length; ) {
            unlist(mainIds[i], subIds[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev See {IMarketplace-batchBuy}.
     */
    function batchBuy(
        uint256[] calldata mainIds,
        uint256[] calldata subIds,
        uint256[] calldata fractionsToBuy,
        address[] calldata owners
    ) external {
        uint256 length = subIds.length;
        if (length > 30) {
            revert BatchLimitExceeded();
        }

        if (
            mainIds.length != length ||
            length != fractionsToBuy.length ||
            length != owners.length
        ) {
            revert NoArrayParity();
        }
        for (uint256 i = 0; i < length; ) {
            buy(mainIds[i], subIds[i], fractionsToBuy[i], owners[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev See {IMarketplace-setFeeManager}.
     */
    function setFeeManager(
        address newFeeManager
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setFeeManager(newFeeManager);
    }

    /**
     * @dev See {IMarketplace-getFeeManager}.
     */
    function getFeeManager() external view returns (address) {
        return address(_feeManager);
    }

    /**
     * @dev See {IMarketplace-getBaseAsset}.
     */
    function getBaseAsset() external view returns (address) {
        return address(_baseAsset);
    }

    /**
     * @dev See {IMarketplace-DOMAIN_SEPARATOR}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view virtual returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev See {IMarketplace-getNonce}.
     */
    function getNonce(
        address owner
    ) external view virtual override returns (uint256) {
        return _nonce.current(owner);
    }

    /**
     * @dev See {IMarketplace-getPropertyInfo}.
     */
    function getListedAssetInfo(
        address owner,
        uint256 assetMainId,
        uint256 assetSubId
    ) external view returns (ListedAssetInfo memory) {
        return _listedAssetInfo[assetMainId][assetSubId][owner];
    }

    /**
     * @dev List an asset based on main id and sub id
     * @dev Checks and validate listed fraction to be greater than min fraction
     * @dev Validates if listed fractions is less than owner current balance
     * @param mainId, unique identifier of the asset
     * @param subId, unique identifier of the asset
     * @param listedAssetInfo, information of listed asset including salePrice, listedFraction, minFraction and token of sale
     */
    function list(
        uint256 mainId,
        uint256 subId,
        ListedAssetInfo calldata listedAssetInfo
    ) public {
        if (address(listedAssetInfo.token) == address(0)) {
            revert InvalidAddress();
        }
        if (listedAssetInfo.minFraction == 0) {
            revert InvalidMinFraction();
        }
        if (listedAssetInfo.listedFractions < listedAssetInfo.minFraction) {
            revert InvalidFractionToList();
        }
        if (listedAssetInfo.fractionPriceInToken == 0) {
            revert InvalidPrice();
        }

        uint256 baseAssetBalance = _baseAsset.subBalanceOf(
            _msgSender(),
            mainId,
            subId
        );

        if (baseAssetBalance < listedAssetInfo.listedFractions) {
            revert NotEnoughBalance();
        }

        _listedAssetInfo[mainId][subId][_msgSender()] = listedAssetInfo;

        emit AssetListed(_msgSender(), mainId, subId, listedAssetInfo);
    }

    /**
     * @dev Unlist an asset based on main id and sub id
     * @param mainId, unique identifier of the asset
     * @param subId, unique identifier of the asset
     */
    function unlist(uint256 mainId, uint256 subId) public {
        if (
            _listedAssetInfo[mainId][subId][_msgSender()].listedFractions == 0
        ) {
            revert AlreadyUnlisted();
        }

        delete _listedAssetInfo[mainId][subId][_msgSender()];

        emit AssetUnlisted(_msgSender(), mainId, subId);
    }

    /**
     * @dev Safe transfer asset to marketplace and transfer the price to the prev owner
     * @dev Transfer the price to previous owner if it is not the first buy
     * @dev Transfer buying fee or initial fee to fee wallet based on asset status
     * @param mainId, unique identifier of the asset
     * @param subId, unique identifier of the asset
     * @param fractionsToBuy, number of fractions to buy from owner address
     * @param owner, address of owner of the fraction of asset
     */
    function buy(
        uint256 mainId,
        uint256 subId,
        uint256 fractionsToBuy,
        address owner
    ) public nonReentrant {
        ListedAssetInfo memory listedAssetInfo = _listedAssetInfo[mainId][
            subId
        ][owner];
        uint256 listedFractions = listedAssetInfo.listedFractions;

        if (fractionsToBuy < listedAssetInfo.minFraction) {
            revert InvalidFractionToBuy();
        }
        if (listedFractions < fractionsToBuy) {
            revert NotEnoughListed();
        }
        if (fractionsToBuy > _baseAsset.subBalanceOf(owner, mainId, subId)) {
            revert NotEnoughBalance();
        }

        uint256 payPrice = listedAssetInfo.fractionPriceInToken *
            fractionsToBuy;
        uint256 fee = _feeManager.getBuyingFee(mainId, subId);
        fee = (payPrice * fee) / 1e4;

        if (listedFractions == fractionsToBuy) {
            delete _listedAssetInfo[mainId][subId][owner];
        } else {
            _listedAssetInfo[mainId][subId][owner].listedFractions =
                listedFractions -
                fractionsToBuy;
        }
        _baseAsset.addShareholder(_msgSender(), mainId, subId);

        _baseAsset.safeTransferFrom(
            owner,
            _msgSender(),
            mainId,
            subId,
            fractionsToBuy,
            ""
        );

        _updateBaseAssetInfo(owner, mainId, subId);

        listedAssetInfo.token.safeTransferFrom(_msgSender(), owner, payPrice);

        listedAssetInfo.token.safeTransferFrom(
            _msgSender(),
            _feeManager.getFeeWallet(),
            fee
        );

        emit AssetBought(
            owner,
            _msgSender(),
            mainId,
            subId,
            listedAssetInfo.fractionPriceInToken,
            payPrice,
            fractionsToBuy,
            address(listedAssetInfo.token)
        );
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, AccessControl) returns (bool) {
        return
            interfaceId == type(IMarketplace).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _updateBaseAssetInfo(
        address owner,
        uint256 mainId,
        uint256 subId
    ) internal {
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

    function _buyOffer(
        uint256 mainId,
        uint256 subId,
        uint256 offerPrice,
        uint256 fractionsToBuy,
        address owner,
        address buyer,
        address token
    ) private {
        uint256 ownerBaseAssetBalance = _baseAsset.subBalanceOf(
            owner,
            mainId,
            subId
        );

        if (fractionsToBuy > ownerBaseAssetBalance) {
            revert NotEnoughBalance();
        }

        uint256 payPrice = offerPrice * fractionsToBuy;
        uint256 fee = _feeManager.getBuyingFee(mainId, subId);
        fee = (payPrice * fee) / 1e4;

        if (fractionsToBuy == ownerBaseAssetBalance) {
            delete _listedAssetInfo[mainId][subId][_msgSender()];
        }

        _baseAsset.addShareholder(buyer, mainId, subId);
        _baseAsset.safeTransferFrom(
            owner,
            buyer,
            mainId,
            subId,
            fractionsToBuy,
            ""
        );

        _updateBaseAssetInfo(owner, mainId, subId);

        IERC20(token).safeTransferFrom(buyer, owner, payPrice);
        IERC20(token).safeTransferFrom(buyer, _feeManager.getFeeWallet(), fee);

        emit AssetBought(
            owner,
            buyer,
            mainId,
            subId,
            offerPrice,
            payPrice,
            fractionsToBuy,
            token
        );
    }

    /**
     * @notice Allows to set a new address for the fee manager.
     * @dev Fee manager should support IFeeManager interface
     * @param newFeeManager, Address of the new fee manager
     */
    function _setFeeManager(address newFeeManager) private {
        if (!newFeeManager.supportsInterface(_FEEMANAGER_INTERFACE_ID)) {
            revert UnsupportedInterface();
        }

        emit FeeManagerSet(address(_feeManager), newFeeManager);
        _feeManager = IFeeManager(newFeeManager);
    }
}
