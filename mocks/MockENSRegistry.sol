// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IENSRegistry.sol";

/// @notice Mock ENS Registry for non-ENS chains (Arc Testnet)
contract MockENSRegistry is IENSRegistry {
    mapping(bytes32 => address) public owners;
    mapping(bytes32 => address) public resolvers;
    mapping(bytes32 => uint64) public ttls;

    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address owner,
        address resolver,
        uint64 ttl
    ) external {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        owners[subnode] = owner;
        resolvers[subnode] = resolver;
        ttls[subnode] = ttl;
    }

    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address owner
    ) external returns (bytes32) {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        owners[subnode] = owner;
        return subnode;
    }

    function owner(bytes32 node) external view returns (address) {
        return owners[node];
    }

    function resolver(bytes32 node) external view returns (address) {
        return resolvers[node];
    }

    function ttl(bytes32 node) external view returns (uint64) {
        return ttls[node];
    }

    function recordExists(bytes32 node) external view returns (bool) {
        return owners[node] != address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return true;
    }

    function setResolver(bytes32 node, address _resolver) external {
        resolvers[node] = _resolver;
    }

    function setOwner(bytes32 node, address _owner) external {
        owners[node] = _owner;
    }

    function setTTL(bytes32 node, uint64 _ttl) external {
        ttls[node] = _ttl;
    }
}