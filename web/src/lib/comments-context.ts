import { getContext, setContext } from "svelte";
import type { Comments } from "./comments.svelte";

// The project's comment threads for components deep in the tree (prototype frames,
// diagrams), so any comment can be saved as a thread and handed to the agent.
const KEY = Symbol("omgp:comments");
export const provideComments = (c: () => Comments) => setContext(KEY, c);
export const useComments = () => getContext<(() => Comments) | undefined>(KEY);
