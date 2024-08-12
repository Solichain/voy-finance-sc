// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { DLTEnumerable } from "dual-layer-token/contracts/DLT/extensions/DLTEnumerable.sol";
import { DLTPermit } from "dual-layer-token/contracts/DLT/extensions/DLTPermit.sol";
import { AssetInfo, IBaseAsset, BaseAssetIdentifiers } from "contracts/Asset/interface/IBaseAsset.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { DLT } from "dual-layer-token/contracts/DLT/DLT.sol";

/**
 * @title The asset contract based on ERC6960
 * @author SoliChain - Mutaz Abu Alrub - Adam Budjema - Mohammad Hammoud
 * @dev Manages creation of asset and rewards distribution
 */
contract BaseAsset is
    Context,
    ERC165,
    DLT,
    DLTEnumerable,
    DLTPermit,
    AccessControl,
    IBaseAsset
{
    // Create a new role identifier for the marketplace role
    bytes32 public constant ASSET_MANAGER =
        0x9c6e3ae929b539a99db03120eac7d9f862d68479b44f1eec05ab6036fcf56830;

    mapping(uint256 => mapping(uint256 => AssetInfo)) private _baseAssetInfo;
    mapping(uint256 => string) private _baseAssetURI;
    mapping(address => BaseAssetIdentifiers[]) private _ownerAssets;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        private _ownerAssetIndex;
    mapping(uint256 => mapping(uint256 => address[])) private _shareholders;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        private _shareholdersIndex;

    constructor(
        string memory name,
        string memory symbol,
        string memory version,
        string memory baseURI_
    ) DLT(name, symbol) DLTPermit(name, version) {
        _setBaseURI(1, baseURI_);
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @dev See {IBaseAsset-createAsset}.
     */
    function createAsset(
        address owner,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external onlyRole(ASSET_MANAGER) {
        _mint(owner, mainId, subId, amount);
        uint256 assetIndex = _ownerAssetIndex[mainId][subId][owner];
        _baseAssetInfo[mainId][subId].initialOwner = owner;

        if (_ownerAssets[owner][assetIndex].mainId == 0) {
            _ownerAssets[owner].push(BaseAssetIdentifiers(mainId, subId));
            _ownerAssetIndex[mainId][subId][owner] =
                _ownerAssets[owner].length -
                1;
            _shareholders[mainId][subId].push(owner);
        } else if (
            _shareholdersIndex[mainId][subId][owner] == 0 &&
            _shareholders[mainId][subId][0] != owner
        ) {
            _shareholders[mainId][subId].push(owner);
            _shareholdersIndex[mainId][subId][owner] =
                _shareholders[mainId][subId].length -
                1;
        }

        emit AssetCreated(owner, mainId, subId, amount);
    }

    /**
     * @dev See {IBaseAsset-burnAsset}.
     */
    function burnAsset(
        address owner,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external onlyRole(ASSET_MANAGER) {
        _burn(owner, mainId, subId, amount);
        uint256 ownerIndex = _shareholdersIndex[mainId][subId][owner];

        _shareholders[mainId][subId][ownerIndex] = _shareholders[mainId][subId][
            _shareholders[mainId][subId].length - 1
        ];

        _shareholders[mainId][subId].pop();

        _shareholdersIndex[mainId][subId][owner] = 0;

        _shareholdersIndex[mainId][subId][
            _shareholders[mainId][subId][ownerIndex]
        ] = ownerIndex;
        emit AssetBurnt(owner, mainId, subId, amount);
    }

    /**
     * @dev See {IBaseAsset-setBaseURI}.
     */
    function setBaseURI(
        uint256 mainId,
        string calldata newBaseURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(mainId, newBaseURI);
    }

    /**
     * @dev See {IBaseAsset-tokenURI}.
     */
    function tokenURI(
        uint256 mainId,
        uint256 subId
    ) external view returns (string memory) {
        string memory stringAssetSubId = Strings.toString(subId);
        return string.concat(_baseAssetURI[mainId], stringAssetSubId);
    }

    function getAssetInfo(
        uint256 mainId,
        uint256 subId
    ) external view returns (AssetInfo memory) {
        return _baseAssetInfo[mainId][subId];
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, AccessControl) returns (bool) {
        return
            interfaceId == type(IBaseAsset).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function getOwnerAssets(
        address owner
    ) public view virtual returns (BaseAssetIdentifiers[] memory) {
        return _ownerAssets[owner];
    }

    function getShareholdersInfo(
        uint256 mainId,
        uint256 subId
    ) public view virtual returns (address[] memory) {
        return _shareholders[mainId][subId];
    }

    function safeTransferFrom(
        address sender,
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) public virtual override returns (bool) {
        super.safeTransferFrom(sender, recipient, mainId, subId, amount, "");

        return true;
    }

    /**
     * @dev See {DLT-_mint}.
     */
    function _mint(
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) internal virtual override(DLT, DLTEnumerable) {
        super._mint(recipient, mainId, subId, amount);
    }

    /**
     * @dev See {DLT-_burn}.
     */
    function _burn(
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) internal virtual override(DLT, DLTEnumerable) {
        super._burn(recipient, mainId, subId, amount);
    }

    /**
     * @dev Changes the asset base URI
     * @param newBaseURI, String of the asset base URI
     */
    function _setBaseURI(uint256 mainId, string memory newBaseURI) private {
        emit AssetBaseURISet(mainId, _baseAssetURI[mainId], newBaseURI);
        _baseAssetURI[mainId] = newBaseURI;
    }
}
