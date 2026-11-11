#!/usr/bin/env python3
"""Review uncommitted changes against .claude/plan.md.

Prints: files in / out of plan scope, formatting-only edits, changed functions, where those
functions are used elsewhere (impact on existing code), test files touched, and the test
command from CLAUDE.md.

Usage:  python review_changes.py [repo_root] [--base <git-ref>]
"""
import fnmatch
import os
import re
import subprocess
import sys

PLAN = os.path.join(".claude", "plan.md")
IGNORED = ("CLAUDE.md", ".claude/")
TEST_RX = re.compile(r"(^|/)(tests?|__tests__|spec)/|(_test|\.test|\.spec|test_)[^/]*$")


def git(root, *args):
    r = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, timeout=30)
    return r.stdout if r.returncode == 0 else ""


def read_scope(root):
    """Paths in backticks under '## Target (scope)' in plan.md. Returns (status, patterns)."""
    p = os.path.join(root, PLAN)
    if not os.path.exists(p):
        return None, []
    text = open(p, encoding="utf-8").read()
    status = (re.search(r"(?mi)^Status:\s*(\w+)", text) or [None, "draft"])[1].lower()
    m = re.search(r"(?s)## Target \(scope\)\n(.*?)(?=\n## |\Z)", text)
    pats = []
    if m:
        for tok in re.findall(r"`([^`]+)`", m.group(1)):
            tok = tok.strip()
            if tok.endswith(")") or " " in tok:
                continue  # function names like place_order()
            if "/" in tok or "." in tok or "*" in tok:
                pats.append(tok)
    return status, pats


def in_scope(path, pats):
    for p in pats:
        if p.endswith("/") and path.startswith(p):
            return True
        if fnmatch.fnmatch(path, p) or path == p:
            return True
    return False


def changed_files(root, base):
    files = set()
    diff_args = ["diff", "--name-only"] + ([base] if base else ["HEAD"])
    files.update(git(root, *diff_args).splitlines())
    files.update(git(root, "ls-files", "--others", "--exclude-standard").splitlines())
    return sorted(f for f in files if f and not f.startswith(IGNORED))


def formatting_only(root, base, path):
    ref = base or "HEAD"
    full = git(root, "diff", "--numstat", ref, "--", path).strip()
    ws = git(root, "diff", "-w", "--ignore-blank-lines", "--numstat", ref, "--", path).strip()
    return bool(full) and not ws


def changed_functions(root, base, path):
    """Function names from git's hunk headers plus defs added/removed inside the hunks."""
    out = git(root, "diff", "-U0", base or "HEAD", "--", path)
    names = set()
    for line in out.splitlines():
        h = re.match(r"^@@[^@]*@@\s*(.*)$", line)
        ctx = h.group(1) if h else (line[1:] if line[:1] in "+-" and not line.startswith(("+++", "---")) else "")
        m = re.search(r"(?:def|function|class|func)\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(", ctx)
        if m:
            names.add(m.group(1) or m.group(2))
    return sorted(n for n in names if n and not n.startswith("_") and len(n) > 2)


def callers(root, name, own_file):
    out = git(root, "grep", "-n", "-w", "-I", name, "--", ".", ":!*.md", ":!.claude/*")
    hits = []
    for line in out.splitlines():
        f, _, rest = line.partition(":")
        if f == own_file or re.search(rf"(def|function|class|func)\s+{name}\b", rest):
            continue
        hits.append(f"{f}:{rest.split(':', 1)[0]}")
    return hits


def test_command(root):
    p = os.path.join(root, "CLAUDE.md")
    if not os.path.exists(p):
        return None
    m = re.search(r"(?mi)^- Test:\s*`([^`]+)`", open(p, encoding="utf-8").read())
    return m.group(1) if m and "TODO" not in m.group(1) else None


def main():
    args = sys.argv[1:]
    base = None
    if "--base" in args:
        i = args.index("--base")
        base = args[i + 1]
        del args[i:i + 2]
    root = os.path.abspath(args[0] if args else ".")

    files = changed_files(root, base)
    if not files:
        print("No code changes to review.")
        return
    status, pats = read_scope(root)

    print("=== 1. Scope ===")
    if not pats:
        print("No plan scope found (.claude/plan.md → '## Target (scope)'). Every change is unchecked.")
        out = []
    else:
        out = [f for f in files if not in_scope(f, pats)]
        print(f"Plan status: {status} · scope: {', '.join(pats)}")
        print(f"In scope ({len(files) - len(out)}): " + (", ".join(f for f in files if f not in out) or "-"))
        if out:
            print(f"OUT OF SCOPE ({len(out)}): {', '.join(out)}  ← revert, or ask the user and add to plan")

    print("\n=== 2. Unnecessary edits ===")
    fmt = [f for f in files if os.path.exists(os.path.join(root, f)) and formatting_only(root, base, f)]
    print("Formatting/whitespace-only changes (revert these): " + (", ".join(fmt) if fmt else "none"))
    stat = git(root, "diff", "--stat", base or "HEAD").strip().splitlines()
    if stat:
        print("Diff size: " + stat[-1].strip())

    print("\n=== 3. Changed functions and where they are used (check each still fits) ===")
    any_fn = False
    for f in files:
        for fn in changed_functions(root, base, f):
            any_fn = True
            uses = callers(root, fn, f)
            shown = ", ".join(uses[:6]) + (f", +{len(uses) - 6} more" if len(uses) > 6 else "")
            print(f"- {f} → {fn}(): " + (f"used in {shown}" if uses else "no other usages"))
    if not any_fn:
        print("No function-level changes detected.")

    print("\n=== 4. Tests ===")
    tests = [f for f in files if TEST_RX.search(f)]
    print("Test files changed/added: " + (", ".join(tests) if tests else "NONE — add or update a test for the target, or say why not"))
    cmd = test_command(root)
    print(f"Run the full suite: {cmd}" if cmd else "No test command in CLAUDE.md (- Test: `...`). Find it and add it.")


if __name__ == "__main__":
    main()
