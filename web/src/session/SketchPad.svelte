<script lang="ts">
  // A small drawing surface for "this is what I mean". Exports a PNG data URL.
  let { onsave, oncancel, background }: { onsave: (dataUrl: string) => void; oncancel: () => void; background?: string } = $props();

  let canvas = $state<HTMLCanvasElement>();
  let color = $state("#1b2430");
  let width = $state(3);
  let drawing = false;
  let last: { x: number; y: number } | null = null;
  const history: ImageData[] = [];
  const colors = ["#1b2430", "#d14343", "#2f8a5b", "#3a7bc8", "#c98a00"];

  $effect(() => {
    const c = canvas!;
    const ratio = devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#e6eaec";
    ctx.lineWidth = 1;
    for (let x = 24; x < rect.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 24; y < rect.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
    if (background) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = background;
    }
  });

  const pos = (e: PointerEvent) => {
    const r = canvas!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function down(e: PointerEvent) {
    const ctx = canvas!.getContext("2d")!;
    history.push(ctx.getImageData(0, 0, canvas!.width, canvas!.height));
    drawing = true;
    last = pos(e);
    canvas!.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drawing || !last) return;
    const ctx = canvas!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * (e.pressure && e.pointerType === "pen" ? e.pressure * 2 : 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  }
  const up = () => ((drawing = false), (last = null));
  function undo() {
    const prev = history.pop();
    if (prev) canvas!.getContext("2d")!.putImageData(prev, 0, 0);
  }
</script>

<div class="pad">
  <div class="tools">
    {#each colors as c}
      <button type="button" class="swatch" class:on={color === c} style="background:{c}" aria-label="color {c}" onclick={() => (color = c)}></button>
    {/each}
    <span class="sep"></span>
    {#each [2, 4, 10] as w}
      <button type="button" class="size" class:on={width === w} aria-label="pen {w}" onclick={() => (width = w)}><span style="width:{w + 2}px;height:{w + 2}px"></span></button>
    {/each}
    <button type="button" class="size" class:on={color === "#ffffff"} aria-label="eraser" onclick={() => ((color = "#ffffff"), (width = 18))}>⌫</button>
    <span class="grow"></span>
    <button type="button" class="btn small ghost" onclick={undo}>↶</button>
    <button type="button" class="btn small" onclick={oncancel}>×</button>
    <button type="button" class="btn small primary" onclick={() => onsave(canvas!.toDataURL("image/png"))}>OK</button>
  </div>
  <canvas bind:this={canvas} onpointerdown={down} onpointermove={move} onpointerup={up} onpointerleave={up}></canvas>
</div>

<style>
  .pad {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 0.5rem;
    height: 100%;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .swatch {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 0 0 1.5px var(--line);
  }
  .swatch.on {
    box-shadow: 0 0 0 2.5px var(--ink);
  }
  .size {
    width: 2rem;
    height: 2rem;
    border-radius: 8px;
    border: 1.5px solid var(--line);
    background: var(--card);
    display: grid;
    place-items: center;
  }
  .size span {
    display: block;
    border-radius: 50%;
    background: var(--ink);
  }
  .size.on {
    border-color: var(--ink);
  }
  .sep {
    width: 1px;
    height: 1.4rem;
    background: var(--line);
  }
  .grow {
    flex: 1;
  }
  canvas {
    width: 100%;
    height: 100%;
    min-height: 320px;
    border-radius: var(--r-card);
    border: 1.5px solid var(--line);
    touch-action: none;
    cursor: crosshair;
    background: #fff;
  }
</style>
