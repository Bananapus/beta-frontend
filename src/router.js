import { Home, About, Error, Stake, Manage } from "./views/index.js";

/**
 * @typedef {Object} View
 * @property {string} render - The HTML string to render for the view.
 * @property {Function} [setup] - The function to invoke after the view is rendered. Optional.
 */

const app = document.getElementById("app")
const routes = {
  "/": Home,
  "/about": About,
  "/stake": Stake,
  "/manage": Manage,
};

let cleanup = null;

export async function router() {
  const path = window.location.hash.slice(1) || "/";
  /** @type {View} */
  const view = routes[path];

  if (!view) {
    app.innerHTML = Error.render;
    return;
  }

  if (cleanup && typeof cleanup === "function") {
    cleanup();
    cleanup = null;
  }

  app.style.maxWidth = "800px";
  app.innerHTML = view.render;
  if (view.setup) cleanup = await view.setup();
}

window.addEventListener("hashchange", router);
