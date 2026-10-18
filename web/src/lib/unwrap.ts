/** Join hard-wrapped lines (as agents write them) so they don't become forced line breaks. */
export function unwrap(md: string) {
  const out: string[] = [];
  let fence = false;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) {
      fence = !fence;
      out.push(line);
      continue;
    }
    const prev = out.at(-1);
    const starts = line.trim() === "" || /^\s*([-*+]\s|\d+[.)]\s|#{1,6}\s|>|\|)/.test(line);
    const prevJoinable = prev !== undefined && prev.trim() !== "" && !/^\s*(#{1,6}\s|\||```)/.test(prev);
    if (!fence && !starts && prevJoinable) out[out.length - 1] = `${prev.replace(/\s+$/, "")} ${line.trim()}`;
    else out.push(line);
  }
  return out.join("\n");
}
