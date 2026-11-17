"""One-time evidence-scoped migration. Writes canonical state only via mediator."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / '.agents/skills/ontolink-skills'
MEDIATOR = SKILL / 'scripts/mediator.py'
ART = ROOT / '.ontolink/artifacts'
PROOF = ROOT / '.ontolink/proofs'
ART.mkdir(parents=True, exist_ok=True)
PROOF.mkdir(parents=True, exist_ok=True)

def command(*args):
    result = subprocess.run([sys.executable, str(MEDIATOR), *args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(result.stderr)
    return json.loads(result.stdout)

revision = command('context', '--state', 'knowledge.owl')['revision']
if revision != 0:
    raise SystemExit('One-time migration requires untouched revision 0; preserve state and reconcile manually.')

def write(path, text):
    if path.exists():
        raise RuntimeError(f'Refusing to replace durable file: {path}')
    path.write_text(text, encoding='utf-8')
    return path.relative_to(ROOT).as_posix()

def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

def record(data):
    global revision
    path = ROOT / f'.ontolink/records/import-{revision + 1:04d}-{data["id"]}.json'
    write(path, json.dumps(data, ensure_ascii=False, indent=2))
    receipt = command('record', '--state', 'knowledge.owl', '--input', str(path), '--expected-revision', str(revision))
    revision = receipt['revision']
    write(path.with_suffix('.receipt.json'), json.dumps(receipt, indent=2))

def artifact(id, path, kind, **extra):
    record(dict(id=id, type='Artifact', kind=kind, path=path, contentHash=digest(path), status='CURRENT', **extra))

def evidence(id, target, path, proof, scope):
    record(dict(id=id, type='Evidence', supports=target, outcome='PASS', proofPath=proof, proofHash=digest(proof), targetHash=digest(path), summary=scope))

def close_phase(phase, title, kind, body, review):
    packet = command('context', '--state', 'knowledge.owl')
    if packet['workflow_skill'] != {'discover':'ontolink-discovery','design':'ontolink-architecture','plan':'ontolink-planning','build':'ontolink-implementation','verify':'ontolink-verification','deliver':'ontolink-delivery'}[phase]:
        raise RuntimeError('Unexpected phase; stop rather than bypass gates')
    path = write(ART / f'{phase}.md', body)
    proof = write(PROOF / f'{phase}-review.txt', review)
    artifact(f'outcome-{phase}', path, kind)
    evidence(f'proof-{phase}', f'outcome-{phase}', path, proof, review)
    record(dict(id=f'task-{phase}', type='Task', title=title, status='DONE', usesArtifact=[f'outcome-{phase}']))

head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
history = subprocess.check_output(['git','log','--format=%h %s'], cwd=ROOT, text=True, encoding='utf-8')
history_path = write(PROOF / 'git-history.txt', history)
tests_path = '.ontolink/proofs/playwright-2026-11-17.txt'
assert '18 passed' in (ROOT / tests_path).read_text(encoding='utf-8-sig')

record(dict(id='project-owner', type='Actor', title='Mohamed Reyad', role='Project owner, package author and requester'))
record(dict(id='codex', type='Actor', title='Codex', role='Local integration and evidence inventory agent'))
record(dict(id='ontology-primary', type='Requirement', title='Make ontology the primary project knowledge and task registry', summary='User requested local OntoLink installation and import of completed, unfinished, recorded and future tasks with knowledge retrieval for future AI agents. Historical coverage is limited to accessible repository content.'))
record(dict(id='evidence-boundary', type='Decision', title='Separate documented history, current tests and proposed follow-ups', basis='CHANGELOG, git history, source inspection and 18 current Playwright tests; no external release receipt or native Android execution in this session.'))
close_phase('discover', 'Inventory existing project scope and knowledge requirements', 'requirements',
    '# Scope and acceptance\n\nInstall the complete local OntoLink suite; preserve application code. Import all CHANGELOG bullet entries as documented historical implementation tasks, with version, category and source. Preserve git history and source hashes. Record architecture, acceptance boundaries, current regression evidence, unknowns and concrete future follow-ups. Future agents must start from knowledge.owl and write via mediator. No inaccessible conversations/issues are assumed imported.\n\nAcceptance: local rules + seven bundled phase skills; single valid graph; traceable history; explicit open future work; retained proofs; agent handoff.\n',
    'Reviewed user request, package.json, CHANGELOG.md, git history, app module symbols, native/workflow paths and test definitions. Scope explicitly distinguishes documented completion from current runtime checks. This is a requirements review, not a product runtime proof.\n')
close_phase('design', 'Document native architecture and ontology contracts', 'contracts',
    '# Architecture and contracts\n\nReyadMDX 1.3.1, MIT, npm package reyad-mdx. Vanilla JS/CSS/HTML shared renderer/editor: app/app.js, app/markdown.js, app/styles.css, fonts.css, mobile.js, mobile.css. Windows: Electron 31 main.js + preload.js IPC bridge window.mdxNative. Android: Java WebView host under android/app/src/main, bridge app/android.js; SDK 35 and Java 17 in workflow. No backend/database dependency is declared.\n\nVersion source package.json -> scripts/sync-version.js -> app/version.js and Android versionCode. build-standalone.js generates MDX-Reader-Standalone.html and docs/index.html. Edit shared source, regenerate outputs; native host changes require native rebuild. Tests: Playwright browser + Electron; Android native script is separate. CI: test.yml, build.yml, android.yml, sync-web.yml. Stable update policy uses GitHub Releases and platform assets; installation is user initiated.\n\nknowledge.owl is canonical semantic/task state. .ontolink/context.json is regenerated cache. Immutable records/proofs and linked artifacts retain SHA-256 provenance. Historical audit tasks accept faithful import of a changelog implementation claim; they do not certify all original functionality. Source code determines actual behavior. Only mediator writes state, with expected revision. New product work must use its actual lifecycle phase, not be hidden in monitoring.\n',
    'Reviewed package metadata, scripts, main/preload and app module boundaries, Android native source locations, build/test workflows. Architecture retains existing stack and distinguishes graph state from generated context and code navigation.\n')
close_phase('plan', 'Plan retrospective import and future-agent handoff', 'plan',
    '# Migration plan\n\nCodex owns this local migration: install project suite; retain source manifest and git history; import each changelog bullet as historical implementation audit task; link release provenance and manifest; attach current Playwright result separately; finish local handoff; retain unresolved follow-ups.\n\nFuture planned owner is project maintainer. Follow-ups are evidence collection and maintenance, not approved new product features: native Android regression/build/lint; release asset receipt verification; inspect duplicate skill distribution inside app packaging. Requirements for each follow-up appear on its graph task. Record newly requested product work in its native phase with explicit dependencies and evidence. No historical issue list or prior chat backlog is available locally.\n',
    'Reviewed sequence against actual completed installation and successful test process. Migration has concrete owners, source/evidence boundaries, validation and future acceptance criteria. External actions are outside this local migration.\n')

# Pin tracked inputs individually so changed source bytes fail provenance validation.
tracked = subprocess.check_output(['git','ls-files','-z'], cwd=ROOT).decode('utf-8').split('\0')
sources = [p for p in tracked if p and (ROOT / p).is_file() and not p.startswith(('dist/','node_modules/','test-results/'))]
manifest = {'head':head,'packageVersion':'1.3.1','scope':'Tracked repository snapshot; no secrets or file bodies', 'files':{p:digest(p) for p in sources}}
manifest_path = write(ART / 'source-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
artifact('source-manifest', manifest_path, 'implementation')
artifact('changelog-source', 'CHANGELOG.md', 'implementation')
artifact('git-history', history_path, 'history')
for i, path in enumerate(sources):
    artifact(f'source-{i:03d}', path, 'source')

review_path = write(PROOF / 'historical-import-review.txt',
    'Repository baseline '+head+'; package version 1.3.1. Reviewed complete CHANGELOG entries and git subjects; all bullet entries are imported without guessing original dates beyond release headers. PASS here means faithful retrospective inventory with local provenance. It does not certify every historical feature or a published release. app/app.js and app/markdown.js expose the documented editor/rendering functions; main.js/preload.js provide Electron host; Android Java/WebView, bundled fonts, build scripts and workflows exist. Current functional proof is separately scoped to the 18 Playwright tests.\n')
evidence('history-import-proof','changelog-source','CHANGELOG.md',review_path,'Faithful historical implementation record, not comprehensive runtime verification')
release = category = ''
count = 0
for line_no, line in enumerate((ROOT/'CHANGELOG.md').read_text(encoding='utf-8').splitlines(),1):
    if line.startswith('## ['):
        release = line[3:]
    elif line.startswith('### '):
        category = line[4:]
    elif line.startswith('- ') and release:
        count += 1
        record(dict(id=f'history-{count:03d}', type='Task', phase='build', title=line[2:], owner='project-owner', status='DONE', requiredKind=['implementation'], usesArtifact=['changelog-source','source-manifest'], dependsOn=['task-plan','evidence-boundary'], summary=f'Documented historical implementation: {release}; {category}; CHANGELOG.md:{line_no}. DONE accepts retrospective import/provenance only; current behavior is covered only where a named test exists. Original execution receipts unavailable.'))

close_phase('build', 'Install OntoLink integration and import repository knowledge', 'implementation',
    f'# Implemented local migration\n\nInstalled .agents/skills/ontolink-skills with seven bundled phases, .rule, AGENTS.md and GEMINI.md. Added Cursor, Cline and Copilot entry points. Canonical knowledge.owl created using installer and modified solely by mediator. Imported {count} documented changelog tasks plus source artifacts, git evidence, decisions and requirements. Baseline {head}; application version 1.3.1. Existing distribution folders preserved. Application source was not modified by this migration.\n',
    'Observed project_setup success; start returned VALID revision 0. Verified local coordinator, bundled phases and project instruction files. Historical import records passed mediator guards. Application regression suite finished with 18 passed.\n')
artifact('runtime-suite',tests_path,'verification')
evidence('runtime-suite-proof','runtime-suite',tests_path,tests_path,'npm test: 18 passed, browser/standalone and Electron; Android bridge tests are simulated, not device execution')
close_phase('verify', 'Verify imported graph provenance and current local regression suite', 'verification',
    f'# Verification scope\n\n`npm test` exited 0: 18 passed (19.9s), retained at {tests_path}. Test sources cover editor/RTL history, fonts, updates and document isolation. Browser Android bridge scenarios do not establish native device correctness. Tracked source hashes are graph artifacts; source-manifest.json records baseline {head}. Each accepted record is validated by mediator. Native Android build/lint/emulator, signed Windows packaging and remote release receipt checks were not run in this migration.\n',
    'Inspected actual Playwright process exit 0 and complete result log: 18 passed, no skipped tests. Reviewed tests and provenance scope; no claim of native Android or external release verification. Every imported artifact is hashed and mediator validated each guarded write.\n')
handoff = '''# Agent handoff — 2026-11-17

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
'''
close_phase('deliver','Hand off local ontology integration and retrieval instructions','handoff',handoff,
    'Checked local handoff commands, project instruction entry points and retained test/source references. This handoff delivers local installation and knowledge migration, not a deployment or remote communication.\n')
# The durable human-readable entry point is the delivered artifact, with the same bytes.
handoff_path = write(ART/'agent-handoff.md',handoff)
artifact('agent-handoff',handoff_path,'handoff')
record(dict(id='task-monitor',type='Task',title='Maintain ontology at each future project session',summary='Future continuing work. Start, inspect current tasks, record changes and evidence, refresh context. No always-on watcher. Acceptance for a session: current monitoring artifact and validated graph.',status='TODO'))
followups = [
    ('native-android','Collect current native Android build, lint and device regression evidence','Run Gradle assembleDebug/lintDebug and npm run android:test with a configured SDK, unlocked device/emulator and installed debug APK. Record commands, device/build identity and logs. Browser bridge tests alone are insufficient.'),
    ('release-receipts','Reconcile historical release claims with actual remote artifacts','Inspect matching GitHub tag/release and Windows installer/portable, Android signed APK and standalone assets; store actual version/hash receipts. Do not mark published from local workflow definitions.'),
    ('distribution-packaging','Review duplicate OntoLink distribution under application assets','package.json includes app/**/* and an existing app/ontolink-skills copy is present. Inspect packaging and agree how to exclude/relocate the user copy before building a new release; preserve the active .agents package and canonical graph.'),
]
for id,title,summary in followups:
    record(dict(id='followup-'+id,type='Task',phase='monitor',title=title,summary=summary,owner='project-maintainer',status='TODO',requiredKind=['monitoring'],dependsOn=['task-deliver'],usesArtifact=['agent-handoff']))
record(dict(id='coverage-limit',type='Warning',affects=['project'],summary='Knowledge coverage is the accessible local repository, release notes and current checks. Prior chats/external issue backlog and external release receipts are unavailable in this session. Preserve the distinction between history claims and tested facts.',severity='INFO',status='OPEN'))
record(dict(id='packaging-risk',type='Warning',affects=['followup-distribution-packaging'],summary='Existing app/ontolink-skills distribution may enter Electron app/**/* packaging. Review before release; files were preserved.',severity='WARNING',status='OPEN'))
record(dict(id='future-features',type='Recommendation',affects=['project'],summary='Import any additional user-approved backlog or prior design decisions when they become available',basis='No dedicated local TODO/roadmap backlog found; future release instructions in README describe process, not approved feature requests.',status='PROPOSED'))
validation = command('validate','--state','knowledge.owl')
print(json.dumps({'revision':revision,'historicalTasks':count,'validation':validation},indent=2))
