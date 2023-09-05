import { html } from "../utils";

export const About = {
  render: html`
    <h1>About</h1>
    <p>
      <span class="bananapus">bananapus</span> is developing tools to align
      Juicebox communities. Our first set of contracts includes:
    </p>
    <ol>
      <li>
        A
        <a
          href="https://github.com/Bananapus/bananapus-721-staking-delegate/tree/feat/LockManager"
          >staking contract</a
        >. Stake an ERC-20 token by paying a Juicebox project, and receive NFTs
        which represent your staked position in return.
      </li>
      <li>
        A
        <a
          href="https://github.com/Bananapus/bananapus-distributor/tree/juice-distributor-alt"
          >reward distributor contract</a
        >. Anyone can send ERC-20 tokens to this contract, and stakers can use
        their staked position NFTs to claim a portion of those ERC-20 token
        rewards over time.
      </li>
      <li>
        A
        <a href="https://github.com/Bananapus/bananapus-tentacles"
          >cross-chain bridging contract</a
        >. This contract allows stakers to lock their NFTs, representing their
        staked position, to claim new ERC-20 tokens for each chain a community
        uses. Once the tokens are sent to their respective chains using standard
        ERC-20 bridges, the stakers can interact with staking and reward
        distributor contracts on those chains.
      </li>
    </ol>
    <p>
      These tools can be combined in a variety of ways to align communities on
      one EVM blockchain, or across many. For example:
    </p>
    <ul>
      <li>
        JuiceboxDAO could deploy a JBX staking contract and route 20% of new JBX
        issuance to a distributor contract which rewards those stakers. It could
        also send wETH or other tokens to the contract, which would be made
        available to stakers.
      </li>
      <li>
        A project could use a staking contract with their project token with
        Governor Bravo for onchain governance.
      </li>
      <li>
        A community with projects on mainnet and Arbitrum could reward project
        token stakers on both chains, sending reserved issuance in both
        directions.
      </li>
    </ul>
    <p>
      Bananapus is using these contracts to align the Juicebox community across
      Ethereum L2s by deploying the protocol on many chains and routing fees to
      mainnet JBX stakers.
    </p>
  `,
};
