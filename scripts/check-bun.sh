#!/bin/sh
# omgp runs on Bun. Tell the person once per session if it is missing; the session goes on.
command -v bun >/dev/null 2>&1 && exit 0
echo "omgp needs Bun to run its CLI and studio. Install it with: curl -fsSL https://bun.sh/install | bash" >&2
exit 2
