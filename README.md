# Bananapus Staking Frontend

## Description

Interact with [`bananapus-721-staking-delegate`](https://github.com/Bananapus/bananapus-721-staking-delegate/tree/feat/concept) and [`bananapus-distributor`](https://github.com/Bananapus/bananapus-distributor/tree/juice-distributor-alt).

## Usage

```bash
cp .example.env .env # Set up env
npm i # Install dependencies
npm run dev # Dev server
npm run build # Build to /dist
```

## Functionality

This frontend must allow users to connect their wallet, with which they can:
- Stake tokens by calling `JBERC20PaymentTerminal3_1_2.pay(...)` with the appropriate metadata.
- Unstake their tokens by calling `JBERC20PaymentTerminal3_1_2.redeemTokensOf(...)` with the appropriate metadata.
- The user can register their holdings by calling `JB721StakingDistributor.claim(...)`.
- Allow users to collect rewards by calling `JB721StakingDistributor.collect(...)`. Users should be able to claim past rewards by passing previous `_cycle`s

## bananapus-721-delegate

Stake by paying a project with an attached `banapus-721-staking-delegate`. The staking delegate only accepts payments of a defined `stakingToken`.

`_processPayment` takes a `JBDidPayData`:
- The first 32 bytes of metadata are used to pass the referring project's ID, and the next 32 bytes are used for generic extension parameters.
- Bytes 64-68 (bytes4) are either the `IJB721StakingDelegate` or `IJBTiered721Delegate`'s `interfaceId`.
- Next is an ignored bool
- Then the address of a `_votingDelegate`
- Then a `JB721StakingTier[]` of `_tierIdsToMint`

Mints these with `_mintTiersWithCustomAmount`.

`redeemParams` takes a `JBRedeemParamsData`:
- The first 32 bytes of metadata are reserved for generic extension parameters.
- Bytes 32-36 is a `bytes4` `interfaceId` which must equal `IJB721Delegate`'s.
- The remaining metadata is a `uint256[]` of `_decodedTokenIds`.

Can either `_mintTiers` (according to 721 delegate spec) or (with custom staking amount).

`_getTierBaseAmount`:

| tierId (x) | Return |
| --- | --- |
| 1 | 1 |
| 2-10 | \_tierId * 100 - 100 |
| 11-20 | (\_tierId - 10) * 1,000 |
| 20-30 | (\_tierId - 20) * 2,000 + 10,000 |
| 30-37 | (\_tierId - 27) * 10,000 |
| 37-46 | (\_tierId - 36) * 100,000 |
| 46-55 | (\_tierId - 45) * 1,000,000 |
| 56-58 | (\_tierId - 55) * 10,000,000 |
| 59 | 100,000,000 |
| 60 | 600,000,000 |

See chart (including staking amounts) on [Notion](https://www.notion.so/juicebox/veBanny-proposal-from-Jango-2-68c6f578bef84205a9f87e3f1057aa37).

## JBDistributor

A user calls `claim(uint256[] calldata _tokenIds, IERC20[] calldata _tokens)` with the `tokenIds` they hold (and want to claim with) and the tokens that they want to claim. This emits the following event:

```sol
event claimed(uint256 indexed tokenId, IERC20 token, uint256 amount, uint256 vestingReleaseBlockNumber);
```

Once the contract is at the `vestingReleaseBlockNumber`, users can then claim vested rewards with `collect`:

```sol
/**
 * Collect vested tokens
 * @param _tokenIds the nft ids to claim for
 * @param _tokens the tokens to claim
 * @param _cycle the cycle in which the tokens were done vesting
 */
function collect(
    uint256[] calldata _tokenIds,
    IERC20[] calldata _tokens,
    uint256 _cycle
) external { ... }
```

## Note

```bash
anvil --fork-chain-id 5 --fork-url https://rpc.ankr.com/eth_goerli --fork-block-number <block-number>
forge script DeployGoerli --broadcast --rpc-url http://127.0.0.1:8545 --sender <sender> --private-key <private-key>
```
