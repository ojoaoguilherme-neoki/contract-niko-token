// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./NeokiNFTs.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract NFTMarketplace is ERC1155Holder, Ownable {
    using Counters for Counters.Counter;
    using SafeERC20 for ERC20;
    Counters.Counter public _nftsSold;
    Counters.Counter public _totalItems;
    Counters.Counter public _totalSoledItems;
    Counters.Counter public _unavailableItems;

    address public foundation;
    address public stakingPool;
    uint16 public listingFee;
    NeokiNFTs public nkoNFT;
    ERC20 public nko;

    struct MarketItem {
        uint256 itemId;
        uint256 tokenId;
        uint256 amount;
        uint256 price;
        address owner;
        address nftContract;
    }

    mapping(uint256 => MarketItem) marketItem;

    constructor(
        address _foundation,
        address _stakingPool,
        address _nko,
        address _nkoNFT
    ) {
        foundation = _foundation;
        stakingPool = _stakingPool;
        nko = ERC20(_nko);
        nkoNFT = NeokiNFTs(_nkoNFT);
        listingFee = 4;
    }

    /**
     * @dev `getFees` returns all assocciated fees from the contract
     * @return nftFee fee cost for generating an NFT from `NeokiNFTs`
     * @return totalFee sum of `nftFee` and `listFee` which `listFee` is only applied on sell
     * @return listFee is the selling porcentage
     */
    function getFees()
        public
        view
        returns (uint256 nftFee, uint256 totalFee, uint256 listFee)
    {
        nftFee = nkoNFT.mintingFee();
        totalFee = nftFee + listingFee;
        listFee = listingFee;
        return (nftFee, totalFee, listFee);
    }

    /**
     * @dev Mints and list the `_tokenId` to the marketplace in one transaction
     * only works for Neoki NFT contract
     *
     * @param _amount the amount of `_tokenID` to mint
     * @param _price the price of each `_tokenID` that the user wants to sell
     * @param tokenURI the URL that links to `_tokenId` metadata
     * @param data an hex data to send if needed if not send a value of "0x"
     */
    function mintAndListItem(
        uint256 _amount,
        uint256 _price,
        string memory tokenURI,
        bytes calldata data
    ) public returns (MarketItem memory) {
        uint256 nftMintFee = nkoNFT.mintingFee();
        require(
            nko.allowance(msg.sender, address(this)) >= nftMintFee,
            "Not enough NKO sent to mint an NFT"
        );
        nko.safeTransferFrom(msg.sender, address(this), nftMintFee);
        nko.safeApprove(address(nkoNFT), nftMintFee);
        uint256 lastTokenId = nkoNFT.mint(
            address(this),
            _amount,
            tokenURI,
            data
        );

        _totalItems.increment();
        marketItem[_totalItems.current()] = MarketItem({
            itemId: _totalItems.current(),
            tokenId: lastTokenId,
            amount: _amount,
            price: _price,
            owner: msg.sender,
            nftContract: address(nkoNFT)
        });

        emit CreatedAndListed(
            _totalItems.current(),
            lastTokenId,
            _amount,
            _price,
            msg.sender,
            address(nkoNFT)
        );
        return marketItem[_totalItems.current()];
    }

    /**
     * @dev List ERC721/ERC1155 tokens to the marketplace
     * @param _nft `_tokenId` contract address
     * @param _tokenId the token ID that will be listed
     * @param _amount the amount of `_tokenId` tokens that will be listed
     * @param _price the of a unit of `_tokenId` token that will be soled
     * @param data an hex data to send if needed if not send a value of "0x"
     */
    function listItem(
        address _nft,
        uint256 _tokenId,
        uint256 _amount,
        uint256 _price,
        bytes calldata data
    ) public {
        IERC1155(_nft).safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId,
            _amount,
            data
        );
        _totalItems.increment();
        marketItem[_totalItems.current()] = MarketItem({
            itemId: _totalItems.current(),
            tokenId: _tokenId,
            amount: _amount,
            price: _price,
            owner: msg.sender,
            nftContract: _nft
        });

        emit NewListing(
            _totalItems.current(),
            _tokenId,
            _amount,
            _price,
            msg.sender,
            _nft
        );
    }

    /**
     * @dev Buy a listed item on the marketplace. It's possible to buy a `_amount`
     * of the collection of `_itemId`
     * @param _itemId the unique identifier of the item listed on the marketplace
     * @param _amount amount of the `_tokenId` listed on the marketplace
     */
    function buyItem(uint256 _itemId, uint256 _amount) public {
        require(_amount > 0, "Cannot buy amount of 0.");
        MarketItem storage item = marketItem[_itemId];
        uint256 paying = item.price * _amount;
        require(
            nko.allowance(msg.sender, address(this)) >= paying,
            "Not enough NKO allowed to buy the item."
        );

        uint256 feeAmount = (paying * listingFee) / 100;
        nko.safeTransferFrom(msg.sender, address(this), paying);
        nko.safeTransfer(item.owner, paying - feeAmount);
        nko.safeTransfer(foundation, feeAmount / 2);
        nko.safeTransfer(stakingPool, feeAmount / 2);
        IERC1155 nft = IERC1155(item.nftContract);
        nft.safeTransferFrom(
            address(this),
            msg.sender,
            item.tokenId,
            _amount,
            ""
        );
        item.amount -= _amount;

        for (uint i = 0; i < _amount; i++) {
            _nftsSold.increment();
        }
        if (item.amount == 0) {
            _totalSoledItems.increment();
            _unavailableItems.increment();
            delete marketItem[_itemId];
            emit DeleteItem(_itemId);
        }

        emit NewBuying(
            item.itemId,
            item.tokenId,
            item.price,
            item.amount,
            item.owner,
            item.nftContract,
            msg.sender,
            _amount,
            paying
        );
    }

    /**
     * @dev Gets all the marketplace items listed
     */
    function getAllItems() public view returns (MarketItem[] memory) {
        uint256 unsoldItemCount = _totalItems.current() -
            _unavailableItems.current();
        uint256 itemIndex;
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);

        for (uint256 i = 0; i < _totalItems.current(); i++) {
            MarketItem storage item = marketItem[i + 1];
            if (item.amount > 0) {
                items[itemIndex] = item;
                itemIndex++;
            }
        }
        return items;
    }

    /**
     * @dev gets all the user's listed items in the marketplace that has an
     * amount greater than zero
     */
    function getAllUserListings() public view returns (MarketItem[] memory) {
        uint256 itemCount = _totalItems.current() - _unavailableItems.current();
        MarketItem[] memory items = new MarketItem[](itemCount);
        uint256 itemIndex;
        for (uint256 i = 0; i < _totalItems.current(); i++) {
            MarketItem storage item = marketItem[i + 1];
            if (item.owner == msg.sender && item.amount > 0) {
                items[itemIndex] = item;
                itemIndex++;
            }
        }
        return items;
    }

    /**
     * @dev Updates the price of a unit listed of the`_itemId`
     * @param _itemId the unique identifier of the item listed on the marketplace
     * @param _newPrice the new price of the unit amount of
     */
    function updateMyListingItemPrice(
        uint256 _itemId,
        uint256 _newPrice
    ) public {
        MarketItem storage item = marketItem[_itemId];
        require(item.owner == msg.sender, "Not the owner of the listed item");
        item.price = _newPrice;
    }

    /**
     * @dev Updates by adding the amount of listed `_itemId` amount
     * @param _itemId unique identifier of the item listed on the marketplace
     * @param _tokenId tokenId of the same `tokenId` of the listed `_itemId`
     * @param _addingAmount the amount of the same `tokenId` of the listed `_itemId`
     */
    function addMyListingItemAmount(
        uint256 _itemId,
        uint256 _addingAmount,
        uint256 _tokenId
    ) public {
        MarketItem storage item = marketItem[_itemId];
        require(item.owner == msg.sender, "Not the owner of the listed item");
        require(
            item.tokenId == _tokenId,
            "Not the same tokenId listed on the marketplace"
        );
        IERC1155 nft = IERC1155(item.nftContract);

        nft.safeTransferFrom(
            msg.sender,
            address(this),
            item.tokenId,
            _addingAmount,
            ""
        );
        item.amount += _addingAmount;
    }

    /**
     * @dev removes the amount of a listed `_itemId` and sends back to the owner
     * @param _itemId the unique identifier of the item listed on the marketplace
     * @param _removeAmount the amount of `_tokenId` sent back to the owner
     */
    function removeMyListingItemAmount(
        uint256 _itemId,
        uint256 _removeAmount
    ) public {
        MarketItem storage item = marketItem[_itemId];
        require(item.owner == msg.sender, "Not the owner of the listed item");
        IERC1155 nft = IERC1155(item.nftContract);
        nft.safeTransferFrom(
            address(this),
            msg.sender,
            item.tokenId,
            _removeAmount,
            ""
        );
        item.amount -= _removeAmount;
        if (item.amount == 0) {
            _unavailableItems.increment();
            delete marketItem[_itemId];
        }
    }

    /**
     * @dev only the contract owner can call, updates the `listingFee`
     * @param amount the new listing price the contract owner wants to set
     *  listing fee has to receive values as following 1, 4, 7 to represent
     *  1%, 4% and 7% to be correctly calculated in the contract
     */
    function updateListingFee(uint16 amount) public onlyOwner {
        listingFee = amount;
    }

    /**
     * @dev only the contract owner can call, updates the `stakinPool` address
     * @param newAddress is overriding the stakingPool address
     */
    function updateStakingPool(address newAddress) public onlyOwner {
        stakingPool = newAddress;
    }

    /**
     * @dev only the contract owner can call, updates the `foundation` address
     * @param newAddress is overriding the foundation address
     */
    function updateFoundation(address newAddress) public onlyOwner {
        foundation = newAddress;
    }

    /**
     * @dev only the contract owner can call, updates the `nko` address
     * @param newAddress is overriding the nko address
     */
    function updateTokenAddress(address newAddress) public onlyOwner {
        nko = ERC20(newAddress);
    }

    /**
     * @dev only the contract owner can call, updates the `nkoNFT` address
     * @param newAddress is overriding the nkoNFT address
     */
    function updateNeokiNftAddress(address newAddress) public onlyOwner {
        nkoNFT = NeokiNFTs(newAddress);
    }

    event CreatedAndListed(
        uint256 itemId,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        address owner,
        address nftContract
    );

    event NewListing(
        uint256 itemId,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        address owner,
        address nftContract
    );

    event NewBuying(
        uint256 itemId,
        uint256 tokenId,
        uint256 price,
        uint256 amount,
        address seller,
        address nftContract,
        address buyer,
        uint256 buyingAmount,
        uint256 payed
    );

    event DeleteItem(uint256 tokenId);
}
