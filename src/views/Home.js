import { parseEther, formatEther } from "viem";
import {
  fetchBalance,
  getAccount,
  getNetwork,
  writeContract,
  switchNetwork,
} from "@wagmi/core";
import { TESTNET, payAbi } from "../consts";

export const Home = {
  render: `
<h1>Bananapus</h1>
<p>
  <span class="bananapus">bananapus</span> is developing onchain governance and
  Ethereum L2 solutions for Juicebox organizations.
</p>
<div id="purchase-section">
  <input id="eth-input" type="number" placeholder="ETH Amount" />
  <button id="buy-button" disabled>Buy NANA</button>
</div>
<span id="status-message" style="color: red;"></span>
<ul>
  <li>
    Anyone can buy $NANA above (or on
    <a href="https://juicebox.money/v2/p/488">Juicebox</a>).
  </li>
  <li>To learn more, read <a href="#/about">About</a>.</li>
  <li>
    To stake your \$NANA and earn a share of the network's growth, visit
    <a href="#/stake">Stake</a>.
  </li>
  <li>
    To manage your stake and collect rewards, visit <a href="#/manage">Manage</a>.
  </li>
</ul>
<p>
  To get involved, join our
  <a href="https://discord.gg/ErQYmth4dS">Discord server</a>.
</p>
`,
  setup: async () => {
    const account = getAccount();

    const input = document.getElementById("eth-input");
    const button = document.getElementById("buy-button");
    const statusMessage = document.getElementById("status-message");

    if (!account.isConnected) {
      input.disabled = true;
      button.disabled = true;
      statusMessage.textContent = "Connect your wallet to buy NANA.";
      statusMessage.style.color = "#F08000";
      return;
    }

    // TODO: Fetch this from contracts.
    const exchangeRate = 700000;
    let balance;
    try {
      balance = await fetchBalance({
        address: account.address,
      });
    } catch {
      console.error("Could not fetch wallet balance.");
    }

    const updateEstimate = () => {
      const inputEth = parseFloat(input.value);
      button.textContent =
        isNaN(inputEth) || inputEth == 0
          ? "Buy NANA"
          : `Buy ${(inputEth * exchangeRate).toLocaleString()} NANA`;
    };

    const validateAmount = () => {
      const inputEth = parseEther(input.value || "0");
      const parsedBalance = parseEther(formatEther(balance.value));

      if (inputEth > parsedBalance) {
        button.disabled = true;
        statusMessage.style.color = "red";
        statusMessage.textContent = "You don't have enough ETH for this.";
      } else {
        button.disabled = false;
        statusMessage.textContent = "";
      }
    };

    // Initial check
    updateEstimate();
    validateAmount();

    /**
     * @typedef {Object} EventListenerObjs
     * @property {HTMLElement} element - The target element.
     * @property {string} type - The event type.
     * @property {Function} listener - The function to invoke.
     */

    /** @type {EventListenerObjs[]} */
    const eventListeners = [
      {
        element: input,
        type: "input",
        listener: () => {
          updateEstimate();
          validateAmount();
        },
      },
      {
        element: button,
        type: "click",
        listener: async () => {
          try {
            // Buy NANA
            const value = parseEther(input.value);

            input.value = "";
            input.disabled = true;
            button.textContent = "Processing...";
            button.disabled = true;

            const network = getNetwork();

            if (network.chain.id !== (TESTNET ? 5 : 1))
              await switchNetwork({
                chainId: !TESTNET ? 1 : 5,
              });

            const { hash } = await writeContract(
              !TESTNET
                ? {
                    address: "0xFA391De95Fcbcd3157268B91d8c7af083E607A5C", // Mainnet JBETHPaymentTerminal3_1
                    functionName: "pay",
                    abi: payAbi,
                    chainId: 1,
                    value,
                    args: [
                      BigInt(488),
                      value,
                      "0x000000000000000000000000000000000000EEEe",
                      account.address,
                      0,
                      true,
                      "Paid from https://bananapus.com",
                      0x00,
                    ],
                  }
                : {
                    address: "0x0baCb87Cf7DbDdde2299D92673A938E067a9eb29", // Goerli JBETHPaymentTerminal3_1
                    functionName: "pay",
                    abi: payAbi,
                    chainId: 5,
                    value,
                    args: [
                      BigInt(601),
                      value,
                      "0x000000000000000000000000000000000000EEEe",
                      account.address,
                      BigInt(0),
                      true,
                      "Paid from https://bananapus.com",
                      "0x00",
                    ],
                  }
            );
            console.log(`Payment successful. Hash: ${hash}`);
            statusMessage.style.color = "green";
            statusMessage.textContent = "Payment successful!";
          } catch (e) {
            console.error(`Payment error: ${e}`);
            statusMessage.style.color = "red";
            statusMessage.textContent = "Payment failed. Please try again.";
          } finally {
            input.disabled = false;
            button.disabled = false;
            button.textContent = "Buy NANA";
          }
        },
      },
    ];

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
