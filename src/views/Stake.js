import {
  getAccount,
  readContracts,
  waitForTransaction,
  writeContract,
} from "@wagmi/core";
import {
  encodeAbiParameters,
  formatEther,
  formatUnits,
  parseAbiItem,
  parseAbiParameters,
} from "viem";
import {
  JBERC20PaymentTerminal,
  JB721StakingDelegate,
  payAbi,
  tiersOfAbi,
  BANANAPUS_PROJECT_ID,
} from "../consts";
import { JBIpfsDecode, formatLargeBigInt } from "../utils";

export const Stake = {
  render: `
<h1>Stake</h1>
<div id="stake-container">
  <div id="tiers-menu"></div>
  <div id="cart-menu">
    <h2>Your Cart</h2>
    <ul id="cart-items"></ul>
    <ul>
      <li id="user-balance"></li>
      <li id="cart-total">Cart Total: -</li>
      <li id="cart-status-text" style="font-style: italic"></li>
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
    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");
    const cartStatusText = document.getElementById("cart-status-text");

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
          nftDiv.dataset.remainingQuantity = tier.remainingQuantity;

          // TODO: Fullscreen button shows dialog with full metadata.
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
            supply.textContent = `${formatLargeBigInt(
              tier.remainingQuantity
            )}/${formatLargeBigInt(tier.initialQuantity)} left`;
            stats.appendChild(supply);
          }
          if (tier.votingUnits) {
            const votes = document.createElement("li");
            votes.textContent = `${formatLargeBigInt(tier.votingUnits)} votes`;
            stats.appendChild(votes);
          }
          nftDiv.appendChild(stats);

          tiersMenu.appendChild(nftDiv);
        });
    });

    // Display balance
    const [balance, symbol, allowance] = await readContracts({
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
        {
          address: token.result,
          abi: [
            parseAbiItem(
              "function allowance(address _owner, address _spender) public view returns (uint256 remaining)"
            ),
          ],
          functionName: "allowance",
          args: [account.address, JBERC20PaymentTerminal],
        },
      ],
    });

    buyButton.innerText =
      allowance.result === BigInt(0) ? `Approve ${symbol.result}` : `Buy`;

    userBalance.innerText = `Your Balance: ${parseFloat(
      formatUnits(balance.result, Number(decimals.result))
    ).toLocaleString("en", { maximumFractionDigits: 18 })} ${symbol.result}`;

    /**
     * @typedef {Object} CartProps
     * @property {BigInt} price - The price of the NFT.
     * @property {BigInt} remainingQuantity - The remaining quantity of the NFT.
     * @property {string} title - The title of the NFT.
     * @property {number} quantity - The quantity of the NFT.
     */

    /** @type {Map<BigInt, CartProps>} cart Mapping of NFT tierIds to CartProps */
    const cart = new Map();

    function renderCart() {
      if (cart.size === 0) {
        cartItems.innerHTML = "<li>Cart empty.</li>";
        cartTotal.innerText = `Cart Total: 0 ${symbol.result}`;
        return;
      }

      let totalCartPrice = BigInt(0);

      cartItems.innerHTML = "";

      cart.forEach((nft, tierId) => {
        const li = document.createElement("li");

        const itemDetail = document.createElement("div");
        itemDetail.className = "item-detail";

        const input = document.createElement("input");
        input.type = "number";
        input.value = nft.quantity;
        input.oninput = () => {
          if (input.value <= 0) input.value = 1;
          cart.get(tierId).quantity = input.value;
          renderCart();
        };
        itemDetail.appendChild(input);

        const title = document.createElement("p");
        title.innerText = "x " + nft.title;
        title.classList.add("cart-title");
        itemDetail.appendChild(title);
        li.appendChild(itemDetail);

        const removeButton = document.createElement("button");
        removeButton.innerText = "X";
        removeButton.onclick = () => {
          cart.delete(tierId);
          const checkbox = tiersMenu.querySelector(
            `.nft-div[data-id="${tierId}"] input[type="checkbox"]`
          );
          if (checkbox) checkbox.checked = false;
          renderCart();
        };

        const price = document.createElement("p");
        price.innerText = `${parseFloat(
          formatUnits(
            BigInt(nft.price) * BigInt(nft.quantity),
            Number(decimals.result)
          )
        ).toLocaleString("en", { maximumFractionDigits: 18 })} ${
          symbol.result
        }`;
        price.className = "cart-item-price";
        li.appendChild(price);

        li.appendChild(removeButton);

        cartItems.appendChild(li);
        totalCartPrice += BigInt(nft.price) * BigInt(nft.quantity);
      });

      cartTotal.innerText = `Cart Total: ${parseFloat(
        formatUnits(totalCartPrice, Number(decimals.result))
      ).toLocaleString("en", { maximumFractionDigits: 18 })} ${symbol.result}`;

      if (totalCartPrice > balance.result) {
        buyButton.disabled = true;
        cartTotal.style.color = "red";
      } else {
        buyButton.disabled = false;
        cartTotal.style.color = "";
      }
    }

    renderCart();

    /**
     * @typedef {Object} EventListenerObjs
     * @property {HTMLElement} element - The target element.
     * @property {string} type - The event type.
     * @property {Function} listener - The function to invoke.
     */

    /** @type {EventListenerObjs} */
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

            if (checkbox.checked)
              cart.set(closestNftDiv.dataset.id, {
                price: closestNftDiv.dataset.price,
                remainingQuantity: closestNftDiv.dataset.remainingQuantity,
                title: closestNftDiv.dataset.title,
                quantity: 1,
              });
            else cart.delete(closestNftDiv.dataset.id);
            renderCart();

            console.log(cart);
          }
        },
      },
      {
        element: buyButton,
        type: "click",
        // Buy NFTs in cart.
        listener: async () => {
          if (cart.size === 0) return;

          let cartTotalCost = [...cart.values()]
            .map((p) => BigInt(p.price) * BigInt(p.quantity))
            .reduce((a, b) => a + b);

          buyButton.disabled = true;

          try {
            if (allowance.result < cartTotalCost) {
              cartStatusText.innerText = `Approving ${symbol.result}...`;
              if (account.connector?.name === "MetaMask")
                cartStatusText.innerText +=
                  " Select 'Use default' in Metamask.";
              console.log(account.connector);
              const { hash } = await writeContract({
                address: token.result,
                abi: [
                  parseAbiItem(
                    "function approve(address _spender, uint256 _value) public returns (bool success)"
                  ),
                ],
                functionName: "approve",
                args: [JBERC20PaymentTerminal, cartTotalCost],
              });

              cartStatusText.innerText = "Approval transaction pending...";
              const data = await waitForTransaction({ hash, confirmations: 1 });
              console.log(data);
            }
          } catch (e) {
            console.log(e);
            buyButton.disabled = false;
            cartStatusText.innerText = `${symbol.result} approval failed. Try again.`;
            return;
          }

          cartStatusText.innerText = `Staking...`;

          console.log(
            "Tiers: ",
            [...cart.entries()].flatMap((e) => {
              console.log("Quantity: ", e[1].quantity);
              return Array.from({ length: e[1].quantity }, () => [
                BigInt(e[0]),
                e[1].price,
              ]);
            }) // Finally, JB721StakingTier[]
          );

          const hexString = encodeAbiParameters(
            parseAbiParameters([
              "bytes32, bytes32, bytes4, bool, address, JB721StakingTier[]",
              "struct JB721StakingTier { uint16 tierId; uint128 amount; }",
            ]),
            [
              "0x" + BANANAPUS_PROJECT_ID.toString(16).padStart(64, "0"), // First 32 bytes should be the Bananapus project ID (488).
              "0x" + "0".repeat(64), // Skip next 32 bytes.
              "0x00000000", // 4 bytes for interfaceId. TODO add the real one once deployed.
              false, // Next ignored bool
              "0x0000000000000000000000000000000000000000", // Next address of voting delegate
              [...cart.entries()].flatMap((e) =>
                Array.from({ length: e[1].quantity }, () => [
                  BigInt(e[0]),
                  e[1].price,
                ])
              ), // Finally, JB721StakingTier[]
            ]
          );

          const payArgs = [
            BigInt(1183), // TODO: Replace with real project ID
            cartTotalCost,
            token.result,
            account.address,
            BigInt(0),
            false,
            "Paid from bananapus.com",
            hexString,
          ];

          console.log(payArgs);

          try {
            const { hash } = await writeContract({
              address: JBERC20PaymentTerminal,
              abi: payAbi,
              functionName: "pay",
              args: payArgs,
            });
            cartStatusText.innerText = "Staking transaction pending...";
            await waitForTransaction({ hash, confirmations: 1 });
            resetButton.click();
            cartStatusText.innerText = "Success!";
          } catch (e) {
            console.log(e);
            cartStatusText.innerText = "Staking failed.";
          } finally {
            buyButton.disabled = false;
          }
        },
      },
      {
        element: resetButton,
        type: "click",
        listener: () => {
          cart.clear();
          renderCart();
          const checkboxes = document.querySelectorAll(
            '.nft-div input[type="checkbox"]'
          );
          checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
          });
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
