import {
  getAccount,
  getPublicClient,
  readContract,
  readContracts,
  waitForTransaction,
  writeContract,
} from "@wagmi/core";
import {
  parseAbiItem,
  encodeAbiParameters,
  parseAbiParameters,
  formatUnits,
} from "viem";
import {
  JB721StakingDelegate,
  JB721StakingDistributor,
  BASE64_REGEXP,
  IPFS_BASE_URL,
  JBERC20PaymentTerminal,
  TESTNET_PROJECT_ID,
  TESTNET,
} from "../consts";
import { JBIpfsDecode, formatLargeBigInt, html } from "../utils";

export const Manage = {
  render: html`
<h1>Manage</h1>
<h2>Your NFTs</h2>
<div id="your-nfts"></div>
<p>Select and redeem NFTs to reclaim your funds. This burns your NFTs.</p>
<i><p id="redeem-status-text"></p></i>
<button id="redeem-nfts">Redeem selected NFTs</button>
<h2>Rewards</h2>
<p>
  Bananapus distributes ERC-20 rewards in rounds. The more NFTs you hold, the
  more rewards you can claim each round. You can stake a claim in a future round
  or collect rewards you've already claimed below.
</p>
<ul id="distributor-stats"></ul>
<p>Available tokens:</p>
<ul id="token-options"><p>No tokens found.</p></ul>
<i><p id="reward-status-text"></p></i>
<button id="begin-vesting">Claim future rewards</div>
<button id="collect-rewards">Collect claimed rewards</button>
<div id="collectable-rewards-list"></div>
<button id="prev-round">Previous Round</button>
<button id="next-round">Next Round</button>
`,
  setup: async () => {
    const account = getAccount();
    const app = document.getElementById("app");
    if (!account.isConnected) {
      app.innerHTML = `
        <h1>Manage</h1>
        <em>
          <p style='color: #f08000'>
            You must connect your wallet to manage your NFTs.
          </p>
        </em>`;
      return;
    }

    const publicClient = getPublicClient();

    let heldTokenIds = new Map();
    let tokenIdsWithinTiers = new Map();
    async function updateTokenIdsAndTiers() {
      heldTokenIds = new Map();
      tokenIdsWithinTiers = new Map();

      try {
        const [transfersToAccount, transfersFromAccount] = await Promise.all([
          publicClient.getLogs({
            address: JB721StakingDelegate,
            event: parseAbiItem(
              "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
            ),
            fromBlock: 9507473n, // TODO: Deployment block of JB721StakingDelegate
            args: {
              to: account.address,
            },
          }),
          publicClient.getLogs({
            address: JB721StakingDelegate,
            event: parseAbiItem(
              "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
            ),
            fromBlock: 9507473n, // TODO: Deployment block of JB721StakingDelegate
            args: {
              from: account.address,
            },
          }),
        ]);

        transfersToAccount.forEach((t) => {
          if (heldTokenIds.has(t.args.tokenId)) {
            if (heldTokenIds.get(t.args.tokenId) < t.blockNumber)
              heldTokenIds.set(t.args.tokenId, t.blockNumber);
          } else heldTokenIds.set(t.args.tokenId, t.blockNumber);
        });
        transfersFromAccount.forEach((f) => {
          if (heldTokenIds.has(f.args.tokenId))
            if (heldTokenIds.get(f.args.tokenId) < f.blockNumber)
              heldTokenIds.delete(f.args.tokenId);
        });

        if (heldTokenIds.size === 0) {
          app.innerHTML = `
        <h1>Manage</h1>
        <em>
          <p style='color: #f08000'>
            Could not find NFTs for ${account.address}
          </p>
        </em>`;
          return;
        }

        await Promise.all(
          Array.from(heldTokenIds.keys()).map((id) =>
            readContract({
              address: JB721StakingDelegate,
              abi: [
                parseAbiItem(
                  "function tierIdOfToken(uint256 _tokenId) pure returns (uint256)"
                ),
              ],
              functionName: "tierIdOfToken",
              args: [id],
            }).then((tier) => {
              tokenIdsWithinTiers.set(tier, [
                id,
                ...(tokenIdsWithinTiers.get(tier) ?? []),
              ]);
            })
          )
        );
      } catch (e) {
        console.error(e);
        app.innerHTML = `
          <h1>Manage</h1>
          <em>
            <p style='color: #f08000'>
              Encountered an error while fetching NFTs for ${account.address}. See the console.
            </p>
          </em>`;
        return;
      }
    }

    const [
      erc20TransfersToDistributor,
      tierMultiplier,
      terminalToken,
      claimedEvents,
    ] = await Promise.all([
      publicClient.getLogs({
        event: parseAbiItem(
          "event Transfer(address indexed _from, address indexed _to, uint256 _value)"
        ),
        fromBlock: 9507473n, // TODO: Deployment block of distributor
        args: {
          _to: JB721StakingDistributor,
        },
      }),
      readContract({
        address: JB721StakingDelegate,
        abi: [parseAbiItem("function tierMultiplier() view returns (uint256)")],
        functionName: "tierMultiplier",
      }),
      readContract({
        address: JBERC20PaymentTerminal,
        abi: [parseAbiItem("function token() returns (address)")],
        functionName: "token",
      }),
      publicClient.getLogs({
        address: JB721StakingDistributor,
        event: parseAbiItem(
          "event claimed(uint256 indexed tokenId, address token, uint256 amount, uint256 vestingReleaseRound)"
        ),
        fromBlock: 9507473n, // TODO: Deployment block of JB721StakingDistributor
      }),
      updateTokenIdsAndTiers(),
    ]);

    console.log("Claim events:", claimedEvents);

    // Unique token addresses
    const distributorTokens = [
      ...new Set(erc20TransfersToDistributor.map((t) => t.address)),
    ];

    app.style.maxWidth = "100%";
    const yourNfts = document.getElementById("your-nfts");
    const redeemNfts = document.getElementById("redeem-nfts");
    const redeemStatusText = document.getElementById("redeem-status-text");

    const distributorStats = document.getElementById("distributor-stats");
    const beginVesting = document.getElementById("begin-vesting");
    const collectRewards = document.getElementById("collect-rewards");
    const rewardStatusText = document.getElementById("reward-status-text");
    const tokenOptions = document.getElementById("token-options");
    const collectableRewardsList = document.getElementById(
      "collectable-rewards-list"
    );

    const prevRoundButton = document.getElementById("prev-round");
    const nextRoundButton = document.getElementById("next-round");

    const tierDataMap = new Map();
    await Promise.all(
      Array.from(tokenIdsWithinTiers.keys()).map((tierId) =>
        readContract({
          address: JB721StakingDelegate,
          abi: [
            parseAbiItem(
              "function tierOf(address, uint256 _id, bool _includeResolvedUri) view returns ((uint256 id, uint256 price, uint256 remainingQuantity, uint256 initialQuantity, uint256 votingUnits, uint256 reservedRate, address reservedTokenBeneficiary, bytes32 encodedIPFSUri, uint256 category, bool allowManualMint, bool transfersPausable, string resolvedUri) tier)"
            ),
          ],
          functionName: "tierOf",
          args: [JB721StakingDelegate, tierId, true],
        }).then((tier) => tierDataMap.set(tierId, tier))
      )
    );

    const [terminalTokenSymbol, terminalTokenDecimals] = await readContracts({
      contracts: [
        {
          address: terminalToken,
          abi: [parseAbiItem("function symbol() returns (string)")],
          functionName: "symbol",
        },
        {
          address: terminalToken,
          abi: [
            parseAbiItem("function decimals() public view returns (uint8)"),
          ],
          functionName: "decimals",
        },
      ],
    });

    /**
     * @description Render NFT Tiers and tokens from the tokenIdsWithinTiers mapping
     */
    function renderTiers() {
      yourNfts.innerHTML = "";
      Array.from(tokenIdsWithinTiers.entries()).forEach(
        async ([tierId, tokenIds]) => {
          const tierData = tierDataMap.get(tierId);
          let name, description, image, external_url;
          if (!tierData.resolvedUri) {
            ({ name, description, image, external_url } = await fetch(
              IPFS_BASE_URL + JBIpfsDecode(tierData.encodedIPFSUri)
            )
              .then((res) => res.json())
              .catch((e) =>
                console.error(
                  "Encountered an error while reading NFT data from IPFS.",
                  e
                )
              ));
          } else {
            const resolvedUriMatch = tierData.resolvedUri.match(BASE64_REGEXP);
            if (resolvedUriMatch) {
              let base64UriStr = resolvedUriMatch[3]
                .replace(/-/g, "+")
                .replace(/_/g, "/"); // Convert base64url to standard base64 if needed
              while (base64UriStr.length % 4) base64UriStr += "="; // Add padding if needed
              ({ name, description, image, external_url } = JSON.parse(
                atob(base64UriStr)
              ));
            } else
              console.error(
                "Could not match resolvedUri, using encodedIPFSUri",
                tierId.resolvedUri
              );
          }

          const tierDiv = document.createElement("div");
          tierDiv.className = "tier-div";

          // Add image
          if (image) {
            const mediaDiv = document.createElement("div");
            tierDiv.appendChild(mediaDiv);
            mediaDiv.className = "media-div";

            const imageMatch = image.match(BASE64_REGEXP);
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
              let base64SvgStr = imageMatch[3]
                .replace(/-/g, "+")
                .replace(/_/g, "/"); // Convert base64url to standard base64
              while (base64SvgStr.length % 4) base64SvgStr += "="; // Add padding if needed
              const svgString = atob(base64SvgStr);

              // Parse to avoid security risks of arbitrary HTML injection (SVG only)
              const parser = new DOMParser();
              const svgElement = parser.parseFromString(
                svgString,
                "image/svg+xml"
              ).documentElement;

              svgElement.setAttribute("width", "100%");
              svgElement.setAttribute("height", "100%");
              svgElement.setAttribute("viewBox", "0 0 120 120");

              // Handle nested SVG if necessary
              const nestedSvg = svgElement.querySelector("svg");
              if (nestedSvg) {
                nestedSvg.setAttribute("viewBox", "0 0 120 120");
                nestedSvg.setAttribute("width", "100%");
                nestedSvg.setAttribute("height", "100%");
              }

              mediaDiv.appendChild(svgElement);
            }
          }

          // Initialize textdiv
          const textDiv = document.createElement("div");
          textDiv.style.textAlign = "center";
          textDiv.style.marginLeft = "20px";

          // Add title
          const tierName = document.createElement("p");
          tierName.innerText = `Tier ${tierId.toLocaleString()}${
            name ? ": " + name : ""
          }`;
          tierName.style.fontWeight = "bold";
          tierName.style.margin = "5px 0px";
          textDiv.appendChild(tierName);

          // Add 'select all' checkbox
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.oninput = () =>
            tierDiv
              .querySelectorAll("input[type='checkbox']")
              .forEach((box) => (box.checked = checkbox.checked));
          textDiv.appendChild(checkbox);

          // Add selected indicator
          const selectedSpan = document.createElement("span");
          selectedSpan.innerText = `(0/${tokenIds.length}) selected`;
          tierDiv.oninput = () =>
            (selectedSpan.innerText = `(${
              Array.from(
                tierDiv.querySelectorAll("li input[type='checkbox']").values()
              ).filter((c) => c.checked).length
            }/${tokenIds.length}) selected`);
          textDiv.appendChild(selectedSpan);
          textDiv.onclick = (e) => {
            if (e.target != checkbox) checkbox.click();
          };
          textDiv.style.cursor = "pointer";

          tierDiv.appendChild(textDiv);

          const descriptionParagraph = document.createElement("p");
          descriptionParagraph.innerText = description;
          descriptionParagraph.className = "description";
          descriptionParagraph.style.flexGrow = "1";
          descriptionParagraph.style.marginLeft = "20px";
          tierDiv.appendChild(descriptionParagraph);

          // Add price and voting power
          const statsList = document.createElement("ul");
          statsList.style.marginRight = "10px";
          const priceLi = document.createElement("li");
          priceLi.textContent = `${formatUnits(
            tierData.price,
            Number(terminalTokenDecimals.result)
          )} ${terminalTokenSymbol.result}`;
          statsList.appendChild(priceLi);
          if (tierData.votingUnits) {
            const votesLi = document.createElement("li");
            votesLi.textContent = `${formatLargeBigInt(
              tierData.votingUnits
            )} votes`;
            statsList.appendChild(votesLi);
          }
          tierDiv.appendChild(statsList);

          // Add toggle to show tokens
          const toggleTokenViewButton = document.createElement("button");
          toggleTokenViewButton.innerText = "Show NFTs";
          toggleTokenViewButton.onclick = () => {
            let tokenList = toggleTokenViewButton.nextSibling;
            tokenList.hidden = !tokenList.hidden;
            toggleTokenViewButton.innerText = tokenList.hidden
              ? "Show NFTs"
              : "Hide NFTs";
          };
          tierDiv.appendChild(toggleTokenViewButton);

          // Add token IDs within tier
          const tokensInTier = document.createElement("ul");
          tokensInTier.style.listStyle = "none";
          tokenIds.forEach((tokenId) => {
            const tokenLi = document.createElement("li");

            const tokenCheckbox = document.createElement("input");
            tokenCheckbox.type = "checkbox";
            tokenCheckbox.dataset.tokenId = tokenId;
            tokenLi.appendChild(tokenCheckbox);

            const tokenName = document.createElement("span");
            tokenName.innerText += `Token #${(
              tokenId % tierMultiplier
            ).toLocaleString()}`;
            tokenLi.appendChild(tokenName);

            tokenLi.style.cursor = "pointer";
            tokenLi.onclick = (e) => {
              if (e.target != tokenCheckbox) tokenCheckbox.click();
            };

            tokensInTier.appendChild(tokenLi);
          });
          tokensInTier.hidden = true;
          tierDiv.appendChild(tokensInTier);

          yourNfts.appendChild(tierDiv);
        }
      );
    }

    renderTiers();

    const [
      stakingToken,
      startingBlock,
      roundDuration,
      vestingRounds,
      currentRound,
    ] = await readContracts({
      contracts: [
        {
          address: JB721StakingDelegate,
          abi: [parseAbiItem("function stakingToken() view returns (address)")],
          functionName: "stakingToken",
        },
        {
          address: JB721StakingDistributor,
          abi: [
            parseAbiItem("function startingBlock() view returns (uint256)"),
          ],
          functionName: "startingBlock",
        },
        {
          address: JB721StakingDistributor,
          abi: [
            parseAbiItem("function roundDuration() view returns (uint256)"),
          ],
          functionName: "roundDuration",
        },
        {
          address: JB721StakingDistributor,
          abi: [
            parseAbiItem("function vestingRounds() view returns (uint256)"),
          ],
          functionName: "vestingRounds",
        },
        {
          address: JB721StakingDistributor,
          abi: [parseAbiItem("function currentRound() view returns (uint256)")],
          functionName: "currentRound",
        },
      ],
    });

    function getSelectedTokenIds() {
      return Array.from(
        yourNfts.querySelectorAll("input[type='checkbox']:checked")
      )
        .filter((c) => c.dataset.tokenId)
        .map((c) => BigInt(c.dataset.tokenId));
    }

    redeemNfts.onclick = async () => {
      const selectedTokenIds = getSelectedTokenIds();
      if (selectedTokenIds.length === 0) {
        redeemStatusText.innerText = "No NFTs selected.";
        return;
      }

      redeemNfts.disabled = true;
      redeemNfts.innerText = "Checking redemption weight...";

      try {
        const redemptionWeight = await readContract({
          address: JB721StakingDelegate,
          abi: [
            parseAbiItem(
              "function redemptionWeightOf(address, uint256[] _tokenIds) view returns (uint256 weight)"
            ),
          ],
          functionName: "redemptionWeightOf",
          args: [JB721StakingDelegate, selectedTokenIds],
        });

        const confirmRedeem = window.confirm(
          `Redeem ${selectedTokenIds.length} NFTs for ${formatUnits(
            redemptionWeight,
            Number(terminalTokenDecimals.result)
          )} ${terminalTokenSymbol.result}?`
        );

        if (!confirmRedeem) {
          redeemNfts.innerText = "Redeem selected NFTs";
          redeemNfts.disabled = false;
          redeemStatusText.innerText = "Redemption cancelled.";
          return;
        }
      } catch (e) {
        console.error(e);
        redeemStatusText.innerText =
          "Failed to calculate redemption weight. Try again.";
        redeemNfts.innerText = "Redeem selected NFTs";
        redeemNfts.disabled = false;
        return;
      }

      redeemNfts.innerText = "Redeeming...";
      try {
        const hexString = encodeAbiParameters(
          parseAbiParameters("bytes32, bytes4, uint256[]"),
          [
            "0x" + "00".repeat(32),
            "0xfbb38e03", // type(IJB721Delegate).interfaceId
            selectedTokenIds,
          ]
        );

        const { hash } = await writeContract({
          address: JBERC20PaymentTerminal,
          abi: [
            parseAbiItem(
              "function redeemTokensOf(address _holder, uint256 _projectId, uint256 _tokenCount, address _token, uint256 _minReturnedTokens, address _beneficiary, string _memo, bytes _metadata) returns (uint256 reclaimAmount)"
            ),
          ],
          functionName: "redeemTokensOf",
          args: [
            account.address,
            TESTNET_PROJECT_ID,
            0n,
            "0x0000000000000000000000000000000000000000",
            0n,
            account.address,
            "Redeemed from bananapus.com",
            hexString,
          ],
        });

        redeemNfts.innerText = "Redeeming...";
        await waitForTransaction({ hash });
        redeemStatusText.innerText = "Success.";
      } catch (e) {
        console.error(e);
        redeemStatusText.innerText = "Failed to redeem. See console.";
      } finally {
        redeemNfts.disabled = false;
        redeemNfts.innerText = "Redeem selected NFTs";
        await updateTokenIdsAndTiers();
        renderTiers();
      }
    };

    distributorStats.innerHTML = `
      <li>Blocks per round: ${roundDuration.result.toLocaleString()}</li>
      <li>Current round: ${currentRound.result.toLocaleString()}</li>
      <li>Rounds until you can collect: ${vestingRounds.result.toLocaleString()}</li>
    `;
    const defaultBeginVestingText = `Claim selected tokens for round ${currentRound.result.toLocaleString()}`;
    beginVesting.innerText = defaultBeginVestingText;

    async function renderDistributorTokenCheckbox(tokenAddress) {
      const symbol = await readContract({
        address: tokenAddress,
        abi: [parseAbiItem("function symbol() view returns (string)")],
        functionName: "symbol",
      }).catch((e) => {
        console.error(e);
        return "???";
      });

      const tokenCheckboxListItem = document.createElement("li");

      const tokenCheckbox = document.createElement("input");
      tokenCheckbox.type = "checkbox";
      tokenCheckbox.dataset.tokenAddress = tokenAddress;
      tokenCheckboxListItem.appendChild(tokenCheckbox);

      const tokenLink = document.createElement("a");
      tokenLink.href = `https://${
        TESTNET ? "goerli." : ""
      }etherscan.io/token/${tokenAddress}`;
      tokenLink.innerText = `${tokenAddress.substring(
        0,
        6
      )}…${tokenAddress.substring(tokenAddress.length - 4)}`;

      const tokenLabel = document.createElement("span");
      tokenLabel.innerText = ` ${symbol} `;
      tokenLabel.appendChild(tokenLink);
      tokenCheckboxListItem.appendChild(tokenLabel);

      tokenOptions.appendChild(tokenCheckboxListItem);
    }
    if (distributorTokens.length > 0) {
      tokenOptions.innerHTML = "";
      distributorTokens.forEach((t) => renderDistributorTokenCheckbox(t));
    }

    function getSelectedDistributorTokens() {
      return Array.from(
        tokenOptions.querySelectorAll("input[type='checkbox']:checked")
      )
        .map((c) => c.dataset.tokenAddress)
        .filter((c) => c);
    }

    beginVesting.onclick = async () => {
      // Check if the user has selected ERC-20 tokens held by the distributor
      const selectedDistributorTokens = getSelectedDistributorTokens();
      console.log("Selected distributor tokens:", selectedDistributorTokens);
      if (selectedDistributorTokens.length === 0) {
        rewardStatusText.innerText = "No tokens selected.";
        return;
      }

      // Check which tokens are available to begin vesting
      let availableToBeginVesting = new Set(heldTokenIds.keys());
      const currentRoundStartBlock =
        startingBlock.result + roundDuration.result * currentRound.result;
      claimedEvents.forEach((e) => {
        if (e.blockNumber > currentRoundStartBlock)
          availableToBeginVesting.delete(e.args.tokenId);
      });

      if (availableToBeginVesting.size === 0) {
        rewardStatusText.innerText = "No NFTs to claim with this round.";
        return;
      }

      // Disable claiming button
      beginVesting.innerText = "Claiming...";
      beginVesting.disabled = true;

      try {
        const { hash } = await writeContract({
          address: JB721StakingDistributor,
          abi: [
            parseAbiItem(
              "function beginVesting(uint256[] calldata _tokenIds, address[] calldata _tokens)"
            ),
          ],
          functionName: "beginVesting",
          args: [[...availableToBeginVesting], selectedDistributorTokens],
        });

        await waitForTransaction({ hash });
        rewardStatusText.innerText = "Success";
      } catch (e) {
        console.error(e);
        rewardStatusText.innerText =
          "Failed to begin vesting. Check the console.";
      } finally {
        beginVesting.disabled = false;
        beginVesting.innerText = defaultBeginVestingText;
      }
    };

    /**
     * @type {Map<BigInt, {tokenIds: BigInt[], tokenMap: Map<String, BigInt>}>}
     * @description A map where the keys are vesting release rounds and the values are objects.
     * Each object has a 'tokenIds' property which is an array of NFT token IDs and a 'tokenMap' property which is a map of token addresses to token vesting amounts.
     */
    let collectableRewards;
    /** @description Update the collectableRewards map. Wrap in try-catch. */
    async function updateCollectableRewards() {
      collectableRewards = new Map();
      await Promise.all(
        claimedEvents.map(async (e) => {
          const { tokenId, amount, token, vestingReleaseRound } = e.args;
          if (
            heldTokenIds.has(tokenId) &&
            vestingReleaseRound <= currentRound.result &&
            amount > 0n
          ) {
            const tokenVesting = await readContract({
              address: JB721StakingDistributor,
              abi: [
                parseAbiItem(
                  "function tokenVesting(uint256, uint256, address) view returns (uint256)"
                ),
              ],
              functionName: "tokenVesting",
              args: [tokenId, vestingReleaseRound, token],
            });

            if (tokenVesting > 0n) {
              const x = collectableRewards.get(vestingReleaseRound);
              let tokenMap = x?.tokenMap ? x?.tokenMap : new Map();
              if (tokenMap.has(token))
                tokenMap.set(token, tokenMap.get(token) + tokenVesting);
              else tokenMap.set(token, tokenVesting);
              collectableRewards.set(vestingReleaseRound, {
                tokenIds: [tokenId, ...(x?.tokenIds ?? [])],
                tokenMap,
              });
            }
          }
        })
      );
    }
    await updateCollectableRewards();

    let selectedRewardRound = collectableRewards?.keys()?.next()?.value;
    let collectRewardsTextDefault = `Collect rewards from round ${selectedRewardRound.toLocaleString()}`;
    collectRewards.innerText = collectRewardsTextDefault;
    function displayCollectableRewards() {
      collectableRewardsList.innerHTML = "";

      const header = document.createElement("p");
      header.textContent = `Rewards for round ${selectedRewardRound}`;
      collectableRewardsList.appendChild(header);

      const rewardsObj = collectableRewards.get(selectedRewardRound);

      const rewardsList = document.createElement("ul");
      rewardsObj.tokenMap.forEach((amount, token) => {
        const rewardItem = document.createElement("li");
        rewardItem.textContent = `${token}: ${amount}`;
        rewardsList.appendChild(rewardItem);
      });
      collectableRewardsList.appendChild(rewardsList);
    }
    displayCollectableRewards();

    prevRoundButton.onclick = () => {
      let keys = Array.from(collectableRewards.keys());
      let index = keys.indexOf(selectedRewardRound);
      selectedRewardRound = index > 0 ? keys[index - 1] : keys[0];
      collectRewardsTextDefault = `Collect rewards from round ${selectedRewardRound.toLocaleString()}`;
      displayCollectableRewards();
    };

    nextRoundButton.onclick = () => {
      let keys = Array.from(collectableRewards.keys());
      let index = keys.indexOf(selectedRewardRound);
      selectedRewardRound =
        index < keys.length - 1 ? keys[index + 1] : keys[keys.length - 1];
      collectRewardsTextDefault = `Collect rewards from round ${selectedRewardRound.toLocaleString()}`;
      displayCollectableRewards();
    };

    collectRewards.onclick = async () => {
      collectRewards.disabled = true;
      collectRewards.innerText = "Finding available rewards...";

      try {
        await updateCollectableRewards();
        displayCollectableRewards();
      } catch (e) {
        console.error(e);
        rewardStatusText.innerText =
          "Error while checking available rewards. See the console.";
        collectRewards.innerText = collectRewardsTextDefault;
        collectRewards.disabled = false;
        return;
      }

      if (!collectableRewards || collectableRewards.size === 0) {
        rewardStatusText.innerText = "No rewards available.";
        collectRewards.innerText = collectRewardsTextDefault;
        collectRewards.disabled = false;
        return;
      }

      console.log(collectableRewards);
      rewardStatusText.innerText = `Claiming rewards for round ${selectedRewardRound.toLocaleString()}`;

      try {
        await writeContract({
          address: JB721StakingDistributor,
          functionName: "collectVestedRewards",
          abi: [
            parseAbiItem(
              "function collectVestedRewards(uint256[] _tokenIds, address[] _tokens, uint256 _round)"
            ),
          ],
          args: [
            collectableRewards.get(selectedRewardRound).tokenIds,
            [...collectableRewards.get(selectedRewardRound).tokenMap.keys()],
            selectedRewardRound,
          ],
        });
        rewardStatusText.innerText = "Success.";
      } catch (e) {
        console.error(e);
        redeemStatusText.innerText = "Failed to claim rewards. See console.";
      } finally {
        collectRewards.innerText = collectRewardsTextDefault;
        collectRewards.disabled = false;
      }
    };
  },
};
