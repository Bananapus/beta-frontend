import { getAccount, readContracts, writeContract } from "@wagmi/core";
import { formatEther, parseAbiItem } from "viem";
import {
  JBERC20PaymentTerminal,
  JB721StakingDelegate,
  payAbi,
  tiersOfAbi,
} from "../consts";
import { JBIpfsDecode, formatNumber } from "../utils";

export const Stake = {
  render: `
<h1>Stake</h1>
<div id="stake-container">
  <div id="tiers-menu"></div>
  <div id="cart-menu">
    <h2>Your Cart</h2>
    <div id="cart-items"><p>Cart empty.</p></div>
    <ul>
      <li id="user-balance"></li>
      <li id="cart-total">In Cart: 0 WETH</li>
    </ul>
    <button id="reset-button">Reset</button>
    <button id="buy-button">Buy</button>
  </div>
</div>
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
    const userBalance = document.getElementById("user-balance");
    const buyButton = document.getElementById("buy-button");
    const resetButton = document.getElementById("reset-button");

    document.getElementById("app").style.maxWidth = "100%";

    const [tiers, token, decimals] = await readContracts({
      contracts: [
        {
          address: JB721StakingDelegate,
          abi: tiersOfAbi,
          functionName: "tiersOf",
          args: [
            JB721StakingDelegate,
            [], // _categories not needed
            true,
            0,
            100, // Fetch all tiers. Large numbers cause revert.
          ],
        },
        {
          address: JBERC20PaymentTerminal,
          abi: [parseAbiItem("function token() returns (address)")],
          functionName: "token",
        },
        {
          address: JBERC20PaymentTerminal,
          abi: [parseAbiItem("function decimals() returns (uint256)")],
          functionName: "decimals",
        },
      ],
    });

    const IpfsBaseUrl = "https://ipfs.io/ipfs/";
    // Build and add each NFT tier
    tiers.result.forEach((tier) => {
      fetch(IpfsBaseUrl + JBIpfsDecode(tier.encodedIPFSUri))
        .then((res) => res.json())
        .then((nftUri) => {
          const nftDiv = document.createElement("div");
          nftDiv.className = "nft-div";
          nftDiv.dataset.id = tier.id;
          nftDiv.dataset.price = tier.price;

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
            nftDiv.dataset.image = nftUri.image;
            nftDiv.appendChild(img);
          }

          const textSection = document.createElement("div");
          textSection.classList.add("text-section");
          const title = document.createElement("a");
          const titleText = nftUri.name
            ? nftUri.name
            : `Tier ${tier.id.toString()}`;
          title.textContent = titleText;
          nftDiv.dataset.title = titleText;
          title.classList.add("title");
          textSection.appendChild(title);

          if (nftUri.external_url) {
            title.href = nftUri.external_url;
            title.target = "_blank";
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
          if (tier.initialQuantity !== BigInt(1000000000)) {
            const supply = document.createElement("li");
            supply.textContent = `${formatNumber(
              tier.remainingQuantity
            )}/${formatNumber(tier.initialQuantity)} left`;
            stats.appendChild(supply);
          }
          if (tier.votingUnits) {
            const votes = document.createElement("li");
            votes.textContent = `${formatNumber(tier.votingUnits)} votes`;
            stats.appendChild(votes);
          }
          nftDiv.appendChild(stats);

          tiersMenu.appendChild(nftDiv);
        });
    });

    // Display balance
    const [balance, symbol] = await readContracts({
      contracts: [
        {
          address: token.result,
          abi: [
            parseAbiItem("function balanceOf(address) view returns (uint256)"),
          ],
          functionName: "balanceOf",
          args: [account.address],
        },
        {
          address: token.result,
          abi: [parseAbiItem("function symbol() view returns (string)")],
          functionName: "symbol",
        },
      ],
    });
    userBalance.innerText = `Balance: ${formatNumber(
      balance.result / BigInt(10) ** decimals.result
    )} ${symbol.result}`;

    const cart = [];
    const updateCart = (tierId, addToCart) => {
      const index = cart.findIndex((id) => id === tierId);
      if (addToCart && index === -1) cart.push(tierId);
      else if (!addToCart && index !== -1) cart.splice(index, 1);

      console.log(cart);
    };

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

            updateCart(closestNftDiv.dataset.id, checkbox.checked);
          }
        },
      },
      {
        element: buyButton,
        type: "click",
        // Buy NFTs in cart.
        listener: () => {
          writeContract({
            address: JBERC20PaymentTerminal,
            abi: payAbi,
            functionName: "pay",
            args: [],
          });
        },
      },
      {
        element: resetButton,
        type: "click",
        listener: () => {
          cart = [];
        },
      },
    ];

    eventListeners.forEach((e) =>
      e.element.addEventListener(e.type, e.listener)
    );

    return () => {
      document.getElementById("app").style.maxWidth = "800px";
      eventListeners.forEach((e) =>
        e.element.removeEventListener(e.type, e.listener)
      );
    };
  },
};
