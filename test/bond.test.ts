import { ethers } from "hardhat";
import { constants } from "../scripts/constants";
import { expect } from "chai";
import { Contract } from "ethers";

describe("Bond Test", function () {
  let mim: Contract,
    bdn: Contract,
    treasuryHelper: Contract,
    treasury: Contract,
    tavCalculator: Contract,
    bond: Contract,
    deployer: any,
    DAO: any,
    user1: any,
    user2: any,
    user3: any;

  before(async () => {
    [deployer, DAO, user1, user2, user3] = await ethers.getSigners();
    const MIM = await ethers.getContractFactory("MIM");
    mim = await MIM.deploy();
    await mim.deployed();

    const BDN = await ethers.getContractFactory("BDN");
    bdn = await BDN.deploy();
    await bdn.deployed();

    const TreasuryHelper = await ethers.getContractFactory("TreasuryHelper");
    treasuryHelper = await TreasuryHelper.deploy(
      bdn.address,
      mim.address,
      0
    );
    await treasuryHelper.deployed();

    // bond depository address will go here
    await treasuryHelper.queue("0", deployer.address);

    // bond depository address will go here
    await treasuryHelper.toggle("0", deployer.address, constants.zeroAddress);

    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(
      bdn.address,
      treasuryHelper.address
    );
    await treasury.deployed();

    // Only treasury can mint BDN.
    await bdn.setVault(treasury.address);

    // mint mim for msg.sender
    await mim.mint(deployer.address, "10000000000000000000000000");

    const TAVCalculator = await ethers.getContractFactory("TAVCalculator");
    tavCalculator = await TAVCalculator.deploy(
      bdn.address,
      treasury.address
    );
    await tavCalculator.deployed();

    // approve large number for treasury, so that it can move
    await mim.approve(treasury.address, constants.largeApproval);

    // approve treasury address for a user so that treasury can burn bdn for user
    await bdn.approve(treasury.address, constants.largeApproval);

    await treasury.setTAVCalculator(tavCalculator.address);

    // Deposit 1,000,000 MIM and mint 1,000,000 BDN
    await treasury.deposit(
      "1000000000000000000000000", // reserve token amount to deposit
      mim.address,
      "1000000000000000000000000" // amount of bdn to mint
    );

    const Bond = await ethers.getContractFactory("Bond");
    bond = await Bond.deploy(
      bdn.address,
      mim.address,
      treasury.address,
      DAO.address
    );

    await bond.deployed();

    await bond.initializeBondTerms(
      constants.mimBondBCV,
      constants.minBondPrice,
      constants.maxBondPayout,
      constants.minBondPayout,
      constants.bondFee,
      constants.bondRewardFee,
      constants.maxBondDebt,
      10
    );

    await bond.setTAVCalculator(tavCalculator.address);

    await bond.setFloorPriceValue("1000000000");
    // approve large number for treasury, so that it can move
    await mim.approve(bond.address, constants.largeApproval);

    // bond depository address will go here
    await treasuryHelper.queue("0", bond.address);

    // bond depository address will go here
    await treasuryHelper.toggle("0", bond.address, constants.zeroAddress);

    await bond.setAdjustment(true, 2, 300, 100, 0);

  });
  it("Bond Deposit", async function () {
    let bdnBalance, bdnBalance1;
    await bond.deposit("1000000000", "600000");
  });

  it("Bond Redeem", async function () {
    let bdnBalance, bdnBalance1;
    await bond.redeem(deployer.address, false);
  });


});
