import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { constants } from "../scripts/constants";
import { Contract } from "ethers";
describe("Reward Distributor", async () => {
  let mockBdn: Contract,
    mockStakedBdn: Contract,
    mockStaking: any,
    rewardDistributor: Contract,
    deployer: any,
    user1: any,
    user2: any,
    mim: Contract,
    treasury: Contract,
    treasuryHelper: Contract,
    rewardAmount: string;

  const delay = async (ms: number) => new Promise((res) => setTimeout(res, ms));

  before(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    const mockBdnFact = await ethers.getContractFactory("MockBDN");
    mockBdn = await mockBdnFact.deploy();

    await mockBdn.deployed();

    const mockStakedBDNFact = await ethers.getContractFactory(
      "MockStakedBDN"
    );
    mockStakedBdn = await mockStakedBDNFact.deploy();

    const mockMimFact = await ethers.getContractFactory("MIM");
    mim = await mockMimFact.deploy();
    await mim.deployed();

    await mockStakedBdn.deployed();

    const mockStakingFact = await ethers.getContractFactory("MockStaking");
    mockStaking = await mockStakingFact.deploy(
      mockBdn.address,
      mockStakedBdn.address
    );

    await mockStaking.deployed();

    const rewardDistributorFact = await ethers.getContractFactory(
      "RewardDistributor"
    );
    rewardDistributor = await rewardDistributorFact.deploy(
      mockStaking.address,
      mockStakedBdn.address
    );

    await rewardDistributor.deployed();

    await mockStakedBdn.mint(deployer.address, constants.initialMint);

    const treasuryHelperFact = await ethers.getContractFactory(
      "TreasuryHelper"
    );
    treasuryHelper = await treasuryHelperFact.deploy(
      mockBdn.address,
      mim.address,
      0
    );
    await treasuryHelper.deployed();

    const treasuryFact = await ethers.getContractFactory("Treasury");
    treasury = await treasuryFact.deploy(
      mockBdn.address,
      treasuryHelper.address
    );
    await treasury.deployed();

    await treasuryHelper.queue("3", rewardDistributor.address);

    // reserve spender address will go here
    await treasuryHelper.toggle(
      "3",
      rewardDistributor.address,
      constants.zeroAddress
    );

    await mim.approve(treasury.address, constants.largeApproval);
    await mim.mint(treasury.address, constants.largeApproval);
  });

  it("Check staking and stakedBdn Address", async function () {
    expect(await rewardDistributor.stakingContract()).to.equal(
      mockStaking.address
    );

    expect(await rewardDistributor.stakedBdnAddress()).to.equal(
      mockStakedBdn.address
    );
  });

  it("Check staking", async function () {
    await mockStaking.setRewardDistributor(rewardDistributor.address);
    expect(await mockStaking.getRewardDistributorAddress()).to.equal(
      rewardDistributor.address
    );

    await mockBdn.mint(deployer.address, constants.largeApproval);
    await mockBdn.approve(mockStaking.address, constants.largeApproval);

    await mockStaking.stake(deployer.address, "400000000000000000000000");

    await mockStaking.stake(deployer.address, "800000000000000000000000");

    console.log(await rewardDistributor.getTotalStakedBdnOfUserForACycle(deployer.address, 1));

    await mockStaking.unstake(deployer.address, "500000000000000000000000");

    console.log(await rewardDistributor.getTotalStakedBdnOfUserForACycle(deployer.address, 1));
    // await rewardDistributor.completeRewardCycle(constants.initialMint);
  });
  //
  // it("Check redeem for a cycle", async function () {
  //   await mockStaking.setRewardDistributor(rewardDistributor.address);
  //   await rewardDistributor.setTreasuryAddress(treasury.address);
  //   await rewardDistributor.setStableCoinAddress(mim.address);
  //   expect(await mockStaking.getRewardDistributorAddress()).to.equal(
  //     rewardDistributor.address
  //   );
  //
  //   await mockBdn.mint(user1.address, constants.largeApproval);
  //   await mockBdn
  //     .connect(user1)
  //     .approve(mockStaking.address, constants.largeApproval);
  //
  //   await mockStaking
  //     .connect(user1)
  //     .stake(user1.address, "400000000000000000000000");
  //   await mockStaking
  //     .connect(user1)
  //     .stake(user1.address, "800000000000000000000000");
  //
  //   delay(10000);
  //
  //   await rewardDistributor.completeRewardCycle(constants.initialMint);
  //   await mockStaking
  //     .connect(user1)
  //     .stake(user1.address, "800000000000000000000000");
  //
  //   const rewardsForCycle = await rewardDistributor
  //     .connect(user1)
  //     .rewardsForACycle(user1.address, 2);
  //
  //   // console.log("rewards for cycle", rewardsForCycle);
  //   expect(parseFloat(rewardsForCycle)).to.gt(0);
  // });
  //
  // it("Check complete reward cycle", async function () {
  //   rewardAmount = constants.initialMint;
  //   expect(await rewardDistributor.currentRewardCycle()).to.equal(3);
  //
  //   await rewardDistributor.completeRewardCycle(rewardAmount);
  //   expect(await rewardDistributor.currentRewardCycle()).to.equal(4);
  //   expect(await rewardDistributor.getTotalRewardsForCycle(1)).to.equal(
  //     rewardAmount
  //   );
  // });
  //
  // it("Check Reward with gaps in cycle", async function () {
  //   rewardAmount = constants.initialMint;
  //   expect(await rewardDistributor.currentRewardCycle()).to.equal(4);
  //   await mockStaking.unstake(deployer.address, "400000000000000000000000");
  //   expect(
  //     await rewardDistributor.getTotalStakedBdnOfUserForACycle(deployer.address, 2)
  //   ).to.gt(0);
  //   await rewardDistributor.completeRewardCycle(rewardAmount);
  //   // console.log(await rewardDistributor.rewardsForACycle(deployer.address, 1));
  //   // console.log(await rewardDistributor.rewardsForACycle(deployer.address, 2));
  //   // console.log(await rewardDistributor.rewardsForACycle(deployer.address, 3));
  //   // console.log(await rewardDistributor.rewardsForACycle(deployer.address, 4));
  //   //
  //   // console.log(await rewardDistributor.getTotalStakedBdnOfUserForACycle(deployer.address, 1));
  //   // console.log(await rewardDistributor.getTotalStakedBdnOfUserForACycle(deployer.address, 2));
  //   // console.log(await rewardDistributor.getTotalStakedBdnOfUserForACycle(deployer.address, 3));
  //   // console.log(await rewardDistributor.getTotalStakedBdnOfUserForACycle(deployer.address, 4));
  //
  //   // console.log(await rewardDistributor.getTotalStakedBdnForACycle(4));
  //
  // });
});
