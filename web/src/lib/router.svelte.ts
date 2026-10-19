// Hash routes:
//   #/                         roadmap
//   #/p/<id>                   project
//   #/p/<id>/s/<session>       session runner (?step=<id>)
//   #/p/<id>/s/<session>/summary
//   #/p/<id>/proto/<file>      prototype viewer
//   #/join/<id>/<session>      vote from a phone
//   #/pulse                    today's swipe deck
//   #/pulse/results            what everyone swiped, ranked

export type Route =
  | { name: "roadmap" }
  | { name: "project"; project: string }
  | { name: "session"; project: string; session: string; step?: string }
  | { name: "summary"; project: string; session: string }
  | { name: "proto"; project: string; file: string }
  | { name: "join"; project: string; session: string }
  | { name: "pulse"; results: boolean }
  | { name: "notfound" };

function parse(hash: string): Route {
  const [path, query] = hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(query ?? "");
  if (!parts.length) return { name: "roadmap" };
  if (parts[0] === "pulse") return { name: "pulse", results: parts[1] === "results" };
  if (parts[0] === "p" && parts[1]) {
    if (parts.length === 2) return { name: "project", project: parts[1] };
    if (parts[2] === "s" && parts[3]) {
      if (parts[4] === "summary") return { name: "summary", project: parts[1], session: parts[3] };
      return { name: "session", project: parts[1], session: parts[3], step: q.get("step") ?? undefined };
    }
    if (parts[2] === "proto" && parts[3]) return { name: "proto", project: parts[1], file: parts.slice(3).join("/") };
  }
  if (parts[0] === "join" && parts[1] && parts[2]) return { name: "join", project: parts[1], session: parts[2] };
  return { name: "notfound" };
}

class Router {
  route = $state<Route>(parse(location.hash));
  constructor() {
    addEventListener("hashchange", () => (this.route = parse(location.hash)));
  }
  go(path: string) {
    location.hash = path;
  }
  /** Change the hash without adding history (e.g. current step). */
  replace(path: string) {
    history.replaceState(null, "", `#${path}`);
    this.route = parse(location.hash);
  }
}

export const router = new Router();
export const href = (path: string) => `#${path}`;
