import { router } from "./router.js";
import { updateWalletStatus } from "./wallet.js";

window.addEventListener("DOMContentLoaded", () => {
  router();
  updateWalletStatus();
});
