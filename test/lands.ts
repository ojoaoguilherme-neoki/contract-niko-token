import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import moment from "moment";

const NIKO_ADDRESS = "0xFf8972edD9BAA45fD1349C0DC84e6767a9d92cCF";
const COMPANY_TREASURY = "0x64659114a80BB615428018b3CB5A0530599F0906";

describe("Test LAND Contact", function () {
  async function deployContractsFixture() {
    const [deployer, treasury, foundation, stakePool, buyer, wallet1, wallet2] =
      await ethers.getSigners();
    const LANDS = await ethers.getContractFactory("NeokiLands");
    const SELLINGCONTRACT = await ethers.getContractFactory("LandSell");
    const NIKO = await ethers.getContractFactory("NikoToken");

    const nko = await NIKO.deploy(deployer.address);
    await nko.deployed();

    const lands = await LANDS.deploy([deployer.address, wallet1.address]);
    await lands.deployed();

    const sellContract = await SELLINGCONTRACT.deploy(
      nko.address,
      lands.address,
      treasury.address
    );
    await sellContract.deployed();

    const sellConfig = await lands.addAccountToMinter(sellContract.address);
    await sellConfig.wait();
    return {
      deployer,
      treasury,
      foundation,
      stakePool,
      buyer,
      wallet1,
      wallet2,
      lands,
      nko,
      sellContract,
    };
  }
  async function sellingLandsFixture() {
    const {
      deployer,
      treasury,
      foundation,
      stakePool,
      buyer,
      wallet1,
      wallet2,
      lands,
      nko,
      sellContract,
    } = await loadFixture(deployContractsFixture);

    const adminRole = await sellContract.ADMIN_ROLE();

    const setAdmin = await sellContract
      .connect(deployer)
      .grantRole(adminRole, wallet1.address);
    await setAdmin.wait();

    const defineLandPrices = await sellContract
      .connect(wallet1)
      .definePricePerRange("100", "500", parseEther("1000"));
    await defineLandPrices.wait();

    const transfer = await nko
      .connect(deployer)
      .transfer(buyer.address, parseEther("10000"));
    await transfer.wait();

    const nkoApprove = await nko
      .connect(buyer)
      .approve(sellContract.address, parseEther("10000"));
    await nkoApprove.wait();

    return {
      deployer,
      treasury,
      foundation,
      stakePool,
      buyer,
      wallet1,
      wallet2,
      lands,
      nko,
      sellContract,
    };
  }
  describe("Basic Infos", function () {
    it("Should have name `Neoki Land`", async function () {
      const { lands } = await loadFixture(deployContractsFixture);
      expect(await lands.name()).to.equal("Neoki Lands");
    });

    it("Should have symbol `LAND`", async function () {
      const { lands } = await loadFixture(deployContractsFixture);
      expect(await lands.symbol()).to.equal("LAND");
    });

    it("Should have 423,801 LANDs total", async function () {
      const { lands } = await loadFixture(deployContractsFixture);
      expect(await lands.totalLands()).to.equal(651 * 651);
    });

    it("Should have locked 50% LANDs for selling", async function () {
      const { lands } = await loadFixture(deployContractsFixture);
      const sellingLands = await lands.totalSellingLands();
      const totalSupply = await lands.totalLands();
      expect(totalSupply.sub(sellingLands)).to.equal((651 * 651) / 2 + 0.5);
    });

    it("Should have locked 50% of lands for 356 days for future auction", async function () {
      const { lands } = await loadFixture(deployContractsFixture);
      const releaseLandDate = moment.unix(
        (await lands.lockedLandsUntil()).toNumber()
      );
      const today = moment();
      expect(releaseLandDate.diff(today, "days")).to.equal(364);
    });
    it("It should have selling contract address properly linked", async function () {
      const { lands, sellContract } = await loadFixture(deployContractsFixture);
      expect(
        await lands.hasRole(await lands.MINTER_ROLE(), sellContract.address)
      ).to.eq(true);
    });
  });
  describe("Test Selling Contract", function () {
    describe("Basic infos", function () {
      it("Should accept Niko Token", async function () {
        const { sellContract, nko } = await loadFixture(deployContractsFixture);
        expect(await sellContract.nko()).to.equal(nko.address);
      });
      it("Should have LAND Contract address properly configured", async function () {
        const { sellContract, lands } = await loadFixture(
          deployContractsFixture
        );
        expect(await sellContract.land()).to.equal(lands.address);
      });
      describe("ADMIN CONFIGURATION AND ROLES", function () {
        it("Should have deployer wallet as DEFAULT_ADMIN_ROLE", async function () {
          const { deployer, sellContract } = await loadFixture(
            deployContractsFixture
          );
          const defaultAdmin = await sellContract.DEFAULT_ADMIN_ROLE();
          expect(
            await sellContract.hasRole(defaultAdmin, deployer.address)
          ).to.equal(true);
        });
        it("Deployer wallet should be able to set and unset other wallet as ADMIN_ROLE", async function () {
          const { deployer, sellContract, wallet1 } = await loadFixture(
            deployContractsFixture
          );
          const adminRole = await sellContract.ADMIN_ROLE();

          expect(
            await sellContract.hasRole(adminRole, wallet1.address)
          ).to.equal(false);

          const config = await sellContract
            .connect(deployer)
            .grantRole(adminRole, wallet1.address);
          await config.wait();

          expect(
            await sellContract.hasRole(adminRole, wallet1.address)
          ).to.equal(true);

          const unsetRole = await sellContract
            .connect(deployer)
            .revokeRole(adminRole, wallet1.address);
          await unsetRole.wait();

          expect(
            await sellContract.hasRole(adminRole, wallet1.address)
          ).to.equal(false);
        });
      });
    });
    describe("Selling Contract Actions", function () {
      it("Should define price for tokenIds", async function () {
        const { sellContract, deployer } = await loadFixture(
          deployContractsFixture
        );
        const before = await sellContract.getPricePerRange(1, 5);
        const definePrices = await sellContract
          .connect(deployer)
          .definePricePerRange(1, 2, parseEther("350"));
        await definePrices.wait();
        const after = await sellContract.getPricePerRange(1, 5);
        expect(before[0].price).to.equal(parseEther("0"));
        expect(after[0].price).to.equal(parseEther("350"));
      });
      it("Should retrieve range of price for tokenIds", async function () {
        const { sellContract } = await loadFixture(deployContractsFixture);
        const data = await sellContract.getPricePerRange(5, 15);
        expect(data.length).to.equal(10);
      });
      it("Should retrieve a specified tokenId price", async function () {
        const { sellContract, deployer } = await loadFixture(
          deployContractsFixture
        );
        const definePrices = await sellContract
          .connect(deployer)
          .definePricePerRange(1, 10, parseEther("350"));
        await definePrices.wait();
        const data = await sellContract.getTokenIdPrice(2);
        expect(data.toString()).to.equal(parseEther("350"));
      });
    });

    describe("Selling Lands", function () {
      it("Should transfer NKO from buyer selling contract then treasury", async function () {
        const { sellContract, buyer, nko, treasury } = await loadFixture(
          sellingLandsFixture
        );

        await expect(
          sellContract.connect(buyer).buyLand(["100", "105"])
        ).to.changeTokenBalances(
          nko,
          [buyer, sellContract, treasury],
          [parseEther("-2000"), parseEther("0"), parseEther("2000")]
        );
      });
      it("Selling Contract should mint LANDs to buyer", async function () {
        const { sellContract, buyer, lands } = await loadFixture(
          sellingLandsFixture
        );

        await expect(
          sellContract.connect(buyer).buyLand(["100", "105"])
        ).to.changeTokenBalance(lands, buyer, "2");
      });
      it("Selling Contract should throw an error for buying already soled LAND", async function () {
        const { sellContract, buyer } = await loadFixture(sellingLandsFixture);
        const buyLands = await sellContract
          .connect(buyer)
          .buyLand(["100", "105"]);
        await buyLands.wait();

        await expect(
          sellContract.connect(buyer).buyLand(["100"])
        ).to.revertedWith("ERC721: token already minted");
      });
      it("Should fail if buyer does not have NKO", async function () {
        const { sellContract, buyer, nko } = await loadFixture(
          sellingLandsFixture
        );
        const balance = await nko.balanceOf(buyer.address);
        const tx = await nko
          .connect(buyer)
          .transfer(sellContract.address, balance);
        await tx.wait();

        await expect(
          sellContract.connect(buyer).buyLand(["108"])
        ).to.rejectedWith("ERC20: transfer amount exceeds balance");
      });
      it("Should throw right message if tokenId is not sellable", async function () {
        const { sellContract, buyer } = await loadFixture(sellingLandsFixture);
        await expect(
          sellContract.connect(buyer).buyLand(["1"])
        ).to.rejectedWith("LAND not selable yet.");
      });
    });
  });
});
