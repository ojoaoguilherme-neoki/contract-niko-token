// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NeokiLands is ERC721Enumerable, AccessControl {
    using Counters for Counters.Counter;
    using Strings for *;
    Counters.Counter private _tokenIdCounter;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant totalLands = 423801;
    uint256 public constant totalSellingLands = 211900;

    string public baseURI;
    uint256 public lockedLandsUntil;

    constructor(address[] memory minters) ERC721("Neoki Lands", "LAND") {
        lockedLandsUntil = block.timestamp + 365 days;
        _grantRole(ADMIN_ROLE, msg.sender);
        for (uint256 i = 0; i < minters.length; i++) {
            _grantRole(MINTER_ROLE, minters[i]);
        }
    }

    modifier onlyAfterOneYear() {
        require(
            block.timestamp > lockedLandsUntil,
            "Time to mint auction lands still not reached."
        );
        require(
            _tokenIdCounter.current() <= totalLands,
            "Lands total supply reached."
        );
        _;
    }

    modifier onlyAvailableSellingLands() {
        require(
            _tokenIdCounter.current() <= totalSellingLands,
            "Total sell supply reached."
        );
        _;
    }

    function addAccountToMinter(address account) public onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }

    function removeAccountFromMinter(
        address account
    ) public onlyRole(ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }

    function addAccountToAdmin(address account) public onlyRole(ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, account);
    }

    function removeAccountFromAdmin(
        address account
    ) public onlyRole(ADMIN_ROLE) {
        _revokeRole(ADMIN_ROLE, account);
    }

    function mint(
        uint256[] memory tokenIds,
        address caller
    ) public onlyAvailableSellingLands onlyRole(MINTER_ROLE) {
        for (uint256 index; index < tokenIds.length; index++) {
            _tokenIdCounter.increment();
            _safeMint(caller, tokenIds[index]);
        }
    }

    /**
     * @dev Neoki project has rights to mint after 1 year 50% of lands that has not been minted
     * define if after a year the tokens will be minted all at once or by demand
     * @param tokenID lands ID
     */
    function mintAuctionLands(
        uint256[] memory tokenID
    ) public onlyAfterOneYear onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i <= tokenID.length; i++) {
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenID[i]);
        }

        ///If we decide to mint all at once after 1 year
        // for (
        //     uint256 currentIndex = _tokenIdCounter.current();
        //     currentIndex <= totalLands;
        //     i++
        // ) {
        //     _tokenIdCounter.increment();
        //     _safeMint(msg.sender, _tokenIdCounter.current());
        // }
    }

    /**
     * @dev updates the baseURI
     * @param newURI new base or root directory to link the token IDs
     */
    function setBaseURI(string memory newURI) public onlyRole(ADMIN_ROLE) {
        baseURI = newURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function getTokenStatus(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev calls the metadata of a specific `tokenID` from concatenating the
     *  returned value of `_baseURI` and the `tokenId`
     *
     * @param _tokenId lands token ID
     */

    //previouse example
    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        return
            string(abi.encodePacked(_baseURI(), _tokenId.toString(), ".json"));
    }

    /// // The following functions are overrides required by Solidity.
    /// function _beforeTokenTransfer(
    ///     address from,
    ///     address to,
    ///     uint256 tokenId
    /// ) internal override(ERC721, ERC721Enumerable) {
    ///     super._beforeTokenTransfer(from, to, tokenId);
    /// }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Enumerable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    receive() external payable {}

    fallback() external payable {}
}
