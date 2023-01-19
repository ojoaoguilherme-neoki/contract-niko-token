// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NeokiNFTs is ERC1155, ERC1155Burnable, Ownable {
    using Counters for Counters.Counter;
    using SafeERC20 for ERC20;
    ERC20 public niko;
    address public foundation;
    uint256 public mintingFee = 5 ether; // 5 Niko tokens as fee, 5 ether == 5 x 10x^18
    mapping(uint256 => string) private _uris;
    Counters.Counter public _tokenIdCounter;

    constructor(address _nikoAddress, address _foundation) ERC1155("") {
        niko = ERC20(_nikoAddress);
        foundation = payable(_foundation);
    }

    modifier whenPayedFee() {
        require(
            niko.allowance(msg.sender, address(this)) >= mintingFee,
            "Not enough Niko sent to pay the minting fee."
        );
        _;
    }

    /**
     * @dev mints a new token id, tokens that were already minted will fail
     * @param account is the address that will be recieving the new generated token ID
     * @param amount supply generated of `id` token
     * @param tokenURI is the URL that points to `id` token metadata
     * @param data it an hex value that can be sent "0x" if there ir no value to send
     */
    function mint(
        address account,
        uint256 amount,
        string memory tokenURI,
        bytes memory data
    ) public whenPayedFee returns (uint256 tokenId) {
        niko.safeTransferFrom(msg.sender, address(this), mintingFee);
        niko.safeTransfer(foundation, mintingFee);
        _tokenIdCounter.increment();
        _mint(account, _tokenIdCounter.current(), amount, data);
        setTokenUri(_tokenIdCounter.current(), tokenURI);
        return _tokenIdCounter.current();
    }

    function updateFoundation(address newAddress) public onlyOwner {
        foundation = newAddress;
    }

    function adminMint(
        address receiver,
        uint256 amount,
        string memory tokenURI
    ) public onlyOwner {
        _tokenIdCounter.increment();
        _mint(receiver, _tokenIdCounter.current(), amount, "0x");
        setTokenUri(_tokenIdCounter.current(), tokenURI);
    }

    // /**
    //  * @dev mints am array of new token ids, tokens that were already minted will fail.
    //  * the arrays of parameters needs to have the same lenght for correct minting
    //  * @param to is the address that will be recieving the new generated token IDs
    //  * @param ids new token IDs, canot be an ID that was already used
    //  * @param amounts supply generated of `id` token
    //  * @param tokenURI is the URL that points to `id` token metadata
    //  * @param data it an hex value that can be sent "0x" if there ir no value to send
    //  */
    // function mintBatch(
    //     address to,
    //     uint256[] memory ids,
    //     uint256[] memory amounts,
    //     string[] memory tokenURI,
    //     bytes memory data
    // ) public whenPayedFee {
    //     _mintBatch(to, ids, amounts, data);

    //     for (uint256 i = 0; i < ids.length; i++) {
    //         _tokenIdCounter.increment();
    //         setTokenUri(ids[i], tokenURI[i]);
    //     }
    // }

    /**
     * @dev returns the URI of a given token
     * @param tokenId the token id of the desired URI search
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return (_uris[tokenId]);
    }

    /**
     * @dev sets the token URI to the metadata file
     * @param tokenId the token id, cannot be set more than once
     * @param tokenURI the string URL
     */
    function setTokenUri(uint256 tokenId, string memory tokenURI) internal {
        require(
            bytes(_uris[tokenId]).length == 0,
            "Can not set the URI twice."
        );
        _uris[tokenId] = tokenURI;
    }
}
