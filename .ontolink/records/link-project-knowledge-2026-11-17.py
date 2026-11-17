"""Complete migration relationships using revision-guarded mediator commands."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
mediator = root / '.agents/skills/ontolink-skills/scripts/mediator.py'
def call(*args):
    result = subprocess.run([sys.executable,str(mediator),*args],cwd=root,capture_output=True,text=True,encoding='utf-8',check=True)
    return json.loads(result.stdout)

revision = call('context','--state','knowledge.owl')['revision']
manifest = json.loads((root/'.ontolink/artifacts/source-manifest.json').read_text(encoding='utf-8'))
source_ids = {path:f'source-{index:03d}' for index,path in enumerate(manifest['files'])}
def submit(data):
    global revision
    path = root/f'.ontolink/records/link-{revision+1:04d}-{data["id"]}.json'
    with path.open('x',encoding='utf-8') as stream:
        json.dump(data,stream,ensure_ascii=False,indent=2)
    receipt = call('record','--state','knowledge.owl','--input',str(path),'--expected-revision',str(revision))
    revision = receipt['revision']
    with path.with_suffix('.receipt.json').open('x',encoding='utf-8') as stream:
        json.dump(receipt,stream,indent=2)

components = [
    ('shared-editor','Shared offline editor and Markdown renderer',['app/app.js','app/markdown.js','app/styles.css','app/mobile.js','app/mobile.css'],'Vanilla JS/CSS/HTML shared across hosts; Arabic/English UI, RTL/bidi, editing/history, preview/export and local settings. Exact behavior is source-defined; current tests cover selected paths.'),
    ('windows-host','Electron window and IPC boundary',['main.js','preload.js'],'Electron main process owns files/dialogs/window lifecycle; preload exposes native operations. Independent document windows are covered by documents.spec.js.'),
    ('android-host','Android native WebView and bridge',['app/android.js','android/app/src/main/AndroidManifest.xml'],'Native Android source is under android/app/src/main. Browser bridge tests are simulated; native build/device verification remains open.'),
    ('release-pipeline','Version, standalone output and release automation',['package.json','scripts/sync-version.js','build-standalone.js','app/updates.js','.github/workflows/build.yml','.github/workflows/android.yml','.github/workflows/sync-web.yml'],'package.json is the version authority; regenerate standalone/web output after shared source changes. Matching tags trigger native release workflows; workflow existence is not a publication receipt.'),
]
for id,title,paths,summary in components:
    submit(dict(id=id,type='Contract',title=title,summary=summary,usesArtifact=[source_ids[p] for p in paths if p in source_ids]))
submit(dict(id='task-build',type='Task',usesArtifact=['outcome-build','source-manifest','changelog-source'],dependsOn=['task-plan','ontology-primary','evidence-boundary']+[c[0] for c in components]))
submit(dict(id='outcome-verify',type='Artifact',derivedFrom=['runtime-suite','source-manifest']))
submit(dict(id='project-maintainer',type='Actor',title='Future project maintainer',role='Planned role for open evidence collection and knowledge maintenance tasks'))
submit(dict(id='task-monitor',type='Task',dependsOn=['task-deliver','ontology-primary','evidence-boundary']))
print(json.dumps(call('validate','--state','knowledge.owl'),indent=2))
