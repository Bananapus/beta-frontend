import { Home, About, Error, Stake, Collect } from "./views/index.js";

const routes = {
  "/": Home,
  "/about": About,
  "/stake": Stake,
  "/collect": Collect,
};

export function router() {
  const path = window.location.hash.slice(1) || "/";
  const viewFn = routes[path];

  if (!viewFn) {
    document.getElementById("app").innerHTML = Error();
    return;
  }

  document.getElementById("app").innerHTML = viewFn();
}

window.addEventListener("hashchange", router);
