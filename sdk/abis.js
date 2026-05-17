export const RESOLVER_ABI = [
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
];

export const REGISTRAR_ABI = [
  "function available(string name) view returns (bool)",
  "function nameExpiry(string name) view returns (uint256)",
  "function registrationCost(string name, uint256 duration) view returns (uint256)",
  "function register(string name, address owner, uint256 duration) payable",
  "function renew(string name, uint256 duration) payable",
  "function transfer(string name, address newOwner)",
  "function setTextRecord(string name, string key, string value)",
];
