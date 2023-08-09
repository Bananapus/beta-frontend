import { getAccount, readContract } from "@wagmi/core";
import { parseAbiItem, formatEther } from "viem";
import { JBIpfsDecode } from "../utils";

export const Stake = {
  render: `
<h1>Stake</h1>
<div id="tiers-menu"></div>
<div id="cart-menu"></div>
<button id="buy-button">Buy</button>
<div id="balance-div"></div>
`,
  setup: async () => {
    const account = getAccount();
    if (!account.isConnected) {
      document.getElementById("app").innerHTML = `
        <h1>Stake</h1>
        <em>
          <p style='color: #f08000'>
            You must connect your wallet to stake.
          </p>
        </em>`;
      return;
    }

    const tiersMenu = document.getElementById("tiers-menu");
    const cartMenu = document.getElementById("cart-menu");
    const buyButton = document.getElementById("buy-button");
    const balanceDiv = document.getElementById("balance-div");

    // Both of these testnet contracts will be replaced by the JB721StakingDelegate.
    const JBTiered721DelegateStore =
      "0x155B49f303443a3334bB2EF42E10C628438a0656";
    const JBTiered721Delegate = "0xE048a3B06e38E76c2fE8b0451b0a1F36858218d1";

    const abi = [
      parseAbiItem([
        `function tiersOf(address, uint256[], bool _includeResolvedUri, uint256 _startingId, uint256 _size) view returns (JB721Tier[] _tiers)`,
        `struct JB721Tier { uint256 id; uint256 price; uint256 remainingQuantity; uint256 initialQuantity; uint256 votingUnits; uint256 reservedRate; address reservedTokenBeneficiary; bytes32 encodedIPFSUri; uint256 category; bool allowManualMint; bool transfersPausable; string resolvedUri; }`,
      ]),
    ];

    const tiers = await readContract({
      address: JBTiered721DelegateStore,
      abi,
      functionName: "tiersOf",
      args: [
        JBTiered721Delegate,
        [], // _categories not needed
        true,
        0,
        100, // Fetch all tiers. Large numbers cause revert.
      ],
    });

    const IpfsBaseUrl = "https://ipfs.io/ipfs/";
    // Build and add each NFT tier
    tiers.forEach((tier) => {
      fetch(IpfsBaseUrl + JBIpfsDecode(tier.encodedIPFSUri))
        .then((res) => res.json())
        .then((nftUri) => {
          const nftDiv = document.createElement("div");
          nftDiv.className = "nft-div";
          nftDiv.dataset.id = tier.id;

          const fullScreenButton = document.createElement("button");
          fullScreenButton.innerText = "…";
          fullScreenButton.classList.add("full-screen-btn");
          nftDiv.appendChild(fullScreenButton);

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          nftDiv.appendChild(checkbox);

          if (nftUri.image) {
            const img = document.createElement("img");
            img.src = nftUri.image;
            img.alt = `${tier.name ? tier.name : "NFT"} artwork`;
            nftDiv.appendChild(img);
          }

          const textSection = document.createElement("div");
          textSection.classList.add("text-section");

          const title = document.createElement("a");
          title.textContent = nftUri.name
            ? nftUri.name
            : `Tier ${tier.id.toString()}`;
          title.classList.add("title");
          textSection.appendChild(title);

          if (nftUri.external_url) {
            title.href = nftUri.external_url;
            title.classList.add("external-link");
          }

          const description = document.createElement("p");
          description.textContent = nftUri.description
            ? nftUri.description
            : "";
          description.classList.add("description");
          textSection.appendChild(description);

          nftDiv.appendChild(textSection);

          const stats = document.createElement("ul");

          const price = document.createElement("li");
          price.textContent = `${formatEther(tier.price)} ETH`;
          stats.appendChild(price);

          const supply = document.createElement("li");
          supply.textContent = `${tier.remainingQuantity}/${tier.initialQuantity} left`;
          stats.appendChild(supply);

          if (tier.votingUnits) {
            const votes = document.createElement("li");
            votes.textContent = `${tier.votingUnits} votes`;
            stats.appendChild(votes);
          }

          nftDiv.appendChild(stats);

          tiersMenu.appendChild(nftDiv);
        });
    });

    console.log(tiers);

    const cart = [];

    /**
     * @typedef {Object} EventListenerObjs
     * @property {HTMLElement} element - The target element.
     * @property {string} type - The event type.
     * @property {Function} listener - The function to invoke.
     */

    /** @type {EventListenerObjs[]} */
    const eventListeners = [
      {
        element: tiersMenu,
        type: "click",
        listener: (e) => {
          const closestNftDiv = e.target.closest(".nft-div");

          if (closestNftDiv) {
            const checkbox = closestNftDiv.querySelector(
              'input[type="checkbox"]'
            );

            if (e.target !== checkbox) {
              checkbox.checked = !checkbox.checked;
            }
          }
        },
      },
    ];

    eventListeners.forEach((e) =>
      e.element.addEventListener(e.type, e.listener)
    );

    return () => {
      eventListeners.forEach((e) =>
        e.element.removeEventListener(e.type, e.listener)
      );
    };
  },
};
