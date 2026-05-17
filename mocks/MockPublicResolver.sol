// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPublicResolver.sol";

/// @notice Mock Public Resolver for non-ENS chains (Arc Testnet)
contract MockPublicResolver is IPublicResolver {
    mapping(bytes32 => address) public addrs;
    mapping(bytes32 => mapping(string => string)) public texts;
    mapping(bytes32 => bytes) public contenthashes;

    function setAddr(bytes32 node, address addr) external {
        addrs[node] = addr;
    }

    function setText(bytes32 node, string calldata key, string calldata value) external {
        texts[node][key] = value;
    }

    function setContenthash(bytes32 node, bytes calldata hash) external {
        contenthashes[node] = hash;
    }

    function addr(bytes32 node) external view returns (address payable) {
        return payable(addrs[node]);
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return texts[node][key];
    }

    function contenthash(bytes32 node) external view returns (bytes memory) {
        return contenthashes[node];
    }
}