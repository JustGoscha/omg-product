<script lang="ts">
  // A chip that opens a small menu: emoji, label and hint per option, the current one ticked.
  // The menu is moved to <body> so cards with overflow or masks don't clip it; on a phone it
  // opens as a bottom sheet.
  export interface ChipOption {
    value: string;
    emoji: string;
    label: string;
    hint?: string;
    tone?: "danger";
  }

  let {
    options,
    value,
    onselect,
    prefix = "",
    title = "",
    color = "var(--ink-2)",
    background = "var(--paper-2)",
    disabled = false,
    small = false,
    heading = "",
    iconOnly = false,
    toggles = [],
    ontoggle,
    suffix = "",
  }: {
    options: ChipOption[];
    value: string | null;
    onselect: (value: string) => void;
    prefix?: string;
    title?: string;
    color?: string;
    background?: string;
    disabled?: boolean;
    small?: boolean;
    heading?: string;
    /** just the emoji of the current option (the label stays in the title) */
    iconOnly?: boolean;
    /** on/off switches below the options, independent of the choice (e.g. open source) */
    toggles?: (ChipOption & { on: boolean })[];
    ontoggle?: (value: string) => void;
    /** shown after the current label, e.g. "· Open source" */
    suffix?: string;
  } = $props();

  let open = $state(false);
  let chip = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  let pos = $state({ top: 0, left: 0, up: false, max: 480 });
  let active = $state(0);
  const current = $derived(options.find((o) => o.value === value) ?? null);

  // move the menu to <body>
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  function place() {
    if (!chip) return;
    const r = chip.getBoundingClientRect();
    const width = 280;
    // open towards the side with more room, and use all of it
    const below = innerHeight - r.bottom - 14;
    const above = r.top - 14;
    const up = below < 420 && above > below;
    pos = { top: up ? r.top - 6 : r.bottom + 6, left: Math.min(Math.max(8, r.left), innerWidth - width - 8), up, max: Math.max(160, up ? above : below) };
  }

  function toggle(e: Event) {
    e.stopPropagation();
    if (disabled) return;
    open = !open;
    if (open) {
      place();
      active = Math.max(0, options.findIndex((o) => o.value === value));
      queueMicrotask(() => menu?.querySelectorAll<HTMLButtonElement>("button.opt")[active]?.focus());
    }
  }
  function pick(v: string) {
    open = false;
    chip?.focus();
    if (v !== value) onselect(v);
  }

  $effect(() => {
    if (!open) return;

    const key = (e: KeyboardEvent) => {
      const items = menu?.querySelectorAll<HTMLButtonElement>("button.opt");
      if (!items?.length) return;
      if (e.key === "Escape") {
        open = false;
        chip?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[active].focus();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    const reflow = () => place();
    addEventListener("keydown", key, true);
    addEventListener("resize", reflow);
    addEventListener("scroll", reflow, true);
    return () => {
      removeEventListener("keydown", key, true);
      removeEventListener("resize", reflow);
      removeEventListener("scroll", reflow, true);
    };
  });
</script>

<button
  bind:this={chip}
  type="button"
  class="chip"
  class:small
  class:open
  class:icon={iconOnly}
  style="--c:{color};--bg:{background}"
  title={iconOnly && current ? `${current.label} · ${title}` : title}
  {disabled}
  aria-haspopup="menu"
  aria-expanded={open}
  onclick={toggle}
  onpointerdown={(e) => e.stopPropagation()}
  onkeydown={(e) => e.stopPropagation()}
>
  {#if current}<span class="emo">{current.emoji}</span>{/if}
  {#if !iconOnly}
    {#if prefix}<span class="prefix">{prefix}</span>{/if}
    <span class="val">{current?.label ?? "?"}</span>
    {#if suffix}<span class="suffix">{suffix}</span>{/if}
  {/if}
  <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
</button>

{#if open}
  <!-- closes on click, and swallows it: the tap that closes the menu must not reach the card below -->
  <div
    class="scrim"
    use:portal
    onpointerdown={(e) => (e.preventDefault(), e.stopPropagation())}
    onclick={(e) => (e.preventDefault(), e.stopPropagation(), (open = false))}
    role="presentation"
  ></div>
  <div bind:this={menu} use:portal class="menu" class:up={pos.up} style="top:{pos.top}px;left:{pos.left}px;--max:{pos.max}px" role="menu">
    {#if heading}<div class="heading">{heading}</div>{/if}
    {#each options as o, i (o.value)}
      <button type="button" class="opt" class:on={o.value === value} class:danger={o.tone === "danger"} role="menuitemradio" aria-checked={o.value === value} onclick={() => pick(o.value)} onfocus={() => (active = i)}>
        <span class="oemo">{o.emoji}</span>
        <span class="otext">
          <span class="olabel">{o.label}</span>
          {#if o.hint}<span class="ohint">{o.hint}</span>{/if}
        </span>
        {#if o.value === value}<svg class="tick" viewBox="0 0 12 10" aria-hidden="true"><path d="M1 5l3.5 3.5L11 1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>{/if}
      </button>
    {/each}
    {#if toggles.length}
      <div class="divider"></div>
      {#each toggles as o, i (o.value)}
        <button type="button" class="opt toggle" class:on={o.on} role="menuitemcheckbox" aria-checked={o.on} onclick={() => ontoggle?.(o.value)} onfocus={() => (active = options.length + i)}>
          <span class="oemo">{o.emoji}</span>
          <span class="otext">
            <span class="olabel">{o.label}</span>
            {#if o.hint}<span class="ohint">{o.hint}</span>{/if}
          </span>
          <span class="switch" class:on={o.on} aria-hidden="true"><i></i></span>
        </button>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    height: 1.85rem;
    padding: 0 0.7rem 0 0.55rem;
    border: 0;
    border-radius: 999px;
    background: var(--bg);
    color: var(--c);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: box-shadow 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .chip.icon {
    padding: 0 0.5rem 0 0.55rem;
  }
  .chip.small {
    height: 1.65rem;
    font-size: 0.78rem;
  }
  .chip:hover,
  .chip.open {
    box-shadow: 0 0 0 1.5px var(--c);
  }
  .chip:active {
    transform: scale(0.97);
  }
  .chip:disabled {
    cursor: default;
    box-shadow: none;
  }
  .emo {
    font-size: 0.95em;
    line-height: 1;
  }
  .prefix {
    font-weight: 600;
    opacity: 0.65;
  }
  .caret {
    width: 0.6rem;
    height: 0.4rem;
    opacity: 0.6;
    margin-left: 0.05rem;
  }
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 90;
  }
  .menu {
    position: fixed;
    z-index: 91;
    width: 280px;
    max-height: var(--max, 30rem);
    overflow: auto;
    padding: 0.35rem;
    background: var(--card);
    border-radius: 16px;
    box-shadow: 0 18px 50px -12px rgba(27, 36, 48, 0.35), 0 0 0 1px rgba(27, 36, 48, 0.08);
    animation: pop 0.14s ease-out;
    transform-origin: top left;
  }
  .menu.up {
    transform: translateY(-100%);
    transform-origin: bottom left;
  }
  @keyframes pop {
    from {
      opacity: 0;
      scale: 0.96;
    }
  }
  .heading {
    padding: 0.45rem 0.6rem 0.3rem;
    font-size: 0.72rem;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-3);
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    padding: 0.38rem 0.6rem;
    border: 0;
    border-radius: 10px;
    background: none;
    font: inherit;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .opt:hover,
  .opt:focus-visible {
    background: var(--paper);
    outline: none;
  }
  .opt.on {
    background: var(--paper-2);
  }
  .opt.danger .olabel {
    color: #a12b2b;
  }
  .oemo {
    font-size: 1.15rem;
    width: 1.5rem;
    text-align: center;
    flex-shrink: 0;
  }
  .otext {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .olabel {
    font-weight: 650;
    font-size: 0.9rem;
    line-height: 1.25;
  }
  .ohint {
    font-size: 0.76rem;
    line-height: 1.25;
    color: var(--ink-3);
  }
  .suffix {
    font-weight: 600;
    opacity: 0.8;
  }
  .divider {
    height: 1px;
    margin: 0.35rem 0.5rem;
    background: var(--line);
  }
  .opt.toggle.on {
    background: none;
  }
  .switch {
    position: relative;
    flex-shrink: 0;
    width: 2rem;
    height: 1.15rem;
    border-radius: 999px;
    background: var(--fog);
    transition: background 0.15s;
  }
  .switch i {
    position: absolute;
    top: 0.15rem;
    left: 0.15rem;
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    transition: translate 0.15s;
  }
  .switch.on {
    background: var(--should);
  }
  .switch.on i {
    translate: 0.85rem 0;
  }
  .tick {
    width: 0.8rem;
    height: 0.7rem;
    color: var(--should);
    flex-shrink: 0;
  }
  /* phone: a bottom sheet */
  @media (max-width: 560px) {
    .scrim {
      background: rgba(27, 36, 48, 0.3);
    }
    .menu,
    .menu.up {
      top: auto !important;
      left: 0 !important;
      right: 0;
      bottom: 0;
      width: auto;
      max-height: 75dvh;
      transform: none;
      border-radius: 20px 20px 0 0;
      padding: 0.5rem 0.5rem calc(0.8rem + env(safe-area-inset-bottom));
      animation: sheet 0.2s ease-out;
    }
    .opt {
      padding: 0.75rem 0.7rem;
    }
    @keyframes sheet {
      from {
        transform: translateY(100%);
      }
    }
  }
</style>
