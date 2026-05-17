// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title StrikePriceOracle
/// @notice Determines registration and renewal pricing based on name length
contract StrikePriceOracle is Ownable {

    // Annual prices in wei (can be updated by owner)
    uint256 public price3Char;   // 3 character names
    uint256 public price4Char;   // 4 character names
    uint256 public price5Char;   // 5+ character names

    event PricesUpdated(uint256 price3, uint256 price4, uint256 price5);

    constructor(
        uint256 _price3Char,
        uint256 _price4Char,
        uint256 _price5Char
    ) Ownable(msg.sender) {
        price3Char = _price3Char;
        price4Char = _price4Char;
        price5Char = _price5Char;
    }

    /// @notice Returns the price in wei for a given name and duration
    /// @param name The name being registered (without suffix)
    /// @param duration Duration in seconds
    function price(string calldata name, uint256 duration) external view returns (uint256) {
        uint256 annualPrice = _annualPrice(bytes(name).length);
        // Price = annualPrice * duration / 365 days
        return (annualPrice * duration) / 365 days;
    }

    function _annualPrice(uint256 length) internal view returns (uint256) {
        if (length <= 3) return price3Char;
        if (length == 4) return price4Char;
        return price5Char;
    }

    /// @notice Update pricing (owner only)
    function setPrices(
        uint256 _price3Char,
        uint256 _price4Char,
        uint256 _price5Char
    ) external onlyOwner {
        price3Char = _price3Char;
        price4Char = _price4Char;
        price5Char = _price5Char;
        emit PricesUpdated(_price3Char, _price4Char, _price5Char);
    }
}
