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
  TESTNET_PROJECT_ID,
} from "../consts";
import { JBIpfsDecode, formatLargeBigInt } from "../utils";

export const Stake = {
  render: `
<h1>Stake</h1>
<dialog id="nft-info-dialog"></dialog>
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
    <button id="reset-cart-button">Reset</button>
    <button id="buy-button">Buy</button>
  </div>
</div>
`,
  setup: async () => {
    const app = document.getElementById("app");
    const account = getAccount();
    if (!account.isConnected) {
      app.innerHTML = `
        <h1>Stake</h1>
        <em>
          <p style='color: #f08000'>
            You must connect your wallet to stake.
          </p>
        </em>`;
      return;
    }

    app.style.maxWidth = "100%";

    const tiersMenu = document.getElementById("tiers-menu");
    const userBalance = document.getElementById("user-balance");
    const buyButton = document.getElementById("buy-button");
    const resetCartButton = document.getElementById("reset-cart-button");
    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");
    const cartStatusText = document.getElementById("cart-status-text");
    const nftInfoDialog = document.getElementById("nft-info-dialog");

    const IpfsBaseUrl = "https://ipfs.io/ipfs/";
    const base64RegExp = /^data:(.+?)(;base64)?,(.*)$/;
    let currentAllowance;

    // Fetch initial information
    const [maxTier, token, decimals, nftSymbol] = await readContracts({
      contracts: [
        {
          address: JB721StakingDelegate,
          abi: [parseAbiItem("function maxTier() returns (uint256)")],
          functionName: "maxTier",
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
        {
          address: JB721StakingDelegate,
          abi: [parseAbiItem("function symbol() returns (string)")],
          functionName: "symbol",
        },
      ],
    }).catch((e) => {
      app.innerText =
        "Encountered an error while reading from contracts. See the console.";
      console.error(e);
      return;
    });

    // Fetch information from the token contract
    const [tiers, balance, symbol, allowance] = await readContracts({
      contracts: [
        {
          address: JB721StakingDelegate,
          abi: tiersOfAbi,
          functionName: "tiersOf",
          args: [
            JB721StakingDelegate,
            [], // _categories not needed
            true,
            0n,
            maxTier.result,
          ],
        },
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
    }).catch((e) => {
      app.innerText =
        "Encountered an error while reading from contracts. See the console.";
      console.error(e);
      return;
    });

    // Perform initial UI updates
    currentAllowance = allowance.result;
    console.log("Allowance: ", currentAllowance);
    buyButton.innerText =
      currentAllowance === BigInt(0)
        ? `Approve ${symbol.result}`
        : `Buy ${nftSymbol.result} NFTs`;
    userBalance.innerText = `Your Balance: ${parseFloat(
      formatUnits(balance.result, Number(decimals.result))
    ).toLocaleString("en", { maximumFractionDigits: 18 })} ${symbol.result}`;

    console.log("Tiers retrieved.", tiers);

    /**
     * @description Render an array of NFT tiers.
     * @argument tiers An array of tiers.
     */
    function renderNftTiers(tiers) {
      tiers.forEach(async (tier) => {
        let name, description, image, external_url;
        if (!tier.resolvedUri) {
          ({ name, description, image, external_url } = await fetch(
            IpfsBaseUrl + JBIpfsDecode(tier.encodedIPFSUri)
          )
            .then((res) => res.json())
            .catch((e) =>
              console.error(
                "Encountered an error while reading NFT data from IPFS.",
                e
              )
            ));
        } else {
          const resolvedUriMatch = tier.resolvedUri.match(base64RegExp);
          if (resolvedUriMatch)
            ({ name, description, image, external_url } = JSON.parse(
              atob(resolvedUriMatch[3])
            ));
          else
            console.error(
              "Could not match resolvedUri, using encodedIPFSUri",
              tier.resolvedUri
            );
        }

        const nftDiv = document.createElement("div");
        nftDiv.className = "nft-div";
        nftDiv.dataset.id = tier.id;
        nftDiv.dataset.price = tier.price;
        nftDiv.dataset.remainingQuantity = tier.remainingQuantity;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        nftDiv.appendChild(checkbox);

        // Handle various metadata types
        if (image) {
          const mediaDiv = document.createElement("div");
          nftDiv.appendChild(mediaDiv);
          mediaDiv.className = "media-div";
          console.log(image);

          const imageMatch = image.match(base64RegExp);
          if (!imageMatch) {
            fetch(image)
              .then((res) => {
                const mediaType = res.headers.get("Content-Type");
                if (mediaType.startsWith("image/")) {
                  const img = document.createElement("img");
                  img.src = image;
                  img.alt = `${
                    tier.name ? tier.name : nftSymbol.result
                  } artwork`;
                  mediaDiv.appendChild(img);
                } else if (mediaType.startsWith("video/")) {
                  const video = document.createElement("video");
                  video.controls = true;
                  video.src = image;
                  mediaDiv.appendChild(video);
                } else if (mediaType.startsWith("text/")) {
                  res.text().then((text) => {
                    const div = document.createElement("div");
                    div.textContent = text;
                    mediaDiv.appendChild(div);
                  });
                }
              })
              .catch((e) => console.error(e));
          } else {
            // TODO: Continue from here.
            // console.log(atob(imageMatch[3]));
          }
        }

        const textSection = document.createElement("div");
        textSection.classList.add("text-section");
        const titleAnchor = document.createElement("a");
        const titleTextContent = name
          ? name
          : `${nftSymbol.result} tier ${tier.id.toString()}`;
        titleAnchor.textContent = titleTextContent;
        nftDiv.dataset.title = titleTextContent;
        titleAnchor.classList.add("title");
        textSection.appendChild(titleAnchor);

        if (external_url) {
          titleAnchor.href = external_url;
          titleAnchor.target = "_blank";
          titleAnchor.classList.add("external-link");
        }

        if (description) {
          const descriptionParagraph = document.createElement("p");
          descriptionParagraph.textContent = description ? description : "";
          descriptionParagraph.classList.add("description");
          textSection.appendChild(descriptionParagraph);
        }

        nftDiv.appendChild(textSection);

        let priceLi, supplyLi, votesLi;
        const stats = document.createElement("ul");
        priceLi = document.createElement("li");
        priceLi.textContent = `${formatEther(tier.price)} ${symbol.result}`;
        stats.appendChild(priceLi);

        if (tier.initialQuantity !== 1_000_000_000n) {
          supplyLi = document.createElement("li");
          supplyLi.textContent = `${formatLargeBigInt(
            tier.remainingQuantity
          )}/${formatLargeBigInt(tier.initialQuantity)} left`;
          stats.appendChild(supplyLi);
        }

        if (tier.votingUnits) {
          votesLi = document.createElement("li");
          votesLi.textContent = `${formatLargeBigInt(tier.votingUnits)} votes`;
          stats.appendChild(votesLi);
        }

        nftDiv.appendChild(stats);

        // Create and append info popup button. On click, emit an event which
        // triggers a dialog with information about this NFT.
        const infoButton = document.createElement("button");
        infoButton.innerText = "…";
        infoButton.className = "info-btn";
        nftDiv.appendChild(infoButton);

        const showInfoDialogEvent = new CustomEvent("showInfoDialogEvent", {
          detail: {
            titleTextContent,
            description,
            priceString: priceLi?.textContent,
            supplyString: supplyLi?.textContent,
            votesString: votesLi?.textContent,
          },
          bubbles: true,
        });

        infoButton.onclick = () =>
          infoButton.dispatchEvent(showInfoDialogEvent);

        tiersMenu.appendChild(nftDiv);
      });
    }

    renderNftTiers(tiers.result);

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
        const cartItem = document.createElement("li");

        const inputAndTitleDiv = document.createElement("div");
        inputAndTitleDiv.className = "item-detail";

        const input = document.createElement("input");
        input.type = "number";
        input.value = nft.quantity;
        input.oninput = () => {
          if (input.value < 1) input.value = 1;
          cart.get(tierId).quantity = input.value;
          renderCart();
        };
        inputAndTitleDiv.appendChild(input);

        const cartItemTitle = document.createElement("p");
        cartItemTitle.innerText = `x ${nft.title}`;
        cartItemTitle.classList.add("cart-title");
        inputAndTitleDiv.appendChild(cartItemTitle);
        cartItem.appendChild(inputAndTitleDiv);

        const removeFromCartButton = document.createElement("button");
        removeFromCartButton.className = "close-button";
        removeFromCartButton.innerText = "X";
        removeFromCartButton.onclick = () => {
          cart.delete(tierId);
          const checkbox = tiersMenu.querySelector(
            `.nft-div[data-id="${tierId}"] input[type="checkbox"]`
          );

          if (checkbox) checkbox.checked = false;
          renderCart();
        };

        const cartItemPriceP = document.createElement("p");
        cartItemPriceP.innerText = `${parseFloat(
          formatUnits(
            BigInt(nft.price) * BigInt(nft.quantity),
            Number(decimals.result)
          )
        ).toLocaleString("en", { maximumFractionDigits: 18 })} ${
          symbol.result
        }`;
        cartItemPriceP.className = "cart-item-price";
        cartItem.appendChild(cartItemPriceP);
        cartItem.appendChild(removeFromCartButton);

        cartItems.appendChild(cartItem);
        totalCartPrice += BigInt(nft.price) * BigInt(nft.quantity);
      });

      cartTotal.innerText = `Cart Total: ${parseFloat(
        formatUnits(totalCartPrice, Number(decimals.result))
      ).toLocaleString("en", { maximumFractionDigits: 18 })} ${symbol.result}`;

      const exceededBalance = totalCartPrice > balance.result;
      buyButton.disabled = exceededBalance;
      cartTotal.style.color = exceededBalance ? "red" : "";

      buyButton.innerText =
        allowance.result < totalCartPrice
          ? `Approve ${symbol.result}`
          : `Buy ${nftSymbol.result} NFTs`;
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
        // Show NFT info dialog when an info button is clicked
        element: tiersMenu,
        type: "showInfoDialogEvent",
        listener: (e) => {
          nftInfoDialog.innerHTML = [
            e.detail.titleTextContent
              ? `<h2>${e.detail.titleTextContent}</h2>`
              : "",
            e.detail.description ? `<p>${e.detail.description}</p>` : "",
            "<ul>",
            e.detail.supplyString ? `<li>${e.detail.supplyString}</li>` : "",
            e.detail.priceString ? `<li>${e.detail.priceString}</li>` : "",
            e.detail.votesString ? `<li>${e.detail.votesString}</li>` : "",
            "</ul>",
          ].join("");

          const closeDialog = document.createElement("button");
          closeDialog.textContent = "X";
          closeDialog.className = "close-button";
          closeDialog.onclick = () => nftInfoDialog.close();
          nftInfoDialog.appendChild(closeDialog);
          nftInfoDialog.showModal();
        },
      },
      {
        // Toggle checked status when an NFT tier is clicked
        element: tiersMenu,
        type: "click",
        listener: (e) => {
          if (e.target.className === "info-btn") return;
          const closestNftDiv = e.target.closest(".nft-div");

          if (closestNftDiv) {
            const checkbox = closestNftDiv.querySelector(
              'input[type="checkbox"]'
            );

            if (e.target !== checkbox) checkbox.checked = !checkbox.checked;

            if (checkbox.checked)
              cart.set(closestNftDiv.dataset.id, {
                price: closestNftDiv.dataset.price,
                remainingQuantity: closestNftDiv.dataset.remainingQuantity,
                title: closestNftDiv.dataset.title,
                quantity: 1,
              });
            else cart.delete(closestNftDiv.dataset.id);
            renderCart();
          }
        },
      },
      {
        // Buy the NFTs currently in the cart, approving tokens as needed.
        element: buyButton,
        type: "click",
        listener: async () => {
          if (cart.size === 0) return;

          let cartTotalCost = [...cart.values()]
            .map((p) => BigInt(p.price) * BigInt(p.quantity))
            .reduce((a, b) => a + b);

          buyButton.disabled = true;

          try {
            if (currentAllowance < cartTotalCost) {
              cartStatusText.innerText = `Approving ${symbol.result}...`;
              // Add note for MetaMask users.
              if (account.connector?.name === "MetaMask")
                cartStatusText.innerText +=
                  " Select 'Use default' in Metamask.";

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
              await waitForTransaction({ hash, confirmations: 1 });
            }
          } catch (e) {
            console.error(e);
            buyButton.disabled = false;
            cartStatusText.innerText = `${symbol.result} approval failed. Try again.`;
            return;
          }

          buyButton.innerText = `Buy ${nftSymbol.result} NFTs`;
          cartStatusText.innerText = `Staking...`;
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
              ),
            ]
          );

          const payArgs = [
            BigInt(TESTNET_PROJECT_ID), // TODO: Replace with real project ID
            cartTotalCost,
            token.result,
            account.address,
            0n,
            false,
            "Paid from bananapus.com",
            hexString,
          ];

          try {
            const { hash } = await writeContract({
              address: JBERC20PaymentTerminal,
              abi: payAbi,
              functionName: "pay",
              args: payArgs,
            });
            cartStatusText.innerText = "Staking transaction pending...";
            await waitForTransaction({ hash, confirmations: 1 });
            resetCartButton.click();
            cartStatusText.innerText = "Success!";
          } catch (e) {
            console.error(e);
            cartStatusText.innerText = "Staking failed.";
          } finally {
            buyButton.disabled = false;
          }
        },
      },
      {
        element: resetCartButton,
        type: "click",
        listener: () => {
          cart.clear();
          renderCart();
          const checkboxes = document.querySelectorAll(
            '.nft-div input[type="checkbox"]'
          );
          checkboxes.forEach((c) => (c.checked = false));
        },
      },
    ];

    // Add all event listeners defined above.
    eventListeners.forEach((e) =>
      e.element.addEventListener(e.type, e.listener)
    );

    // Return function to clean event listeners when the page changes.
    return () => {
      eventListeners.forEach((e) =>
        e.element.removeEventListener(e.type, e.listener)
      );
    };
  },
};
