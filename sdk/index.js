import { ethers } from "ethers";
import { STRIKE_CONTRACTS, STRIKE_BASE_NODE } from "./constants.js";
import { RESOLVER_ABI, REGISTRAR_ABI } from "./abis.js";

// Compute the subnode hash for a label under the strike base node.
// Must match exactly how StrikeRegistrar computes it on-chain.
function computeSubnode(label) {
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(label));
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32"],
      [STRIKE_BASE_NODE, labelHash]
    )
  );
}

function getContracts(chainId, provider) {
  const addresses = STRIKE_CONTRACTS[chainId];
  if (!addresses) throw new Error(`Strike contracts not deployed on chain ${chainId}`);
  return {
    resolver:  new ethers.Contract(addresses.resolver,  RESOLVER_ABI,  provider),
    registrar: new ethers.Contract(addresses.registrar, REGISTRAR_ABI, provider),
  };
}

function normaliseLabel(name) {
  return name
    .replace(/\.strike\.eth$/, "")
    .replace(/\.strike$/, "")
    .toLowerCase()
    .trim();
}

/**
 * Resolve a .strike name to an address.
 * Accepts "alice", "alice.strike", or "alice.strike.eth".
 * Returns null if the name is not registered or has expired.
 */
export async function resolveName(name, provider, chainId) {
  const subnode = computeSubnode(normaliseLabel(name));
  const { resolver } = getContracts(chainId, provider);
  const address = await resolver.addr(subnode);
  if (address === ethers.ZeroAddress) return null;
  return address;
}

/**
 * Reverse lookup — given an address, return its .strike name.
 * Returns null if the address has no registered name.
 */
export async function lookupAddress(address, provider, chainId) {
  const addresses = STRIKE_CONTRACTS[chainId];
  if (!addresses) throw new Error(`Strike contracts not deployed on chain ${chainId}`);

  const registrar = new ethers.Contract(addresses.registrar, [
    ...REGISTRAR_ABI,
    "event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 expires)",
  ], provider);

  const events = await registrar.queryFilter(
    registrar.filters.NameRegistered(null, null, address)
  );
  if (events.length === 0) return null;

  const name = events[events.length - 1].args.name;
  const expiry = await registrar.nameExpiry(name);
  if (expiry < BigInt(Math.floor(Date.now() / 1000))) return null;

  return `${name}.strike`;
}

/**
 * Fetch a text record for a name.
 * Common keys: "avatar", "com.twitter", "url", "description"
 */
export async function getTextRecord(name, key, provider, chainId) {
  const subnode = computeSubnode(normaliseLabel(name));
  const { resolver } = getContracts(chainId, provider);
  return await resolver.text(subnode, key);
}

/**
 * Check if a name is available to register.
 */
export async function isAvailable(name, provider, chainId) {
  const { registrar } = getContracts(chainId, provider);
  return await registrar.available(normaliseLabel(name));
}

/**
 * Get the registration cost in wei for a name and duration.
 * duration is in seconds — use 31536000 for 1 year.
 */
export async function getRegistrationCost(name, durationSeconds, provider, chainId) {
  const { registrar } = getContracts(chainId, provider);
  return await registrar.registrationCost(normaliseLabel(name), durationSeconds);
}
