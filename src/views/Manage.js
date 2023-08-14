import { getAccount, getPublicClient, readContract, writeContract } from "@wagmi/core";
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
    if (!account.isConnected) {
      document.getElementById("app").innerHTML = `
        <h1>Manage</h1>
        <em>
          <p style='color: #f08000'>
            You must connect your wallet to manage your NFTs.
          </p>
        </em>`;
      return;
    }

    document.getElementById("app").style.maxWidth = "100%";

    const beginVesting = document.getElementById("begin-vesting");
    const collectRewards = document.getElementById("collect-rewards");
    const redeemNfts = document.getElementById("redeem-nfts");
    const yourNfts = document.getElementById("your-nfts")

    // Fetch transfer events
    const publicClient = getPublicClient()
    const filter = await publicClient.createContractEventFilter({
      contract: JB721StakingDelegate,
      eventName: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
      fromBlock: 9507473n, // TODO: Deployment block of JB721StakingDelegate
      args: {
        to: account.address,
      },
    })
    const logs = await publicClient.getFilterChanges({ filter })
    console.log(logs)

    // Get the user's NFTs
    // readContract({
    //   contract: JB721StakingDelegate,
    //   abi: parseAbiItem(),
    // })

    beginVesting.onclick = () => {
      // TODO: Update to beginVesting on the new contract
      writeContract({
        contract: JB721StakingDistributor,
        abi: parseAbiItem(
          "function claim(uint256[] _tokenIds, address[] _tokens)"
        ),
        functionName: "claim",
        args: [],
      });
    };

    collectRewards.onclick = async () => {
      // TODO: Update to collectVestedRewards on new contract
      await writeContract({
        contract: JB721StakingDistributor,
        functionName: "collect",
        abi: parseAbiItem('function collect(uint256[] _tokenIds, address[] _tokens, uint256 _cycle)'),
        args: [
          [1000000002],

        ],
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
      document.getElementById("app").style.maxWidth = "800px";
      eventListeners.forEach((e) => {
        e.element.removeEventListener(e.type, e.listener);
      });
    };
  },
};
