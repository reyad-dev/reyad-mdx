"""One-time revision-guarded preparation of byte-preserving Git transport."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
mediator = root / '.agents/skills/ontolink-skills/scripts/mediator.py'
manifest = json.loads((root/'.ontolink/artifacts/source-manifest.json').read_text(encoding='utf-8'))
source_ids = {p:f'source-{i:03d}' for i,p in enumerate(manifest['files'])}
def sha(data):
    return hashlib.sha256(data).hexdigest()
def call(*args):
    p = subprocess.run([sys.executable,str(mediator),*args],cwd=root,text=True,encoding='utf-8',capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr)
    return json.loads(p.stdout)

# Reconcile our two changed tracked artifacts one at a time: each record validates
# every artifact, so preserve the other original file until its guarded write.
baseline = subprocess.check_output(['git','show','HEAD:.gitignore'],cwd=root)
candidates = [baseline,baseline.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')]
original = next(data for data in candidates if sha(data)==manifest['files']['.gitignore'])
(root/'.gitignore').write_bytes(original)
revision = 165
def submit(data):
    global revision
    path = root/f'.ontolink/records/github-{revision+1:04d}-{data["id"]}.json'
    with path.open('x',encoding='utf-8') as stream:
        json.dump(data,stream,ensure_ascii=False,indent=2)
    receipt=call('record','--state','knowledge.owl','--input',str(path),'--expected-revision',str(revision))
    revision=receipt['revision']
    with path.with_suffix('.receipt.json').open('x',encoding='utf-8') as stream:
        json.dump(receipt,stream,indent=2)

submit(dict(id=source_ids['.gitattributes'],type='Artifact',contentHash=sha((root/'.gitattributes').read_bytes())))
(root/'.gitignore').write_bytes(original+b'__pycache__/\r\n*.py[cod]\r\n')
submit(dict(id=source_ids['.gitignore'],type='Artifact',contentHash=sha((root/'.gitignore').read_bytes())))
submit(dict(id='portable-knowledge',type='Decision',title='Version the complete project-local ontology state and byte-preserving inputs',summary='User authorized pushing all project work to origin/main for resuming on another device. Track installed suite, graph, durable records/proofs, agent entry points and original distribution snapshots as ordinary files. Preserve exact source/proof bytes through Git attributes. Build/dependency caches and nested .git metadata remain machine-local.',basis='core.autocrlf=true would rewrite source/proof hashes; bundled coordinator requires Python 3.10+ standard library only.'))
path='.ontolink/README.md'
submit(dict(id='restore-guide',type='Artifact',kind='handoff',path=path,contentHash=sha((root/path).read_bytes()),status='CURRENT'))
submit(dict(id='github-transfer-prepared',type='Event',title='Prepared complete project knowledge for GitHub synchronization',summary='Local transport preparation; actual push and clean-clone validation receipts are recorded after those operations succeed.',affects=['project'],usesArtifact=['restore-guide']))
print(json.dumps(call('validate','--state','knowledge.owl'),indent=2))
