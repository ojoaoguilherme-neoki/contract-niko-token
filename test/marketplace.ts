import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("Testing ERC1155 Marketplace Smart Contract", function () {
  async function deployContractsFixture() {
    const [deployer, buyer, seller, foundation, stakePool, wallet1, wallet2] =
      await ethers.getSigners();
    const NKO = await ethers.getContractFactory("NikoToken");
    const NFTS = await ethers.getContractFactory("NeokiNFTs");
    const Marketplace = await ethers.getContractFactory("NFTMarketplace");
    const nko = await NKO.deploy(deployer.address);
    await nko.deployed();
    const nfts = await NFTS.deploy(nko.address, foundation.address);
    await nfts.deployed();

    const marketplace = await Marketplace.deploy(
      foundation.address,
      stakePool.address,
      nko.address,
      nfts.address
    );
    await marketplace.deployed();

    return {
      deployer,
      buyer,
      seller,
      foundation,
      stakePool,
      wallet1,
      wallet2,
      nko,
      nfts,
      marketplace,
    };
  }
  async function loadListingFixture() {
    const { deployer, seller, nko, marketplace, foundation, nfts, wallet1 } =
      await loadFixture(deployContractsFixture);
    const tx = await nko
      .connect(deployer)
      .transfer(seller.address, parseEther("2000"));
    await tx.wait();
    const nkoApprove = await nko
      .connect(seller)
      .approve(marketplace.address, parseEther("2000"));
    await nkoApprove.wait();
    return { seller, nko, marketplace, foundation, nfts, wallet1 };
  }

  async function loadExistingNftToListFixture() {
    const { nfts, seller, deployer, nko, marketplace } = await loadFixture(
      deployContractsFixture
    );
    const tx = await nko
      .connect(deployer)
      .transfer(seller.address, parseEther("2000"));
    await tx.wait();
    const nkoApprove = await nko
      .connect(seller)
      .approve(nfts.address, parseEther("2000"));
    await nkoApprove.wait();
    const createNft = await nfts
      .connect(seller)
      .mint(seller.address, "1", "tokenURI", "0x");
    await createNft.wait();
    const createNft2 = await nfts
      .connect(seller)
      .mint(seller.address, "30", "tokenURI", "0x");
    await createNft2.wait();
    const nftApprove = await nfts
      .connect(seller)
      .setApprovalForAll(marketplace.address, true);
    await nftApprove.wait();
    return { seller, marketplace, nfts };
  }

  async function loadListedItemsFixture() {
    const { seller, nfts, marketplace, nko, deployer, wallet1 } =
      await loadFixture(deployContractsFixture);

    const tx = await nko
      .connect(deployer)
      .transfer(seller.address, parseEther("2000"));
    await tx.wait();
    const nkoApprove = await nko
      .connect(seller)
      .approve(marketplace.address, parseEther("2000"));
    await nkoApprove.wait();

    // Creating and listing
    const createAndList = await marketplace
      .connect(seller)
      .mintAndListItem("1", parseEther("500"), "tokenURI", "0x");
    await createAndList.wait();

    // Listing a collection
    const nkoApproveToNFT = await nko
      .connect(seller)
      .approve(nfts.address, parseEther("2000"));
    await nkoApproveToNFT.wait();

    const createCollection = await nfts
      .connect(seller)
      .mint(seller.address, "30", "tokenURI", "0x");
    await createCollection.wait();

    const nftsApprove = await nfts
      .connect(seller)
      .setApprovalForAll(marketplace.address, true);
    await nftsApprove.wait();

    const listCollection = await marketplace
      .connect(seller)
      .listItem(nfts.address, "2", "25", parseEther("75"), "0x");
    await listCollection.wait();

    return {
      seller,
      nfts,
      marketplace,
      nko,
      deployer,
      wallet1,
    };
  }

  async function loadListedToBuyItemsFixture() {
    const {
      deployer,
      buyer,
      seller,
      foundation,
      stakePool,
      wallet1,
      wallet2,
      nko,
      nfts,
      marketplace,
    } = await loadFixture(deployContractsFixture);

    // transferring tokens to actors
    const tx = await nko
      .connect(deployer)
      .transfer(seller.address, parseEther("2000"));
    await tx.wait();
    const tx2 = await nko
      .connect(deployer)
      .transfer(buyer.address, parseEther("2000"));
    await tx2.wait();

    const nkoApprove = await nko
      .connect(seller)
      .approve(marketplace.address, parseEther("2000"));
    await nkoApprove.wait();

    const nkoApprove2 = await nko
      .connect(buyer)
      .approve(marketplace.address, parseEther("2000"));
    await nkoApprove2.wait();

    // creating and listing items to buy with buyer
    const createAndList = await marketplace
      .connect(seller)
      .mintAndListItem("1", parseEther("450"), "tokenURI", "0x");
    await createAndList.wait();

    const createAndListCollection = await marketplace
      .connect(seller)
      .mintAndListItem("45", parseEther("25"), "tokenURI", "0x");
    await createAndList.wait();
    await createAndListCollection.wait();
    return {
      deployer,
      buyer,
      seller,
      foundation,
      stakePool,
      wallet1,
      wallet2,
      nko,
      nfts,
      marketplace,
    };
  }

  describe("Marketplace Deployment", function () {
    it("Should deploy with correct NKO address", async function () {
      const { marketplace, nko } = await loadFixture(deployContractsFixture);
      expect(await marketplace.nko()).to.equal(nko.address);
    });
    it("Should deploy with correct ERC1155 address", async function () {
      const { marketplace, nfts } = await loadFixture(deployContractsFixture);
      expect(await marketplace.nkoNFT()).to.equal(nfts.address);
    });
    it("Should deploy with correct fee setup", async function () {
      const { marketplace } = await loadFixture(deployContractsFixture);
      expect(await marketplace.listingFee()).to.equal(4);
    });
    it("Should deploy with correct deployer wallet", async function () {
      const { marketplace, deployer } = await loadFixture(
        deployContractsFixture
      );
      expect(await marketplace.owner()).to.equal(deployer.address);
    });
  });
  describe("It should be able to Create and List NFT", function () {
    it("Should create a single NFT and list it to the marketplace", async function () {
      const { seller, marketplace } = await loadFixture(loadListingFixture);
      const createItem = await marketplace
        .connect(seller)
        .mintAndListItem("1", parseEther("200"), "tokenURI", "0x");
      await createItem.wait();
      const items = await marketplace.getAllItems();
      expect(items.length).to.be.greaterThan(0);
    });
    it("Should create a collection of NFTs and list it to the marketplace", async function () {
      const { seller, marketplace } = await loadFixture(loadListingFixture);
      const createItem = await marketplace
        .connect(seller)
        .mintAndListItem("25", parseEther("200"), "tokenURI", "0x");
      await createItem.wait();
      const items = await marketplace.getAllItems();
      expect(items[0].amount).to.be.greaterThan(1);
    });
    it("Should fail to create NFT if sender doesn't have NKO to pay creation fee", async function () {
      const { seller, nko, marketplace, wallet1 } = await loadFixture(
        loadListingFixture
      );
      const balanceOfSeller = await nko.balanceOf(seller.address);
      const sendAllOut = await nko
        .connect(seller)
        .transfer(wallet1.address, balanceOfSeller);
      await sendAllOut.wait();
      await expect(
        marketplace
          .connect(seller)
          .mintAndListItem("25", parseEther("200"), "tokenURI", "0x")
      ).to.be.rejectedWith("ERC20: transfer amount exceeds balance");
    });
    it("Should send create NFT fee to foundation", async function () {
      const { seller, nko, marketplace, foundation } = await loadFixture(
        loadListingFixture
      );
      await expect(
        marketplace
          .connect(seller)
          .mintAndListItem("25", parseEther("200"), "tokenURI", "0x")
      ).to.changeTokenBalances(
        nko,
        [seller, foundation],
        [parseEther("-5"), parseEther("5")]
      );
    });

    describe("Should create item with correct indexed information", function () {
      it("Should create an item with correct owner", async function () {
        const { seller, marketplace } = await loadFixture(loadListingFixture);
        const createItem = await marketplace
          .connect(seller)
          .mintAndListItem("25", parseEther("200"), "tokenURI", "0x");
        await createItem.wait();
        const items = await marketplace.getAllItems();
        expect(items[0].owner).to.equal(seller.address);
      });
      it("Should create an item with correct amount", async function () {
        const { seller, marketplace } = await loadFixture(loadListingFixture);
        const createItem = await marketplace
          .connect(seller)
          .mintAndListItem("30", parseEther("200"), "tokenURI", "0x");
        await createItem.wait();
        const items = await marketplace.getAllItems();
        expect(items[0].amount).to.equal(30);
      });
      it("Should create an item with correct price", async function () {
        const { seller, marketplace } = await loadFixture(loadListingFixture);
        const createItem = await marketplace
          .connect(seller)
          .mintAndListItem("25", parseEther("200"), "tokenURI", "0x");
        await createItem.wait();
        const items = await marketplace.getAllItems();
        expect(items[0].price).to.equal(parseEther("200"));
      });
      it("Should create an item with correct tokenId", async function () {
        const { seller, marketplace } = await loadFixture(loadListingFixture);
        const createItem = await marketplace
          .connect(seller)
          .mintAndListItem("25", parseEther("200"), "tokenURI", "0x");
        await createItem.wait();
        const items = await marketplace.getAllItems();
        expect(items[0].tokenId).to.equal("1");
      });
      it("Should create from correct NFT contract", async function () {
        const { seller, marketplace, nfts } = await loadFixture(
          loadListingFixture
        );
        const createItem = await marketplace
          .connect(seller)
          .mintAndListItem("25", parseEther("200"), "tokenURI", "0x");
        await createItem.wait();
        const items = await marketplace.getAllItems();
        expect(items[0].nftContract).to.equal(nfts.address);
      });
    });
  });
  describe("Should be able to List Existing NFTs", function () {
    it("Should be able to list a already owned NFT", async function () {
      const { seller, marketplace, nfts } = await loadFixture(
        loadExistingNftToListFixture
      );
      const listToken = await marketplace
        .connect(seller)
        .listItem(nfts.address, "1", "1", parseEther("455"), "0x");
      await listToken.wait();
      const items = await marketplace.getAllItems();
      expect(items.length).to.be.greaterThanOrEqual(1);
    });
    it("Should be able to list a already owned collection", async function () {
      const { seller, marketplace, nfts } = await loadFixture(
        loadExistingNftToListFixture
      );
      const listToken = await marketplace
        .connect(seller)
        .listItem(nfts.address, "2", "30", parseEther("85"), "0x");
      await listToken.wait();
      const items = await marketplace.getAllItems();
      expect(items[0].amount).to.be.greaterThanOrEqual(30);
    });
  });
  describe("It should be able to update listed item", function () {
    it("Should fail to update if wallet is not the owner", async function () {
      const { marketplace, wallet1 } = await loadFixture(
        loadListedItemsFixture
      );
      await expect(
        marketplace
          .connect(wallet1)
          .updateMyListingItemPrice("2", parseEther("150"))
      ).to.be.revertedWith("Not the owner of the listed item");
    });
    it("Should be able to add more NFT to a listed item", async function () {
      const { marketplace, seller } = await loadFixture(loadListedItemsFixture);
      const itemsBefore = await marketplace.getAllItems();
      const addTx = await marketplace
        .connect(seller)
        .addMyListingItemAmount("2", "5", "2");
      await addTx.wait();
      const itemsAfter = await marketplace.getAllItems();
      expect(itemsBefore[1].amount).to.equal(25);
      expect(itemsAfter[1].amount).to.equal(30);
    });
    it("Should be able to update a listed item's price", async function () {
      const { marketplace, seller } = await loadFixture(loadListedItemsFixture);
      const itemsBefore = await marketplace.getAllItems();
      const updateTx = await marketplace
        .connect(seller)
        .updateMyListingItemPrice("2", parseEther("150"));
      await updateTx.wait();
      const itemsAfter = await marketplace.getAllItems();
      expect(itemsBefore[1].price).to.be.lessThan(itemsAfter[1].price);
    });

    it("Should fail to update a collection with different tokenID", async function () {
      const { marketplace, seller } = await loadFixture(loadListedItemsFixture);
      await expect(
        marketplace.connect(seller).addMyListingItemAmount("2", "5", "1")
      ).to.be.rejectedWith("Not the same tokenId listed on the marketplace");
    });
    describe("Should be able to remove NFT from a listed item", function () {
      it("Should transfer the item to owner", async function () {
        const { marketplace, seller, nfts } = await loadFixture(
          loadListedItemsFixture
        );
        const removeListedItem = await marketplace
          .connect(seller)
          .removeMyListingItemAmount("1", "1");
        await removeListedItem.wait();
        expect(await nfts.balanceOf(seller.address, "1")).to.equal(1);
      });
      it("Should decrease the number of listed items from marketplace", async function () {
        const { marketplace, seller } = await loadFixture(
          loadListedItemsFixture
        );
        const itemsBefore = await marketplace.getAllItems();
        const removeListedItem = await marketplace
          .connect(seller)
          .removeMyListingItemAmount("1", "1");
        await removeListedItem.wait();
        const itemsAfter = await marketplace.getAllItems();
        expect(itemsAfter.length).to.be.lessThan(itemsBefore.length);
      });
    });
  });
  describe("It should be able to buy NFT", function () {
    it("Should transfer the item from the marketplace to the buyer wallet", async function () {
      const { marketplace, nfts, buyer } = await loadFixture(
        loadListedToBuyItemsFixture
      );
      const items = await marketplace.getAllItems();
      const buyItem = await marketplace.connect(buyer).buyItem("1", "1");
      await buyItem.wait();
      expect(await nfts.balanceOf(buyer.address, items[0].tokenId)).to.equal(1);
    });
    it("Should transfer the price amount to item's owner", async function () {
      const { marketplace, nko, buyer, seller } = await loadFixture(
        loadListedToBuyItemsFixture
      );
      const items = await marketplace.getAllItems();
      await expect(
        marketplace.connect(buyer).buyItem("1", "1")
      ).to.changeTokenBalances(
        nko,
        [buyer, seller],
        [parseEther("-450"), parseEther("432")]
      );
    });
    describe("Should be able to buy from collection", function () {
      it("Should be able to buy an amount less than hole collection", async function () {
        const { buyer, marketplace, nko, seller } = await loadFixture(
          loadListedToBuyItemsFixture
        );
        await expect(
          marketplace.connect(buyer).buyItem("2", "10")
        ).to.changeTokenBalances(
          nko,
          [buyer, seller],
          [parseEther("-250"), parseEther("240")]
        );
      });
      it("Should decrease an amount of collection after same amount is bought", async function () {
        const { buyer, marketplace, nfts } = await loadFixture(
          loadListedToBuyItemsFixture
        );
        const itemsBefore = await marketplace.getAllItems();
        const buyItems = await marketplace.connect(buyer).buyItem("2", "10");
        await buyItems.wait();
        const itemsAfter = await marketplace.getAllItems();
        expect(itemsBefore[1].amount).to.be.greaterThan(itemsAfter[1].amount);
      });
      it("Should be transferred the amount bought from the collection to buyer", async function () {
        const { buyer, marketplace, nfts } = await loadFixture(
          loadListedToBuyItemsFixture
        );
        expect(await nfts.balanceOf(buyer.address, "2")).to.equal(0);
        const buyItems = await marketplace.connect(buyer).buyItem("2", "10");
        await buyItems.wait();
        expect(await nfts.balanceOf(buyer.address, "2")).to.equal(10);
      });
      it("Should have a 4% fee of the price of item that must be sent to Staking Pool and Foundation", async function () {
        const { buyer, marketplace, foundation, stakePool, nko } =
          await loadFixture(loadListedToBuyItemsFixture);
        await expect(
          marketplace.connect(buyer).buyItem("2", "10")
        ).to.changeTokenBalances(
          nko,
          [buyer, stakePool, foundation],
          [parseEther("-250"), parseEther("5"), parseEther("5")]
        );
      });
    });
  });
  describe("Should fetch data correctly", function () {
    it("Should fetch listed items", async function () {});
    it("Should be able to fetch user items when call fetchUserItems", async function () {});
  });
  // describe("It should let deployer wallet change setup", function () {});
});
