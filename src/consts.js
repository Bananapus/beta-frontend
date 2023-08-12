import { parseAbiItem } from "viem";

export const TESTNET = true;

export const JB721StakingDelegate = TESTNET
  ? "0xDBe5ABD7fc211B4249F02013a35bb4cccEE41cd4"
  : "";
export const JBERC20PaymentTerminal = TESTNET
  ? "0x73CF72D2C4b3C8C541c2b294B221EeD15fbE5266"
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

export const BANANAPUS_PROJECT_ID = TESTNET ? 601 : 488
