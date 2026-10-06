#!/bin/bash
# Installs what RabAI's checks need, so a new Claude Code cloud session can run
# tools/validate.py, the app's tests and its type check right away.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# tools/validate.py reads the canon YAML files.
if ! python3 -c "import yaml" 2>/dev/null; then
  python3 -m pip install --quiet pyyaml
fi

# The web app (Next.js). npm install reuses the cached container state.
cd web
npm install --no-audit --no-fund --loglevel=error
