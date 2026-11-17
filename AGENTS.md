<!-- ontolink:start -->
Before project work, read `.rule/ONTOLOGY-FIRST.md`. Resolve the installed
`ontolink-skills` coordinator and run `.rule/ontolink.py start` with its actual
`--skill-root` and the canonical `--state` when configured. Keep generated
OntoLink records, proofs and text under the fixed `.ontolink/` directory.
<!-- ontolink:end -->

## Canonical project knowledge

`knowledge.owl` is the primary project knowledge and task registry. On every session:

1. Run `py .rule/ontolink.py start --root . --skill-root .agents/skills/ontolink-skills` (use `python3` on Linux/macOS).
2. Read `.ontolink/context.json`, then retrieve the relevant task and linked sources. For focused context use the mediator `context --state knowledge.owl --task <id>`.
3. Record requirements, decisions, completed work, failures, pending work and proposed future work through the mediator with the current expected revision. Only the mediator writes `knowledge.owl`.
4. Preserve source/proof hashes, dependencies and evidence scope. Historical completion imported from CHANGELOG is a documented claim, not universal runtime verification. See `.ontolink/artifacts/agent-handoff.md`.
5. Validate and refresh context before handoff. Keep durable records/proofs/artifacts in version control; do not delete them as caches.

Source code remains authoritative for actual behavior. Inspect it when needed; update graph facts and affected evidence when it changes. Never invent missing history or treat proposed follow-ups as approved features. No background updater is installed.
