import { parseAbiItem } from "viem";

export const TESTNET = true;
export const BANANAPUS_PROJECT_ID = TESTNET ? 601 : 488;

export const TESTNET_PROJECT_ID = 1198
export const JB721StakingDelegate = TESTNET
  ? "0x3C031b74E404a59D6d113168cd54319f1dEEb524"
  : "";
export const JB721StakingDistributor = TESTNET
  ? "0xA5083956BE860c7C1Ddd60c13660cA2d406141E3"
  : "";
export const JBERC20PaymentTerminal = TESTNET
  ? "0xA7E85edE65837634679B38B9Cda44a2Df78e656d"
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
