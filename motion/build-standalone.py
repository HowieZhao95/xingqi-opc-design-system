"""Build the standalone HTML workbenches. Only the two HTML outputs are distributed."""
from pathlib import Path
import json
import re
import runpy

ROOT = Path(__file__).resolve().parent
context = runpy.run_path(str(ROOT / "build.py"))
bundle = context["bundle"]
for key in ("tokens", "local_assets"):
    bundle["plan"].pop(key, None)
licenses = {p.name:p.read_text() for p in (ROOT.parent/'licenses').glob('*.txt')}
shell = (ROOT/'studio-shell.html').read_text()
shell = shell.replace('<head>', '<head><!--\n'+(ROOT.parent/'LICENSE').read_text()+'-->',1)
scripts = {
    'ASSETS': 'window.OPC_ASSETS='+json.dumps(bundle,ensure_ascii=False,separators=(',', ':'))+';\n',
    'RUNTIME': (ROOT.parent/'source/proofs.js').read_text()+'\n'+(ROOT/'compositions/composition.js').read_text(),
    'APP': (ROOT/'studio-ui.js').read_text()
}
for name, text in scripts.items():
    shell = shell.replace('__'+name+'__', re.sub(r'</script', r'<\\/script', text, flags=re.I))
shell=shell.replace('<script id="mg-settings"', '<script type="application/json" id="font-licenses">'+json.dumps(licenses,ensure_ascii=False).replace('<','\\u003c')+'</script>\n<script id="mg-settings"')
for theme in ["dark","light"]:
    settings = {"theme":theme,"format":"wide","componentOnly":None,"transparent":True,"edits":{}}
    (ROOT/f"motion-{theme}.html").write_text(shell.replace('__SETTINGS__',json.dumps(settings,indent=2,ensure_ascii=False)))
