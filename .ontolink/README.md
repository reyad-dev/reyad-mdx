# Continue on another computer

The complete project-local OntoLink package, canonical `knowledge.owl`, submitted
records, proof files, artifacts and agent instructions are versioned together.
Do not rerun the one-time import scripts or replace the graph with an example.

Clone `https://github.com/reyad-dev/reyad-mdx.git`, or run `git pull --ff-only`
in an existing clean checkout. Install Python 3.10+ for OntoLink. From the root:

```powershell
py .rule/ontolink.py start --root . --skill-root .agents/skills/ontolink-skills
```

On Linux/macOS use `python3` instead of `py`. This command validates and reuses
the existing graph; it does not repeat the knowledge migration. Read `AGENTS.md`
and `.ontolink/artifacts/agent-handoff.md` for task and evidence semantics.
The bundled mediator uses the Python standard library; no global skill install
or pip dependency install is required to resume project knowledge.

For application development install Node.js and run `npm ci`. Windows app builds
use Electron; native Android builds additionally require Java and the Android SDK.
These dependencies and generated build caches are installed per machine.

Git attributes preserve file bytes because evidence checks use SHA-256. Keep
`.ontolink/records`, `.ontolink/proofs`, `.ontolink/artifacts` and `knowledge.owl`.
Update changed artifact hashes through the mediator; never manually rewrite the
graph or silently rewrite retained proof files. Refresh context after records.

The root `ontolink-skills/` and `app/ontolink-skills/` distribution snapshots are
vendored as ordinary files, alongside the active `.agents/skills/ontolink-skills`
installation. Their original nested Git metadata stays local. Only the root
`knowledge.owl` is the canonical state for this application.
