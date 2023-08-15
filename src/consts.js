import { parseAbiItem } from "viem";

export const TESTNET = true;
export const BANANAPUS_PROJECT_ID = TESTNET ? 601 : 488;

export const TESTNET_PROJECT_ID = 1195
export const JB721StakingDelegate = TESTNET
  ? "0x7e4453F97165381E505cF1561c45046229bFf4eC"
  : "";
export const JB721StakingDistributor = TESTNET
  ? "0x70A8fEe5e1221a8Bb5E4e37cf82Fa4AB796BdBb4"
  : "";
export const JBERC20PaymentTerminal = TESTNET
  ? "0xEA82EA879198E77f70bf7231C2050BCac05De919"
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
