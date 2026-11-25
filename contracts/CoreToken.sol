// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title CoreToken (CT)
 * @notice EtherPulse & WORLCORE TRADE ecosystem utility token.
 * @dev Fixed supply: 100,000,000 CT minted once to the designated multisig treasury.
 *      Minting: Disabled | Burning: Disabled | Administrative privileges: None.
 */
contract CoreToken is ERC20 {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    constructor(address treasury) ERC20("CoreToken", "CT") {
        require(treasury != address(0), "CoreToken: zero treasury address");

        // Initial supply is minted exactly once.
        // The designated multisig treasury receives all CT.
        _mint(treasury, MAX_SUPPLY);
    }
}
