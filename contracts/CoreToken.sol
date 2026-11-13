// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CoreToken (CT)
 * @notice Ecosystem utility token for WORLCORE TRADE & EtherPulse.
 * @dev Prepared for Ethereum Sepolia Testnet (Chain ID: 11155111).
 *      Implements ERC-20, ERC20Burnable, ERC20Permit (EIP-2612), and Ownable.
 */
contract CoreToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
    uint256 public constant INITIAL_GENESIS_ALLOCATION = 18_450_000 * 10 ** 18;

    address public rewardsTreasury;

    event RewardsTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event EcosystemRewardMinted(address indexed recipient, uint256 amount, string campaignKey);

    constructor(address initialOwner, address initialTreasury)
        ERC20("CoreToken", "CT")
        ERC20Permit("CoreToken")
        Ownable(initialOwner)
    {
        require(initialTreasury != address(0), "CoreToken: zero treasury address");
        rewardsTreasury = initialTreasury;
        _mint(initialTreasury, INITIAL_GENESIS_ALLOCATION);
    }

    function setRewardsTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "CoreToken: zero treasury address");
        address oldTreasury = rewardsTreasury;
        rewardsTreasury = newTreasury;
        emit RewardsTreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Mints ecosystem reward tokens up to MAX_SUPPLY cap.
     * @dev Strictly bounded by MAX_SUPPLY. Controlled by contract owner.
     */
    function mintRewardAllocation(
        address recipient,
        uint256 amount,
        string calldata campaignKey
    ) external onlyOwner {
        require(recipient != address(0), "CoreToken: zero recipient");
        require(totalSupply() + amount <= MAX_SUPPLY, "CoreToken: max supply exceeded");
        _mint(recipient, amount);
        emit EcosystemRewardMinted(recipient, amount, campaignKey);
    }
}
