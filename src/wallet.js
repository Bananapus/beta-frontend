import {
  configureChains,
  Connector,
  createConfig,
  InjectedConnector,
  mainnet,
  connect,
  disconnect,
} from "@wagmi/core";
import { goerli } from "@wagmi/core/chains";
import { publicProvider } from "@wagmi/core/providers/public";
import { infuraProvider } from "@wagmi/core/providers/infura";
import { WalletConnectConnector } from "@wagmi/connectors/walletConnect";
import { SafeConnector } from "@wagmi/connectors/safe";
import { LedgerConnector } from "@wagmi/connectors/ledger";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
let initialized = false;

/** @type {Connector[]} */
const connectors = [];

if (!initialized) initWalletClient(connectors);

/** @param {Connector[]} connectors */
function initWalletClient(connectors) {
  const { chains, publicClient, webSocketPublicClient } = configureChains(
    [mainnet, goerli],
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
  connectors.push(
    new WalletConnectConnector({
      chains,
      options: { projectId },
    })
  );

  createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient,
  });

  initialized = true;
  connectors.forEach((c) => console.log(c.name, c));
}

async function connectMetaMask(chainId) {
  await connect({
    chainId,
    connector: connectors.find((c) => c.name === "MetaMask"),
  });
}

async function connectWalletConnect(chainId) {
  await connect({
    chainId,
    connector: connectors.find((c) => c.name === "WalletConnect"),
  });
}

async function connectSafe(chainId) {
  await connect({
    chainId,
    connector: connectors.find((c) => c.name === "Safe"),
  });
}

async function connectLedger(chainId) {
  await connect({
    chainId,
    connector: connectors.find((c) => c.name === "Ledger"),
  });
}

/**
 * @param {number} chainId
 * @param {"MetaMask" | "WalletConnect" | "Safe" | "Ledger"} walletType
 */
async function connectWallet(chainId, walletType) {
  await connect({
    chainId,
    connector: connectors.find((c) => c.name === walletType),
  });
}

export const wallet = {
  connectMetaMask,
  connectWalletConnect,
  connectLedger,
  connectSafe,
  disconnect,
};
