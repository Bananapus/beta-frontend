import { parseAbiItem } from "viem";

export const IPFS_BASE_URL = "https://ipfs.io/ipfs/";
export const BASE64_REGEXP = /^data:(.+?)(;base64)?,(.*)$/;

export const TESTNET = true;
export const BANANAPUS_PROJECT_ID = TESTNET ? 601 : 488;

export const TESTNET_PROJECT_ID = 1214
export const JB721StakingDelegate = TESTNET
  ? "0x3281688433Be4409A1E64bD604605a57328db416"
  : "";
export const JB721StakingDistributor = TESTNET
  ? "0xf34a740d111f164d7bCf39f8d7B026Fe58b4752E"
  : "";
export const JBERC20PaymentTerminal = TESTNET
  ? "0xdb4CAB6dCAE90f6a0A82D3E37114e2317062Ca41"
  : "";

export const payAbi = [
  parseAbiItem(
    "function pay(uint256 _projectId, uint256 _amount, address _token, address _beneficiary, uint256 _minReturnedTokens, bool _preferClaimedTokens, string _memo, bytes _metadata) payable returns (uint256)"
  ),
];

export const tiersOfAbi = [
  parseAbiItem([
    `function tiersOf(address, uint256[], bool _includeResolvedUri, uint256 _startingId, uint256 _size) view returns (JB721Tier[] _tiers)`,
    `struct JB721Tier { uint256 id; uint256 price; uint256 remainingQuantity; uint256 initialQuantity; uint256 votingUnits; uint256 reservedRate; address reservedTokenBeneficiary; bytes32 encodedIPFSUri; uint256 category; bool allowManualMint; bool transfersPausable; string resolvedUri; }`,
  ]),
];
