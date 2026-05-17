// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IENSRegistry.sol";
import "./interfaces/IPublicResolver.sol";
import "./StrikePriceOracle.sol";

/// @title StrikeRegistrar
/// @notice Registers strike.eth subnames (name.strike.eth) on ENS
/// @dev Deploys per-chain; all names resolve via ENS CCIP or direct L1 lookup
contract StrikeRegistrar is Ownable, ReentrancyGuard, Pausable {

    // -------------------------
    // State
    // -------------------------

    IENSRegistry public immutable registry;
    IPublicResolver public immutable resolver;
    StrikePriceOracle public priceOracle;

    // The namehash of strike.eth — set at deploy time
    bytes32 public immutable baseNode;

    // name label => expiry timestamp
    mapping(bytes32 => uint256) public expiries;

    // name label => current owner
    mapping(bytes32 => address) public nameOwner;

    // Minimum registration duration: 28 days
    uint256 public constant MIN_DURATION = 28 days;

    // Minimum name length
    uint256 public minNameLength = 3;

    // -------------------------
    // Events
    // -------------------------

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 expires
    );

    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 expires
    );

    event NameReleased(
        string name,
        bytes32 indexed label
    );

    event FundsWithdrawn(address indexed to, uint256 amount);

    // -------------------------
    // Constructor
    // -------------------------

    /// @param _registry ENS registry address (same on all EVM chains if using ENS fork)
    /// @param _resolver Public resolver address
    /// @param _baseNode namehash of strike.eth
    /// @param _priceOracle Price oracle address
    constructor(
        address _registry,
        address _resolver,
        bytes32 _baseNode,
        address _priceOracle
    ) Ownable(msg.sender) {
        registry = IENSRegistry(_registry);
        resolver = IPublicResolver(_resolver);
        baseNode = _baseNode;
        priceOracle = StrikePriceOracle(_priceOracle);
    }

    // -------------------------
    // Core Registration Logic
    // -------------------------

    /// @notice Register a new name
    /// @param name The label to register (e.g. "alice" for alice.strike.eth)
    /// @param owner Address that will own the name
    /// @param duration How long to register for (in seconds)
    function register(
        string calldata name,
        address owner,
        uint256 duration
    ) external payable nonReentrant whenNotPaused {
        bytes32 label = keccak256(bytes(name));

        _validateName(name);
        require(duration >= MIN_DURATION, "Duration too short");
        require(_available(label), "Name not available");

        uint256 cost = priceOracle.price(name, duration);
        require(msg.value >= cost, "Insufficient payment");

        uint256 expires = block.timestamp + duration;
        expiries[label] = expires;
        nameOwner[label] = owner;

        // Register subdomain in ENS registry
        registry.setSubnodeRecord(
            baseNode,
            label,
            owner,
            address(resolver),
            0 // ttl
        );

        // Set address record in resolver
        bytes32 subnode = keccak256(abi.encodePacked(baseNode, label));
        resolver.setAddr(subnode, owner);

        // Refund overpayment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit NameRegistered(name, label, owner, expires);
    }

    /// @notice Renew an existing name
    /// @param name The label to renew
    /// @param duration How long to extend by (in seconds)
    function renew(
        string calldata name,
        uint256 duration
    ) external payable nonReentrant whenNotPaused {
        bytes32 label = keccak256(bytes(name));

        require(duration >= MIN_DURATION, "Duration too short");
        require(expiries[label] > 0, "Name not registered");

        uint256 cost = priceOracle.price(name, duration);
        require(msg.value >= cost, "Insufficient payment");

        // Extend from current expiry (not from now, to reward early renewal)
        uint256 newExpiry = expiries[label] + duration;
        expiries[label] = newExpiry;

        // Refund overpayment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit NameRenewed(name, label, newExpiry);
    }

    /// @notice Set text records on your name (avatar, twitter, etc.)
    /// @param name Your registered name
    /// @param key Record key (e.g. "avatar", "com.twitter", "url")
    /// @param value Record value
    function setTextRecord(
        string calldata name,
        string calldata key,
        string calldata value
    ) external {
        bytes32 label = keccak256(bytes(name));
        require(nameOwner[label] == msg.sender, "Not name owner");
        require(!_expired(label), "Name expired");

        bytes32 subnode = keccak256(abi.encodePacked(baseNode, label));
        resolver.setText(subnode, key, value);
    }

    /// @notice Transfer name ownership to another address
    function transfer(string calldata name, address newOwner) external {
        bytes32 label = keccak256(bytes(name));
        require(nameOwner[label] == msg.sender, "Not name owner");
        require(!_expired(label), "Name expired");
        require(newOwner != address(0), "Invalid address");

        nameOwner[label] = newOwner;
        registry.setSubnodeOwner(baseNode, label, newOwner);
    }

    // -------------------------
    // View Functions
    // -------------------------

    /// @notice Check if a name is available to register
    function available(string calldata name) external view returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return _available(label);
    }

    /// @notice Get the expiry timestamp of a name
    function nameExpiry(string calldata name) external view returns (uint256) {
        bytes32 label = keccak256(bytes(name));
        return expiries[label];
    }

    /// @notice Get registration cost
    function registrationCost(
        string calldata name,
        uint256 duration
    ) external view returns (uint256) {
        return priceOracle.price(name, duration);
    }

    // -------------------------
    // Internal Helpers
    // -------------------------

    function _available(bytes32 label) internal view returns (bool) {
        return expiries[label] == 0 || _expired(label);
    }

    function _expired(bytes32 label) internal view returns (bool) {
        return expiries[label] < block.timestamp;
    }

    function _validateName(string calldata name) internal view {
        bytes memory nameBytes = bytes(name);
        require(nameBytes.length >= minNameLength, "Name too short");
        require(nameBytes.length <= 64, "Name too long");

        // Only allow alphanumeric and hyphens, no leading/trailing hyphens
        require(nameBytes[0] != 0x2D, "Cannot start with hyphen");
        require(nameBytes[nameBytes.length - 1] != 0x2D, "Cannot end with hyphen");

        for (uint256 i = 0; i < nameBytes.length; i++) {
            bytes1 char = nameBytes[i];
            bool isLower = char >= 0x61 && char <= 0x7A; // a-z
            bool isDigit = char >= 0x30 && char <= 0x39; // 0-9
            bool isHyphen = char == 0x2D;                // -
            require(isLower || isDigit || isHyphen, "Invalid character");
        }
    }

    // -------------------------
    // Admin Functions
    // -------------------------

    /// @notice Update the price oracle
    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = StrikePriceOracle(_priceOracle);
    }

    /// @notice Update minimum name length
    function setMinNameLength(uint256 _minNameLength) external onlyOwner {
        minNameLength = _minNameLength;
    }

    /// @notice Pause registrations
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause registrations
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Withdraw collected fees
    function withdraw(address payable to) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        to.transfer(balance);
        emit FundsWithdrawn(to, balance);
    }

    receive() external payable {}
}
