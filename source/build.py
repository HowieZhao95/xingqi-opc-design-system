"""Build the independent HTML-only deliverables from local V3 templates and assets."""
from pathlib import Path
import argparse,base64,json,re,sys
from tempfile import NamedTemporaryFile,TemporaryDirectory
from zipfile import ZipFile, ZIP_DEFLATED
R=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(R))
from library.register import register, documents, verify_library
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination',nargs='?',type=Path,default=R/'publish')
parser.add_argument('--package',type=Path,help='Write a shareable ZIP of the official offline HTML files.')
parser.add_argument('--check',action='store_true',help='Build in a temporary directory and validate the catalogue and its targets.')
args=parser.parse_args()
if args.check and args.package:
    parser.error('--check and --package have separate outputs')
temporary=TemporaryDirectory(prefix='opc-library-')
P=Path(temporary.name)
read=lambda file:(R/file).read_text()
def data(file,mime):return 'data:'+mime+';base64,'+base64.b64encode((R/file).read_bytes()).decode()
def js(o):return json.dumps(o,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def build(template, **params):
    return re.sub(r'@@([A-Z_]+)@@',lambda m:params[m[1]],read(template if template.startswith(('hud-mg/','library/')) else 'source/'+template))
spec=json.loads(read('tokens.json'))
variables=lambda d:';'.join('--'+k+':'+v for k,v in d.items())+';'
tokens=':root,.opc{'+variables(spec['accents'])+'}\n'+''.join(f'.opc[data-theme={m}]{{color-scheme:{m};'+variables(c)+'}\n' for m,c in spec['themes'].items())
tokens='/* '+read('LICENSE').replace('*/','* /')+' */\n'+tokens
for name in ['OPCDisplay','OPCSans','OPCNumber','OPCMono']:
    tokens+='/* '+read('licenses/'+name+'-OFL.txt').replace('*/','* /')+' */\n'
    tokens+='@font-face{font-family:'+name+';src:url("'+data('assets/fonts/'+name+'.woff2','font/woff2')+'") format("woff2");font-display:swap;}\n'
logos={p.name:data(str(p.relative_to(R)),'image/svg+xml') for p in (R/'assets/brand').glob('*.svg')}
common={'TOKENS':tokens,'INLINE':js({'brand':logos}),'TOKEN_JSON':js(spec),'KIT_JS':read('source/proofs.js')+'\n'+read('web/components.js'),'KIT_CSS':read('web/components.css'),'VISUAL_CSS':read('source/visual.css')}
(P/'uhd-scene.html').write_text(build('uhd.html',**common,
    UHD_OVERLAY_CSS=read('source/uhd-overlay.css'),UHD_STUDIO_CSS=read('source/uhd-studio.css'),
    UHD_OVERLAY_JS=read('source/uhd-overlay.js'),UHD_STUDIO_JS=read('source/uhd-studio.js'),
    UHD_IMAGES=js({name:data('assets/scenes/'+name+'.webp','image/webp') for name in ('talk','studio')}),
    UHD_LOGOS=js({tone:logos['xingqi-lockup-'+tone+'.svg'] for tone in ('dark','white')}),
    UHD_SCENES=js(json.loads(read('source/uhd-scenes.json')))))
def extra_faces(manifest):
    rules=[]
    for family,entry in json.loads(read(manifest)).items():
        uri=data(entry['file'],'font/woff')
        rules.append(f'@font-face{{font-family:{family};src:url("{uri}") format("woff");unicode-range:{entry["range"]};font-display:swap;}}')
    return '\n'.join(rules)+'\n'
hud_faces=extra_faces('hud-mg/font-ranges.json')
(P/'uhd-lightfield.html').write_text(build('lightfield.html',**common,
    LF_DATA=js(json.loads(read('source/lightfield-data.json'))),
    LF_PLATE=data('assets/scenes/lightfield.webp','image/webp'),
    LF_LOGOS=js({tone:logos['xingqi-lockup-'+tone+'.svg'] for tone in ('dark','white')}),
    LF_FRAME_CSS=extra_faces('source/lightfield-fonts.json')+read('source/lightfield-frame.css'),LF_DESK_CSS=read('source/lightfield-desk.css'),
    LF_RUNTIME=read('source/lightfield-runtime.js'),LF_TRANSPORT=read('source/lightfield-transport.js'),
    LF_DESK_JS=read('source/lightfield-desk.js')))
(P/'visual-guide.html').write_text(build('guide.html',**dict(common,TOKENS=tokens+hud_faces)))
(P/'web-starter.html').write_text(build('starter.html',**common))
for m in ['dark','light']:
    page=build('deck.html',**common,MODE=m,DATA=js(json.loads(read('source/slides.json'))),DECK_CSS=read('source/deck.css'),DECK_JS=read('source/deck.js'))
    (P/f'slides-{m}.html').write_text(page)
    (P/f'motion-{m}.html').write_bytes((R/'motion'/f'motion-{m}.html').read_bytes())
hud_catalog=json.loads(read('hud-mg/catalog.json'))
hud_shared=dict(common,HUD_CATALOG=js(hud_catalog),HUD_LOGOS=js({tone:logos['xingqi-lockup-'+tone+'.svg'] for tone in ('dark','white')}),
                HUD_CSS=hud_faces+read('hud-mg/studio.css'),HUD_ENGINE=read('hud-mg/kit.js'),
                HUD_CLOCK=read('source/lightfield-transport.js'),HUD_APP=read('hud-mg/app.js'))
# The prebuilt component URLs are production browser sources; ?edit=1 opens the offline editor.
(P/'hud-mg').mkdir(exist_ok=True)
hud_nav='<a href="index.html#group/hud">规范库</a><a href="uhd-lightfield.html">浮光实景 HUD</a><a href="visual-guide.html#hud-mg">制作规范 ↗</a>'
for kind in hud_catalog:
    is_preset=kind!='sequence'
    destination=P/'hud-mg'/(kind+'.html') if is_preset else P/'mg-hud.html'
    defaults={'kind':kind,'ink':'cyan','fps':30,'format':'wide','output':is_preset,
              'background':'transparent' if is_preset else 'solid'}
    content=build('hud-mg/desk.html',**hud_shared,HUD_DEFAULT=js(defaults),HUD_NAV='' if is_preset else hud_nav)
    destination.write_text(content)
# The main catalogue renders actual HTML specimens even when shared as a single file.
# Assets for exported web components are stored separately from the media documents.
preview={}
for medium in ['slides','motion']:
    page=(P/('mg-hud.html' if medium=='motion' else 'slides-dark.html')).read_text()
    preview[medium]=base64.b64encode(page.encode()).decode()
studio_js=read('source/studio.js')
studio_js='const MEDIA='+js(preview)+';\n'+studio_js
(P/'handbook.html').write_text(build('studio.html',**common,MODE='dark',RECIPES=js(json.loads(read('web/recipes.json'))),FILES_JS=read('web/files.js'),STUDIO_CSS=read('source/studio.css'),STUDIO_JS=studio_js))
registry=register(R,P)
preview_pages=['slides-dark.html','motion-dark.html','mg-hud.html','uhd-scene.html','uhd-lightfield.html']
preview_pages.extend(s['page'] for s in registry['entries'] if s['kind']=='page')
bank=documents(P,preview_pages)
(P/'index.html').write_text(build('library/index.html',**dict(common,TOKENS=tokens+hud_faces),
    VERSION=spec['version'],COVER=data('library/cover.webp','image/webp'),REGISTRY=js(registry),DOCUMENTS=js(bank),
    FILES_JS=read('web/files.js'),FOUNDATION_CSS=read('library/foundations.css'),FOUNDATION_JS=read('library/foundations.js'),
    LIBRARY_CSS=read('library/library.css'),LIBRARY_JS='\n'.join(read(f) for f in ['source/lightfield-transport.js','library/media.js','library/app.js'])))
verify_library(P,registry)
print('Catalogue:',len(registry['groups']),'groups,',len(registry['entries']),'stories')
print('HTML entries:',[(f.name,f.stat().st_size) for f in sorted(P.glob('*.html'))])
members=sorted(p.relative_to(P).as_posix() for p in P.rglob('*.html'))
def install(member, destination):
    payload=member.read_bytes()
    if destination.is_file() and destination.read_bytes()==payload:
        return
    destination.parent.mkdir(parents=True,exist_ok=True)
    with NamedTemporaryFile(dir=destination.parent,prefix='.opc-',delete=False) as staging:
        tmp=Path(staging.name)
    try:
        tmp.write_bytes(payload)
        tmp.chmod(destination.stat().st_mode & 0o777 if destination.exists() else 0o644)
        tmp.replace(destination)
    finally:
        tmp.unlink(missing_ok=True)

if args.package:
    archive_file=P/'share.zip'
    prefix='OPC-跨媒介主题V3.0/'
    with ZipFile(archive_file,'w',compression=ZIP_DEFLATED,compresslevel=7) as archive:
        for member in members:
            archive.write(P/member,prefix+member)
    with ZipFile(archive_file) as archive:
        if archive.namelist()!=[prefix+name for name in members] or archive.testzip():
            raise ValueError('Share package failed verification')
if not args.check:
    target=args.destination.resolve()
    for name in sorted(members,key=lambda name:name=='index.html'):
        install(P/name,target/name)
    if args.package:
        install(archive_file,args.package.resolve())
        print('ZIP:',args.package.resolve(),len(members),'HTML')
temporary.cleanup()
