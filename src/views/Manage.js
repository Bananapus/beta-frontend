import {
  getAccount,
  getPublicClient,
  readContracts,
  writeContract,
} from "@wagmi/core";
import { parseAbiItem } from "viem";
import { JB721StakingDelegate, JB721StakingDistributor } from "../consts";

export const Manage = {
  render: `
<h1>Manage</h1>
<h2>Your NFTs</h2>
<div id="your-nfts"></div>
<h2>Rewards</h2>
<button id="begin-vesting">Begin Vesting</div>
<button id="collect-rewards">Collect Rewards</button>
<button id="redeem-nfts">Redeem NFTs</button>
<p id="reward-status-text"></p>
`,
  setup: async () => {
    const account = getAccount();
    const app = document.getElementById("app")
    if (!account.isConnected) {
      app.innerHTML = `
        <h1>Manage</h1>
        <em>
          <p style='color: #f08000'>
            You must connect your wallet to manage your NFTs.
          </p>
        </em>`;
      return;
    }

    // Fetch transfer events
    const publicClient = getPublicClient();
    const transfersToAccount = await publicClient.getLogs({
      address: JB721StakingDelegate,
      event: parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
      ),
      fromBlock: 9507473n, // TODO: Deployment block of JB721StakingDelegate
      args: {
        to: account.address,
      },
    });

    if (!transfersToAccount[0]) {
      app.innerHTML = `
        <h1>Manage</h1>
        <em>
          <p style='color: #f08000'>
            Could not find NFTs for ${account.address}
          </p>
        </em>`;
      return;
    }

    const transfersFromAccount = await publicClient.getLogs({
      address: JB721StakingDelegate,
      event: parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
      ),
      fromBlock: 9507473n, // TODO: Deployment block of JB721StakingDelegate
      args: {
        from: account.address,
      },
    });

    app.style.maxWidth = "100%";

    const beginVesting = document.getElementById("begin-vesting");
    const collectRewards = document.getElementById("collect-rewards");
    const redeemNfts = document.getElementById("redeem-nfts");
    const yourNfts = document.getElementById("your-nfts");

    console.log(transfersToAccount);

    const heldTokenIds = new Map();

    transfersToAccount.forEach((t) => {
      if (heldTokenIds.has(t.args.tokenId)) {
        if (heldTokenIds.get(t.args.tokenId) < t.blockNumber)
          heldTokenIds.set(t.args.tokenId, t.blockNumber);
      } else heldTokenIds.set(t.args.tokenId, t.blockNumber);
    });
    transfersFromAccount.forEach((f) => {
      if (heldTokenIds.has(f.args.tokenId))
        if (heldTokenIds.get(f.args.tokenId) < f.blockNumber)
          heldTokenIds.delete(f.args.tokenId);
    });

    console.log(heldTokenIds.keys());

    const [
      tierMultiplier,
      totalRedemptionWeight,
      userVotingPower,
      stakingToken,
    ] = await readContracts({
      contracts: [
        {
          contract: JB721StakingDelegate,
          abi: [parseAbiItem("function tierMultiplier() view returns(uint256)")],
          functionName: "tierMultiplier",
        },
        {
          contract: JB721StakingDelegate,
          functionName: "totalRedemptionWeight",
          abi: [parseAbiItem(
            "function totalRedemptionWeight(address) view returns (uint256 weight)"
          )],
          args: account.address,
        },
        {
          contract: JB721StakingDelegate,
          functionName: "userVotingPower",
          abi: [parseAbiItem(
            "function userVotingPower(address) view returns (uint256)"
          )],
          args: account.address,
        },
        {
          contract: JB721StakingDelegate,
          functionName: "stakingToken",
          abi: [parseAbiItem("function stakingToken() view returns (address)")],
        },
      ],
    });

    console.log(
      tierMultiplier,
      totalRedemptionWeight,
      userVotingPower,
      stakingToken
    );

    beginVesting.onclick = () => {
      writeContract({
        contract: JB721StakingDistributor,
        abi: parseAbiItem(
          "function beginVesting(uint256[] _tokenIds, address[] _tokens)"
        ),
        functionName: "beginVesting",
        args: [],
      });
    };

    collectRewards.onclick = async () => {
      await writeContract({
        contract: JB721StakingDistributor,
        functionName: "collectVestedRewards",
        abi: parseAbiItem(
          "function collectVestedRewards(uint256[] _tokenIds, address[] _tokens, uint256 _round)"
        ),
        args: [],
      });
    };

    /**
     * @typedef {Object} EventListenerObjs
     * @property {HTMLElement} element - The target element.
     * @property {string} type - The event type.
     * @property {Function} listener - The function to invoke.
     */

    /** @type {EventListenerObjs[]} */
    const eventListeners = [];

    eventListeners.forEach((e) =>
      e.element.addEventListener(e.type, e.listener)
    );

    return () => {
      eventListeners.forEach((e) => {
        e.element.removeEventListener(e.type, e.listener);
      });
    };
  },
};
