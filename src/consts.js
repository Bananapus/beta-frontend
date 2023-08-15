import { parseAbiItem } from "viem";

export const TESTNET = true;
export const BANANAPUS_PROJECT_ID = TESTNET ? 601 : 488;

export const TESTNET_PROJECT_ID = 1191
export const JB721StakingDelegate = TESTNET
  ? "0x917AB049b358F78bc230EdF7332a2111B4C95627"
  : "";
export const JB721StakingDistributor = TESTNET
  ? "0x1a94F75BBFAC60b3142278f879240AB23c88A013"
  : "";
export const JBERC20PaymentTerminal = TESTNET
  ? "0x5193268003Fbbf377932E733Ea3404C555fa1Ea5"
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
