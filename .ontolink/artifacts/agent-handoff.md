# Agent handoff — 2026-11-17

Start from the project root:

    py .rule/ontolink.py start --root . --skill-root .agents/skills/ontolink-skills
    py .agents/skills/ontolink-skills/scripts/mediator.py context --state knowledge.owl --task <task-id>
    py .agents/skills/ontolink-skills/scripts/mediator.py validate --state knowledge.owl

Use python3 instead of py on Linux/macOS. On this machine the python command is a Windows Store alias; py works (Python 3.14.2).

knowledge.owl is the canonical task/knowledge graph. Query focused context and linked files; do not load the entire history each turn. context.json is a rebuildable view. Source code determines actual behavior. source-manifest.json pins the repository baseline; individual source artifacts detect changes. Read discover.md, design.md, plan.md and verify.md when their scope matters.

Historical tasks history-NNN retain every CHANGELOG bullet with release/category/line. Their DONE status certifies faithful import of a documented implementation claim. It does not mean every historical behavior was retested. Current runtime evidence is npm test, 18 passed. All accessible git commit subjects are retained in proofs/git-history.txt. No external issues, inaccessible chats or unpublished future feature requests were invented.

Follow-up monitor tasks explicitly define native Android evidence, release receipts and duplicate package review. They are open work, not newly approved product features. Add newly requested features in the appropriate lifecycle phase. Changing earlier phase tasks can reopen downstream work; inspect dependencies before writing.

After changes, rerun relevant checks, write a NEW JSON payload in .ontolink/records and use .rule/ontolink.py record with current --expected-revision. Record changed source artifact hashes and invalidate downstream consumers. Never edit knowledge.owl manually, discard locks, or overwrite submitted records/proofs. After each meaningful handoff validate and refresh context. No unattended service runs; agents must follow host instructions.

Local integration delivered only. No commit/push/release was performed. The existing ontolink-skills/ and app/ontolink-skills/ distribution copies remain user-owned; app/**/* packaging can include the latter, so review before a future release. The project-local .agents package is the active coordinator; avoid a second graph in either distribution checkout.
