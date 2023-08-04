import "/style.css";
import { updateInterface } from "./wallet.js";
import { router } from "./router.js";

window.addEventListener("DOMContentLoaded", () => {
  router();
  updateInterface();
});
