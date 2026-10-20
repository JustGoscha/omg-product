<script lang="ts">
  // Speech to text via the browser's speech recognition (Chrome, Edge, Safari).
  import { store } from "../lib/store.svelte";

  let { ontext, lang }: { ontext: (text: string) => void; lang?: string } = $props();
  const Rec = (globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition;
  let rec: any = null;
  let on = $state(false);
  let interim = $state("");

  function toggle() {
    if (on) return rec?.stop();
    rec = new Rec();
    rec.lang = lang ?? (store.ws?.config.locale === "de" ? "de-DE" : "en-US");
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let finalText = "";
      interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalText.trim()) ontext(finalText.trim());
    };
    rec.onend = () => {
      on = false;
      interim = "";
    };
    rec.onerror = () => (on = false);
    rec.start();
    on = true;
  }
</script>

{#if Rec}
  <button type="button" class="btn small" class:rec={on} onclick={toggle} title={store.t.dictate}>
    <span class="dot"></span>{on ? store.t.stopDictate : store.t.dictate}
  </button>
  {#if interim}<span class="interim">{interim}</span>{/if}
{/if}

<style>
  .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--block);
  }
  .rec {
    border-color: var(--block);
    color: var(--block);
  }
  .rec .dot {
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.25;
    }
  }
  .interim {
    font-style: italic;
    color: var(--ink-3);
    font-size: 0.9rem;
  }
</style>
