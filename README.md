# 星启 OPC 视觉风格规范库

一套面向网页、HTML 汇报与动态影像的跨媒介设计规范。保留两套主题、统一的字号与安全区，以及可编辑的 53 个样例。

[下载 V3.0 离线 HTML 风格包](https://github.com/HowieZhao95/xingqi-opc-design-system/releases/tag/v3.0.0)后解压，打开 `index.html`。本地构建只需 Python 3.10 或更新版本。

```sh
python3 motion/build-standalone.py
python3 source/build.py --check
python3 source/build.py ./publish
```

代码和规范采用 MIT 许可。字体与品牌标志的适用范围见 [许可说明](NOTICE.md)。

## 制作与交接

对外交付以 `index.html` 为统一规范库。当前含 11 个入口和 `hud-mg/` 下的 8 个独立动效，共 19 个离线 HTML。原跨媒介对照手册为 `handbook.html`。网页、汇报、MG 工作台、字体和共用主题参数由本目录维护。在本目录运行 `python3 source/build.py /目标目录 --package /存放位置/风格包.zip` 可重建入口、组件和分享包。基础纸页 MG 改分镜或组件后，先运行 `python3 motion/build-standalone.py`。发布入口和规范见项目 AGENTS.md。

## 视觉风格规范库

`index.html` 以原生 HTML、CSS 和 JavaScript 展示六类条目。基础规范 10 项，网页 10 件组件加 1 个整页，汇报 9 种版式，基础 MG 5 镜，光学 HUD 8 件加 1 个组合，UHD 4 类场景叠加加 5 个展厅镜头，当前共 53 项。可搜索、收藏、比较变体、修改参数并下载独立 HTML。明暗颜色来自原主题，预览和导出调用实际制作页。主入口文件自身内嵌全部样例所用的文档、定稿字标、字体与实景照片。整包另外提供工作台和完整手册。

### 修改与新增

- `library/catalog.json` 管理分类、基础规范文案、网页命名变体和附加页面。`library/register.py` 从原生 recipes、slides、shot-plan、HUD 目录、实景配置中汇编展示条目。修改已登记内容时在对应源文件操作。
- 新增一个通用 HTML 样例时，把自包含文件放在 `library/examples/`，再在 `additional` 增加 `id`、`name`、`description`、`page`、`tags`。例如 `{"id":"web/material-note","name":"材料说明","description":"列出作品材料与出处。","page":"examples/material-note.html","tags":["材料"]}`。新条目会出现在导航、搜索与离线预览中，相同文件会随 ZIP 分发。条目 ID 使用已登记的分类前缀与稳定的英文短名，名称可单独调整。首个现成登记示例为 `web/starter`。
- 增加新的网页组件时，在 `web/components.js` 注册实际绘制函数，向 `web/recipes.json` 添加默认参数。增加全新基础原语时，在 `library/foundations.js` 提供对应的样张，并同步 `library/catalog.json` 的规则。深浅色、尺寸和时序的共用参数在 `tokens.json`。
- 页面右侧的编辑在当前预览生效，下载 HTML 可保存改动。收藏保存在当前浏览器；可复制相对条目地址随包分享。项目级默认值调整后重新构建规范库。
- 维护命令为 `python3 source/build.py --check`，在临时目录校验分类、重复 ID、引用、规范锚点与离线资源。发布命令为 `python3 source/build.py /目标目录 --package /存放位置/风格包.zip`。光场封面是既有 `uhd-lightfield.html` 第 77 帧的局部，文件为 `library/cover.webp`。

2026-11-26 品味审视后在 V3.0 原入口同步精修。跨媒介印样由 `source/proofs.js` 统一生成，A 为环纹、B 为波纹；改动这个文件时先运行 `python3 motion/build-standalone.py`，再运行 `python3 source/build.py 目标目录`。规范区包含色值、字样、可重播的 12 帧入场样本。汇报目录缩略图从当前版式实时生成；MG 时间线标记使用分镜帧区间。移动端和减弱动态效果参与验收。

UHD 样机源码为 `source/uhd*`；两张生成的场景样张在 `assets/scenes/`。按等比裁切制成 3840 × 2160 WebP 并随样机内嵌。对外包增加 `uhd-scene.html`。透明层由样机实时导出，只取当前配置、字体与定稿字标。

2026-11-27 新增 `uhd-lightfield.html`。浮光展厅用内置 ImageGen 新图、同坐标镜头与空间锚点、两段光路和三条模拟照度曲线构成 30 秒可定位导览。源数据、传输时钟、绘制与导出逻辑为 `source/lightfield-*`。上屏 WebP 在 `assets/scenes/`。展厅专用补充字形在 `assets/fonts/XQField*.woff`，范围见 `source/lightfield-fonts.json`。导出的含景、透明、底图三种版本使用相同帧索引，可分层合成。

《浮光》上屏改为光学扫描 HUD。曲面依据新底图中的上沿、下沿配准成 48 段，扫描环与百分比仪表共用位置变量。三点探针、三通道模拟照度和底部遥测带按同一帧更新。工作台可单独开关曲面光迹、探针、仪表；透明层导出保留这些设置。青辉和冰白两种笔色均透出原场景，屏幕信息仅用局部暗色承托。

### UHD 光学 HUD 的 MG 组件

`mg-hud.html` 是可编辑的 20 秒组合。八件原生 SVG 动效分别生成到 `hud-mg/{title,surface,dial,probe,trace,plot,band,seal}.html`。每个预设都能单独复制到新目录，直接播放透明画面。按 E 或加 `?edit=1` 打开编辑器。本机浏览器中保存参数请用“下载 HTML”。内嵌补充字形随 HTML 一起分发。

- `hud-mg/catalog.json` 定义默认尺寸以外的内容参数、单位、曲面控制点、采样与时长。`hud-mg/kit.js` 按帧绘制八件组件，含横竖版落位、投影和组合编排。曲面和仪盘共享扫描进度，探针可绑定光迹头或曲面坐标。组合内改 `plot.series` 同步探针、曲线、字幕和片尾通道数。
- `hud-mg/app.js` 管理工作台、参数校验、浏览器源与导出。`hud-mg/desk.html` 和 `hud-mg/studio.css` 控制编辑界面。`source/lightfield-transport.js` 是实景与 MG 共用的帧时钟。
- 单件默认透明。横向、竖向逻辑坐标分别为 1920 × 1080、1080 × 1920，按 2 倍输出至原生 UHD。设 `?format=portrait&fps=60&ink=day` 可直接预览亮底用色的竖版。帧从 0 计。加 `?frame=90` 可定位，无障碍减弱动态设置下按段落显示关键状态。
- 宿主从父页面发送 `{type:"XQHUD:seek",frame:n}`、`{type:"XQHUD:play"}` 或 `{type:"XQHUD:pause"}`。同一文档内可直接调用 `HudMG.mountComponent(host, "dial", {label:"扫描",unit:"%",from:0,to:100}, {fps:30,seconds:5})`。返回实例支持 `ready`、`seekFrame(n)`、`play()`、`pause()`、`destroy()`。外部父页面与单件保持相同画幅及帧率即可同步合成。
