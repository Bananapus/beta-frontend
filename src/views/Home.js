import { parseEther, formatEther } from "viem";
import {
  fetchBalance,
  getAccount,
  getNetwork,
  writeContract,
  switchNetwork,
} from "@wagmi/core";
import {
  BANANAPUS_PROJECT_ID,
  TESTNET,
  payAbi,
  JBDirectory,
  MAX_RESERVED_RATE,
} from "../consts";
import { html } from "../utils";
import { readContract } from "@wagmi/core";
import { parseAbiItem } from "viem";

export const Home = {
  render: html`
    <h1>Bananapus</h1>
    <p>
      <span class="bananapus">bananapus</span> is building tools to align
      Juicebox communities on Ethereum and L2s.
    </p>
    <ol>
      <li>
        Anyone can buy $NANA below or on
        <a
          href="https://${TESTNET
            ? "goerli."
            : ""}juicebox.money/v2/p/${BANANAPUS_PROJECT_ID.toLocaleString()}"
          >Juicebox</a
        >.
      </li>
      <li>
        To stake your $NANA and earn a share of the network's growth, visit
        <a href="#/stake">Stake</a>.
      </li>
      <li>
        To manage your staked positions and collect rewards, visit
        <a href="#/manage">Manage</a>.
      </li>
    </ol>
    <div id="purchase-section">
      <input id="eth-input" type="number" placeholder="ETH Amount" />
      <button id="buy-button" disabled>Buy NANA</button>
    </div>
    <span id="status-message" style="color: red;"></span>
    <p>
      To learn more, read <a href="#/about">About</a>. To get involved, join our
      <a href="https://discord.gg/ErQYmth4dS">Discord server</a>. This website
      is experimental. Double check transactions before executing them.
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
    // const exchangeRate = 700000;

    let exchangeRate, balance;
    try {
      [exchangeRate, balance] = await Promise.all([
        readContract({
          address: JBDirectory,
          abi: [
            parseAbiItem(
              "function controllerOf(uint256) view returns (address)"
            ),
          ],
          functionName: "controllerOf",
          args: [BigInt(BANANAPUS_PROJECT_ID)],
        })
          .then((BananapusJBController) => {
            console.log(BananapusJBController);
            return readContract({
              address: BananapusJBController,
              abi: [
                parseAbiItem(
                  "function currentFundingCycleOf(uint256 _projectId) view returns ((uint256 number, uint256 configuration, uint256 basedOn, uint256 start, uint256 duration, uint256 weight, uint256 discountRate, address ballot, uint256 metadata) fundingCycle, ((bool allowSetTerminals, bool allowSetController, bool pauseTransfers) global, uint256 reservedRate, uint256 redemptionRate, uint256 ballotRedemptionRate, bool pausePay, bool pauseDistributions, bool pauseRedeem, bool pauseBurn, bool allowMinting, bool allowTerminalMigration, bool allowControllerMigration, bool holdFees, bool preferClaimedTokenOverride, bool useTotalOverflowForRedemptions, bool useDataSourceForPay, bool useDataSourceForRedeem, address dataSource, uint256 metadata) metadata)"
                ),
              ],
              functionName: "currentFundingCycleOf",
              args: [BigInt(BANANAPUS_PROJECT_ID)],
            });
          })
          .then((f) => {
            console.log("Funding cycle:", f);
            const payerIssuanceRate = Number(
              (f[0].weight / BigInt(1e18)) *
                ((MAX_RESERVED_RATE - f[1].reservedRate) / MAX_RESERVED_RATE)
            );
            return payerIssuanceRate;
          }),
        fetchBalance({
          address: account.address,
        }),
      ]);
    } catch (e) {
      console.error(e);
      statusMessage.textContent = `Encountered an issue while reading from contracts. See console.`;
      return;
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
