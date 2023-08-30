import {
  configureChains,
  Connector,
  createConfig,
  InjectedConnector,
  mainnet,
  connect,
  disconnect,
  getAccount,
} from "@wagmi/core";
import { goerli } from "@wagmi/core/chains";
import { publicProvider } from "@wagmi/core/providers/public";
import { infuraProvider } from "@wagmi/core/providers/infura";
// import { WalletConnectConnector } from "@wagmi/connectors/walletConnect";
import { SafeConnector } from "@wagmi/connectors/safe";
// import { LedgerConnector } from "@wagmi/connectors/ledger";
import { TESTNET } from "./consts";

// const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
let initialized = false;

/** @type {Connector[]} */
const connectors = [];

if (!initialized) initWalletClient(connectors);

/** @param {Connector[]} connectors */
function initWalletClient(connectors) {
  const { chains, publicClient, webSocketPublicClient } = configureChains(
    [TESTNET ? goerli : mainnet],
    [
      infuraProvider({
        apiKey: import.meta.env.VITE_INFURA_API_KEY,
      }),
      publicProvider(),
    ]
  );

  connectors.push(new InjectedConnector({ chains }));
  connectors.push(new SafeConnector({ chains }));
  // connectors.push(new LedgerConnector({ chains, projectId }));
  /*connectors.push(
    new WalletConnectConnector({
      chains,
      options: { projectId },
    })
  );*/

  createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient,
  });

  initialized = true;
}

const connectButton = document.getElementById("open-connect-modal");
const walletAddressSpan = document.getElementById("wallet-address");
const connectModal = document.getElementById("connect-modal");
const closeModalButton = document.getElementById("close-modal");
closeModalButton.addEventListener("click", () => connectModal.close());

export function updateWalletStatus() {
  const account = getAccount();

  if (account && account.isConnected) {
    connectButton.textContent = "Disconnect";
    connectButton.onclick = disconnectWallet;
    walletAddressSpan.textContent = account.address.substring(0, 6) + "…";
  } else {
    connectButton.textContent = "Connect";
    connectButton.onclick = () => connectModal.showModal();
    walletAddressSpan.textContent = "";
  }
}

async function disconnectWallet() {
  await disconnect();
  updateWalletStatus();
}

/**
 * Connects a wallet
 *
 * @typedef {"MetaMask" | "WalletConnect" | "Safe" | "Ledger"} ConnectorName
 *
 * @param {number} chainId The chain ID
 * @param {ConnectorName} connectorName The wallet's type (the connector's name)
 *
 * @returns {Promise<void>} Promise representing the connection process
 */
async function connectWallet(chainId, connectorName) {
  try {
    connectModal.close();
    await connect({
      chainId,
      connector: connectors.find((c) => c.name === connectorName),
    });
    updateWalletStatus();
  } catch (error) {
    if (error.name === "ConnectorAlreadyConnectedError") updateWalletStatus();
    else {
      throw error;
    }
  }
}

connectors
  .map((c) => c.name)
  .forEach((wallet) =>
    document
      .getElementById(`connect-${wallet.toLowerCase()}`)
      .addEventListener("click", () => connectWallet(5, wallet))
  );
