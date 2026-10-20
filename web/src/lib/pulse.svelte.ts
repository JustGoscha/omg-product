import { api } from "./api";
import { store } from "./store.svelte";
import { inPulse, localDate, rank, type PulseDay, type Ranked } from "../../../src/core/pulse";

// The Pulse ranking for the views outside the Pulse (roadmap, project page): loaded once,
// reloaded when someone duels.
class PulseRanking {
  days = $state<PulseDay[] | null>(null);
  private started = false;

  ranked = $derived.by((): Ranked[] => {
    const ws = store.ws;
    if (!ws || !this.days) return [];
    const ids = ws.projects.filter((p) => inPulse(p, ws.config.profile?.doneMeans)).map((p) => p.id);
    return rank(this.days, ids, { today: localDate(), k: ws.config.pulse?.k });
  });
  /** rank (1 = most important) of projects that were in at least one duel */
  positions = $derived(new Map(this.ranked.filter((r) => r.wins + r.losses > 0).map((r, i) => [r.id, { ...r, pos: i + 1 }])));

  start() {
    if (this.started) return;
    this.started = true;
    const load = () => api.pulse().then((d) => (this.days = d.days)).catch(() => (this.days = []));
    load();
    store.on((e) => {
      if (e.type === "change" && e.paths?.some((p) => p.startsWith("pulse/"))) load();
    });
  }
}

export const pulse = new PulseRanking();
