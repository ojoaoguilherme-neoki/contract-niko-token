// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface ILand is IERC721Enumerable {
    function mint(uint256[] memory tokenIds, address caller) external;
}

contract LandSell is AccessControl {
    struct Map {
        uint256 tokenId;
        uint256 price;
    }
    IERC20 public nko;
    ILand public land;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant totalSelableLands = 211900;
    mapping(uint256 => uint256) public priceRange;
    mapping(uint256 => bool) public selable;
    address public treasury;

    constructor(address _nko, address _land, address _treasury) {
        nko = IERC20(_nko);
        land = ILand(_land);
        treasury = _treasury;
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function definePricePerRange(
        uint256 start,
        uint256 end,
        uint256 price
    ) public onlyRole(ADMIN_ROLE) {
        for (uint256 index = start; index <= end; index++) {
            priceRange[index] = price;
            selable[index] = true;
        }
    }

    function buyLand(uint256[] memory tokenIds) public {
        uint256 fullCost;
        for (uint256 index; index < tokenIds.length; index++) {
            /// todo verify is the land is already minted by an account
            fullCost += priceRange[tokenIds[index]];
            require(selable[tokenIds[index]] == true, "LAND not selable yet.");
        }
        nko.transferFrom(msg.sender, address(this), fullCost);
        nko.transfer(treasury, fullCost);
        land.mint(tokenIds, msg.sender);
    }

    function getPricePerRange(
        uint256 start,
        uint256 end
    ) public view returns (Map[] memory) {
        uint256 range = end - start;
        Map[] memory map = new Map[](range);
        uint256 mapIndex;
        for (uint256 index = start; index < end; index++) {
            map[mapIndex] = Map({tokenId: index, price: priceRange[index + 1]});
            mapIndex++;
        }
        return map;
    }

    function getTokenIdPrice(
        uint256 tokenId
    ) public view returns (uint256 price) {
        if (selable[tokenId] == true) {
            return priceRange[tokenId];
        } else {
            revert NotSelable(tokenId, "Not selling now");
        }
    }

    error NotSelable(uint256 tokenId, string message);
    error TokenAlreadyMinted(uint256 tokenId, string message);
}
