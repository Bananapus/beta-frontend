import { getAccount } from "@wagmi/core";

export const Manage = {
  render: `
<h1>Manage</h1>
<h2>Your NFTs</h2>
<div id="your-nfts"></div>
<h2>Begin Vesting</h2>
<div id="begin-vesting"></div>
<h2>Collect Rewards</h2>
<div id="collect-rewards"></div>
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
  },
};
