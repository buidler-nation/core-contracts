// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/IERC20.sol";
import "../interface/IRewardDistributor.sol";
import "../library/SafeERC20.sol";

contract MockStaking is Ownable {
  /* ========== DEPENDENCIES ========== */

  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== EVENTS ========== */

  event WarmupSet(uint256 warmup);

  /* ========== DATA STRUCTURES ========== */

  struct Epoch {
    uint256 length; // in seconds
    uint256 number; // since inception
    uint256 end; // timestamp
    uint256 distribute; // amount
  }

  struct Claim {
    uint256 deposit; // if forfeiting
    uint256 expiry; // end of warmup period
    bool lock; // prevents malicious delays for claim
  }

  /* ========== STATE VARIABLES ========== */

  IERC20 public immutable BDN;
  IERC20 public immutable sBDN;
  IRewardDistributor public rewardDistributor;

  mapping(address => Claim) public warmupInfo;
  uint256 public warmupPeriod;
  uint256 private amountInWarmup;

  /* ========== CONSTRUCTOR ========== */

  constructor(
    address _bdn,
    address _sbdn
  ) {
    require(_bdn != address(0), "Zero address: BDN");
    BDN = IERC20(_bdn);
    require(_sbdn != address(0), "Zero address: sBDN");
    sBDN = IERC20(_sbdn);
  }

  function setRewardDistributor(address rewardDistributor_) external {
    rewardDistributor = IRewardDistributor(rewardDistributor_);
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice stake BDN to enter warmup
     * @param _to address
     * @param _amount uint
     * @return uint
     */
  function stake(
    address _to,
    uint256 _amount
  ) external returns (uint256) {
    BDN.safeTransferFrom(msg.sender, address(this), _amount);
    if (warmupPeriod == 0) {
      _send(_to, _amount);
      rewardDistributor.stake(_to, _amount);
      return _amount;
    } else {
        Claim memory info = warmupInfo[_to];
        if (!info.lock) {
          require(_to == msg.sender, "External deposits for account are locked");
        }

        warmupInfo[_to] = Claim({
          deposit: info.deposit.add(_amount),
          expiry: block.timestamp.add(warmupPeriod),
          lock: info.lock
        });

        amountInWarmup = amountInWarmup.add(_amount);
        return _amount;
    }
  }

  /**
   * @notice retrieve stake from warmup
     * @param _to address
     * @return uint
     */
  function claim(address _to) public returns (uint256) {
    Claim memory info = warmupInfo[_to];

    if (!info.lock) {
      require(_to == msg.sender, "External claims for account are locked");
    }

    if (block.timestamp >= info.expiry && info.expiry != 0) {
      delete warmupInfo[_to];

      amountInWarmup = amountInWarmup.sub(info.deposit);
      return _send(_to, info.deposit);
    }
    return 0;
  }

  /**
   * @notice forfeit stake and retrieve BDN
   * @return uint
  */
  function forfeit() external returns (uint256) {
    Claim memory info = warmupInfo[msg.sender];
    delete warmupInfo[msg.sender];
    amountInWarmup = amountInWarmup.sub(info.deposit);
    BDN.safeTransfer(msg.sender, info.deposit);
    return info.deposit;
  }

  /**
   * @notice prevent new deposits or claims from ext. address (protection from malicious activity)
     */
  function toggleLock() external {
    warmupInfo[msg.sender].lock = !warmupInfo[msg.sender].lock;
  }

  /**
   * @notice redeem sOHM for OHMs
     * @param _to address
     * @param _amount uint
     * @return amount_ uint
     */
  function unstake(
    address _to,
    uint256 _amount
  ) external returns (uint256 amount_) {
    sBDN.burn(msg.sender, _amount);
    require(_amount <= BDN.balanceOf(address(this)), "Insufficient BDN balance in contract");
    rewardDistributor.unstake(_to, _amount);
    BDN.safeTransfer(_to, _amount);
    return _amount;
  }

  /* ========== INTERNAL FUNCTIONS ========== */

  /**
   * @notice send staker their amount as sBDN
     * @param _to address
     * @param _amount uint
     */
  function _send(
    address _to,
    uint256 _amount
  ) internal returns (uint256) {
      sBDN.mint(_to, _amount); // send as sBDN (equal unit as BDN)
      return _amount;
  }

  /* ========== VIEW FUNCTIONS ========== */

  /**
   * @notice total supply in warmup
     */
  function supplyInWarmup() public view returns (uint256) {
    return amountInWarmup;
  }

  /**
   * @notice BDN balance present in contract
   */
  function contractBDNBalance() public view returns (uint256) {
    return BDN.balanceOf(address(this));
  }

  /* ========== MANAGERIAL FUNCTIONS ========== */

  /**
   * @notice set warmup period for new stakers
     * @param _warmupPeriod uint
     */
  function setWarmupLength(uint256 _warmupPeriod) external onlyOwner {
    warmupPeriod = _warmupPeriod;
    emit WarmupSet(_warmupPeriod);
  }

  function getRewardDistributorAddress() external view returns(address) {
    return address(rewardDistributor);
  }
}
