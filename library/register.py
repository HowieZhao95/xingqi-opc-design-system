"""Assemble the searchable catalogue from the original production inputs."""
import json
import re
from pathlib import Path, PurePosixPath


def register(root, published):
    def read(name):
        return json.loads((root / name).read_text())
    spec = read("library/catalog.json")
    groups = {group["id"]: group for group in spec["groups"]}
    if len(groups) != len(spec["groups"]):
        raise ValueError("Duplicate catalogue group")
    entries = {}
    def add(group, key, kind, name, description, source, **fields):
        story_id = f"{group}/{key}"
        if group not in groups or not re.fullmatch(r"[a-z][a-z0-9-]*/[a-z][a-z0-9-]*", story_id):
            raise ValueError(f"Invalid catalogue ID {story_id}")
        if story_id in entries:
            raise ValueError(f"Duplicate catalogue ID {story_id}")
        if not name or not description:
            raise ValueError(f"Missing name or description in {story_id}")
        entries[story_id] = dict(id=story_id, group=group, key=key, kind=kind, name=name,
                                 description=description, source=source, **fields)
    foundation_sources={"brand":"assets/brand/","imagery":"source/proofs.js","reading":"web/components.js","controls":"web/components.css"}
    for item in spec["foundations"]:
        add("foundation", item["key"], "foundation", item["name"], item["description"], foundation_sources.get(item["key"],"tokens.json"),
            rules=item["rules"], tags=item["tags"], guide=item["guide"])
    web = read("web/recipes.json")
    if set(spec["webVariants"]) - set(web):
        raise ValueError("Variant refers to an unknown web component")
    for key, item in web.items():
        variants = spec["webVariants"].get(key, [])
        if len({v["id"] for v in variants}) != len(variants) or any(set(v["props"])-set(item["props"]) for v in variants):
            raise ValueError(f"Invalid web variant in {key}")
        add("web", key, "web", item["name"], item["use"], "web/recipes.json", props=item["props"], variants=variants)
    for item in read("source/slides.json"):
        add("slides", item["id"], "slide", item["label"], item["note"], "source/slides.json",
            defaults={k:v for k,v in item.items() if k not in {"id","kind","label","note"}}, tags=[item["title"],item["kind"]])
    plan = read("motion/shot-plan.json")
    names = {"TitleIn":"标题入场","StepIn":"步骤入场","CompareBars":"比较条形","LowerThird":"结论字幕","LogoOut":"品牌片尾"}
    for shot in plan["content"]["scenes"]:
        component = shot["component"]["name"]
        add("motion", shot["id"], "motion", names.get(component,component), shot["motion"], "motion/shot-plan.json",
            component=component, frames=shot["frames"][1]-shot["frames"][0], fps=plan["fps"],
            defaults=shot["component"]["props"], tags=[component])
    for key, item in read("hud-mg/catalog.json").items():
        add("hud", key, "hud", item["name"], item["note"], "hud-mg/catalog.json", frames=round(item["seconds"]*30),
            fps=30, hero=item["hero"], defaults=item["props"] or {"seconds":item["seconds"], "fps":30}, tags=[item["use"]])
    overlay_scenes=read("source/uhd-scenes.json")
    for item in spec["overlays"]:
        add("uhd", item["key"], "overlay", item["name"],item["description"],"source/uhd-scenes.json",
            defaults={k:v[item["key"]] for k,v in overlay_scenes.items()},tags=["场景","透明叠加"])
    lightfield = read("source/lightfield-data.json")
    for shot in lightfield["shots"]:
        add("uhd", "field-"+shot["id"], "field", shot["name"], shot["note"], "source/lightfield-data.json",
            shot=shot["id"], start=shot["start"], hero=shot["hero"], frames=shot["end"]-shot["start"], fps=lightfield["fps"],
            defaults={"start":shot["start"],"end":shot["end"],"hero":shot["hero"],"fps":lightfield["fps"]}, tags=["浮光","展厅","实景 HUD"])
    for item in spec.get("additional", []):
        group,key = item["id"].split("/")
        page = PurePosixPath(item["page"])
        if page.is_absolute() or ".." in page.parts or page.suffix != ".html":
            raise ValueError(f"Invalid sample path {page}")
        if page.parts[0] == "examples" and len(page.parts) >= 2:
            original = root / "library" / page
            if not original.is_file():
                raise ValueError(f"Missing example {original}")
            dest = published / page
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(original.read_bytes())
        if not (published/page).is_file():
            raise ValueError(f"Missing published HTML {page}")
        add(group,key,"page",item["name"],item["description"],"library/catalog.json",page=page.as_posix(),tags=item.get("tags",[]))
    return {"groups":spec["groups"],"entries":list(entries.values())}


def documents(published, names):
    """Store shared fonts, photos and logos once across offline preview documents."""
    uris = {}
    def asset(match):
        uri = match[0]
        if uri not in uris:
            uris[uri] = len(uris)
        return f"__OPC_ASSET_{uris[uri]}__"
    pattern = re.compile(r"data:[\w.+/-]+;base64,[A-Za-z0-9+/]+=*")
    pages = {name:pattern.sub(asset,(published/name).read_text()) for name in dict.fromkeys(names)}
    return {"assets":list(uris), "pages":pages}


def verify_library(published, registry):
    """Catch invalid guide anchors, resources and offline page references before packaging."""
    from html.parser import HTMLParser
    from urllib.parse import urlsplit, unquote

    class References(HTMLParser):
        def __init__(self, html):
            super().__init__()
            self.ids = set()
            self.targets = []
            self.feed(html)
        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            if "id" in attrs:
                self.ids.add(attrs["id"])
            for key in ("href","src","poster"):
                target = attrs.get(key)
                if target and not target.startswith(("data:","blob:")):
                    self.targets.append((tag, target))

    pages = {p.resolve():References(p.read_text()) for p in published.rglob("*.html")}
    groups = {g["id"]:g for g in registry["groups"]}
    guide = pages[(published/"visual-guide.html").resolve()]
    ids = {story["id"] for story in registry["entries"]}
    routes = {"overview","top","main-view","library","foundation","files","saved","manage"}
    routes.update("group/"+g for g in groups)
    routes.update(ids)
    for story in registry["entries"]:
        anchor = story.get("guide",groups[story["group"]]["guide"])
        if anchor not in guide.ids:
            raise ValueError(f"Missing guide section #{anchor} for {story['id']}")
    for path, page in pages.items():
        for tag, target in page.targets:
            address = urlsplit(target)
            if address.scheme or address.netloc:
                if tag != "a":
                    raise ValueError(f"External runtime dependency in {path.name}: {target}")
                continue
            dest = (path.parent/unquote(address.path)).resolve() if address.path else path
            if dest not in pages:
                raise ValueError(f"Missing linked HTML in {path.name}: {target}")
            anchor = unquote(address.fragment)
            if not anchor or anchor in pages[dest].ids:
                continue
            if dest == (published/"index.html").resolve() and anchor.split("?")[0] in routes:
                continue
            if dest.name.startswith('slides-') and 'slides/'+anchor in ids:
                continue
            raise ValueError(f"Missing anchor in {path.name}: {target}")
