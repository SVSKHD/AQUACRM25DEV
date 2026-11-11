#!/usr/bin/env python3
"""Claude Code Stop hook: block the stop if code changed but .claude/changes.md wasn't updated.

Also usable manually:  python .claude/hooks/check_memory.py --compact
"""
import json
import os
import re
import subprocess
import sys

LOG = os.path.join(".claude", "changes.md")
ARCHIVE = os.path.join(".claude", "changes-archive.md")
MAX_ENTRIES = 25
IGNORED_PREFIXES = ("CLAUDE.md", ".claude/")
MARKER = "<!-- entries -->"
MAP = os.path.join(".claude", "map.md")
MAPPABLE_EXT = {".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue", ".go", ".rs",
                ".java", ".kt", ".rb", ".php", ".cs", ".swift", ".dart", ".sql", ".sh", ".mq5", ".mqh"}
SKIP_PARTS = {"node_modules", "dist", "build", "venv", ".venv", "__pycache__", "vendor", "target",
              "coverage", "logs", "data"}


def is_mappable(path):
    parts = path.split("/")
    return (os.path.splitext(path)[1].lower() in MAPPABLE_EXT
            and not any(p in SKIP_PARTS for p in parts[:-1]))


def project_dir():
    return os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()


def changed_files(root):
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=root, capture_output=True, text=True, timeout=10,
        )
    except Exception:
        return None
    if out.returncode != 0:
        return None  # not a git repo
    files = []
    for line in out.stdout.splitlines():
        path = line[3:].strip().strip('"')
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        files.append(path.replace("\\", "/"))
    return files


def compact(root):
    log_path = os.path.join(root, LOG)
    if not os.path.exists(log_path):
        return 0
    text = open(log_path, encoding="utf-8").read()
    if MARKER not in text:
        return 0
    head, body = text.split(MARKER, 1)
    entries = [e for e in re.split(r"(?m)^(?=### )", body) if e.strip()]
    if len(entries) <= MAX_ENTRIES:
        return 0
    keep, old = entries[:MAX_ENTRIES], entries[MAX_ENTRIES:]
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(head + MARKER + "\n\n" + "".join(e.strip() + "\n\n" for e in keep))
    arch_path = os.path.join(root, ARCHIVE)
    existing = open(arch_path, encoding="utf-8").read() if os.path.exists(arch_path) else "# Change log archive (newest first)\n\n"
    title, _, rest = existing.partition("\n\n")
    with open(arch_path, "w", encoding="utf-8") as f:
        f.write(title + "\n\n" + "".join(e.strip() + "\n\n" for e in old) + rest)
    return len(old)


def scope_check(root, code):
    """If an approved plan exists, flag changed files outside its scope."""
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from review_changes import read_scope, in_scope
    except Exception:
        return None
    status, pats = read_scope(root)
    if status != "approved" or not pats:
        return None
    out = [f for f in code if not in_scope(f, pats)]
    if not out:
        return None
    return (f"Files changed outside the approved plan scope: {', '.join(out[:6])}. "
            f"Revert them, or ask the user and add them to '## Target (scope)' in .claude/plan.md. "
            f"Then run `python .claude/hooks/review_changes.py` and report its findings.")


def main():
    root = project_dir()
    if "--compact" in sys.argv:
        moved = compact(root)
        print(f"Moved {moved} old entries to {ARCHIVE}" if moved else "Nothing to compact.")
        return 0

    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}
    if payload.get("stop_hook_active"):
        return 0  # already asked once this turn; never loop

    files = changed_files(root)
    if not files:
        return 0
    code = [f for f in files if not f.startswith(IGNORED_PREFIXES)]
    code = [f for f in code if os.path.isfile(os.path.join(root, f))]
    if not code:
        return 0

    reasons = []
    log_path = os.path.join(root, LOG)
    newest_code = max(os.path.getmtime(os.path.join(root, f)) for f in code)
    log_mtime = os.path.getmtime(log_path) if os.path.exists(log_path) else 0
    if log_mtime < newest_code:
        shown = ", ".join(code[:8]) + (" ..." if len(code) > 8 else "")
        reasons.append(
            f"Change log not updated (files changed: {shown}). Prepend a 3-5 line entry "
            f"(### date — title / What / Files / Why / Watch) under '{MARKER}' in {LOG}."
        )

    map_path = os.path.join(root, MAP)
    if os.path.exists(map_path):
        map_text = open(map_path, encoding="utf-8").read()
        unmapped = [f for f in code if is_mappable(f) and f"`{f}`" not in map_text
                    and f"`{os.path.dirname(f)}/`" not in map_text]
        if unmapped:
            reasons.append(
                f"New files missing from the component map: {', '.join(unmapped[:6])}. "
                f"Run `python .claude/hooks/build_map.py`, then replace their TODO descriptions "
                f"in {MAP} (one short line each)."
            )

    scope_note = scope_check(root, code)
    if scope_note:
        reasons.append(scope_note)

    if not reasons:
        compact(root)
        return 0
    print(json.dumps({
        "decision": "block",
        "reason": "Before you finish: " + " ".join(reasons)
                  + " Update CLAUDE.md only if structure, commands or conventions changed.",
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
