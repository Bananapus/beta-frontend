import { Home, About, Error, Stake, Collect } from "./views/index.js";

/**
 * @typedef {Object} View
 * @property {string} render - The HTML string to render for the view.
 * @property {Function} [setup] - The function to invoke after the view is rendered. Optional.
 */

const routes = {
  "/": Home,
  "/about": About,
  "/stake": Stake,
  "/collect": Collect,
};

export function router() {
  const path = window.location.hash.slice(1) || "/";
  /** @type {View} */
  const view = routes[path];

  if (!view) {
    document.getElementById("app").innerHTML = Error();
    return;
  }

  document.getElementById("app").innerHTML = view.render;
  if(view.setup) view.setup()
}

window.addEventListener("hashchange", router);
