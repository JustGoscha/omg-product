import { getContext, setContext } from "svelte";
import type { Comments } from "../lib/comments.svelte";
import type { AnchoredThread, CommentTargetT } from "../lib/types";

// Comment and edit tools for the session runner, shared through context so every
// step view can offer them without threading props through each one.

export interface Review {
  comments: Comments;
  /** the session file, relative to the project (target.file of comments) */
  file: string;
  /** write one field of a step into the session YAML */
  edit: (step: string, path: (string | number)[], value: unknown, expect?: unknown) => Promise<unknown>;
  /** open the comments panel for a step, optionally starting a new comment */
  discuss: (step: string, draft?: { target: CommentTargetT; quote?: string } | null, active?: string | null) => void;
  /** open threads on a step (any part of it) */
  threadsOf: (step: string, option?: string) => AnchoredThread[];
}

const KEY = Symbol("omgp:review");
export const provideReview = (r: Review) => setContext(KEY, r);
export const useReview = () => getContext<Review | undefined>(KEY);
