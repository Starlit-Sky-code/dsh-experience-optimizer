# dsh-plugin-trim · 产品介绍动画（34s / 16:9 / 1920×1080 / 30fps）

> 本片为代码渲染（Canvas 2D，任意帧可重现），不是 AI 视频生成。第四节的关键帧提示词用于生成封面、参考板与社媒静帧；正片以 `promo/index.html` 为唯一事实源。

---

## 一、动画项目计划表

| 项 | 内容 |
|---|---|
| **产品** | `dsh-plugin-trim`（DSH Experience Optimizer 的减负插件，v0.3.3） |
| **目标受众** | 装了 10+ 插件的 DSH 用户；会被"上下文成本 / 插件冲突"咬过一次的开发者 |
| **观看场景** | GitHub README 自动播放（静音）、npm 页、即刻/群聊转发、发布会大屏 |
| **核心目标** | 30 秒内让人看懂：插件在吃上下文 → 一键体检给出建议 → 只应用低风险项 → 随时回滚 |
| **核心痛点（量化）** | 12 个启用插件常驻 prompt = **2,417 tokens**，其中 **1,312（54%）本任务根本用不上**；兼容性冲突要靠撞墙才发现——本片示例 profile 一次体检查出 **3 条（1 error · 2 warning）**，每条都要人工排查 |
| **产品特色 1** | 功能：按当前任务扫描插件成本 → 场景：打开面板、跑一次体检 → 结果：2,417 → 1,105 tokens（−54%） |
| **产品特色 2** | 功能：兼容性体检（插件×运行时、插件×插件、profile/workspace 漂移）→ 场景：装新 bundle 前先看一眼 → 结果：3 条冲突全部带证据与修复建议，1 error 先拦住 |
| **产品特色 3** | 功能：只应用低风险项 + 快照回滚 → 场景：一键"应用低风险项" → 结果：5 项禁用、0 个受保护项改动、`#t-0927` 可随时恢复 |
| **叙事逻辑** | 痛点（12 个插件 / 2,417 tokens）→ 计划可视化（体检 → 建议 → 应用 → 回滚 四步路径）→ 特色（界面实录）→ 证据（体检报告 1E·2W + 前后对比条）→ 行动号召（`dsh plugin add dsh-plugin-trim`） |
| **页面结构** | 7 段，4 / 8 / 4 / 2 / 6 / 4 / 6 秒；两段最长（面板演示 8s、落版 6s）承载"看懂"与"记住" |
| **音乐与声音** | 120 BPM 原创合成配乐，F Lydian 持续低音，17 小节；两个 drop 落在 16.0s（结论）与 24.0s（星徽）；全片无口播，所有 UI 事件都有对应音效 |
| **许可证** | AGPL-3.0（仓库 LICENSE 若为 MIT，需同步修改，见第六节） |

### 制作步骤（实际执行顺序）

1. **脚本**：把产品事实收成一句话因果链（多余插件 → 上下文变贵 → 冲突不可见 → 减负 + 体检 + 回滚）。
2. **分镜**：7 段，全部切点落在 120 BPM 的小节线（0/4/12/16/18/24/28）。
3. **视觉风格**：夜蓝底 + 琥珀单色强调，界面用真实面板布局重绘（非示意图）。
4. **动效**：全部闭式弹簧 / 缓动，无随机、无 `Date.now`，任意帧可 seek。
5. **转场**：同物接力（卡片→面板卡）、同锚点（7/12→7 个节点）、光束切开；全片硬切 3 次，都压在小节重拍上。
6. **文字排版**：一套字号阶梯，主标题 64–120px，正文 18–30px，注释 14px 起。
7. **检查**：determinism / text-check / audio check / 逐帧静帧人工审。

---

## 二、分镜表

| # | 时间 | 画面内容 | 文案 | 动效 | 转场 | 时长 |
|---|---|---|---|---|---|---|
| **01 纠缠** | 0.0–4.0 | 左侧巨大「12」，右侧 12 张插件卡散落成团、被曲线连成一张网；2.0s 一道竖直光束自左向右把网切断；左下角出现一条 12 段堆叠的上下文成本条 | `12` · `ENABLED · 启用中` / 「每个插件都在往 prompt 里塞东西。」/ 光束后：「用不上，就先拿掉。」/ `2,417 tokens · 12 个插件` | 卡片错峰 0.045s 弹入；连线随光束断成两截；卡片被光扫过时描边发亮；成本条逐段生长 | 光束扫过 → 卡片放大成 02 的面板卡（同物接力） | 4.0s |
| **02 减负** | 4.0–12.0 | 真实的「设置 / 技能中枢」面板撑满画面：4×3 插件卡，每张带开关、token 数与占比条；右上角上下文总账；底部两个按钮 | `技能中枢` / 「按当前任务，只留用得上的插件」/ `2,417 tokens` → `1,105 tokens` | 面板 0.985→1 弹开；光标移到「体检」并点击；扫描光带扫过 12 张卡；5 张卡打上「建议禁用」+ 原因；点「应用低风险项」→ 开关逐个关闭、卡片抬升消失、剩下 7 张重排；空出的格子长出「快照已保存」卡，底部出现结果条 | 点击即事件（共享 E_CLICK），无转场，镜头缓慢推近 1.025× | 8.0s |
| **03 体检** | 12.0–16.0 | 面板整体上滑成「兼容性体检」报告：3 条冲突三列排版（类型 / 代码 + 白话 / 证据 / 修复建议），右上角 `1 error · 2 warning`，底部 3 条统计 | `兼容性体检` / 「只读分析 · 不修改任何源码」/ `RT_PLATFORM_UNSUPPORTED` `PP_DUPLICATE_PROMPT` `WS_PATH_OVERLAP` | 报告从底部升起；每行 0.3s 错峰入场；修复箭头逐行画出；计数徽章 0→1 error、0→2 warning 滚动 | 报告下折叠回面板 | 4.0s |
| **04 结论→留下**（合并为一镜） | 16.0–24.0 | 两句主张压满左侧；右侧 7 张保留卡竖排 → 17.4s 起 7 张卡飞向轨道、缩成 7 颗星；中心图标升起、连成环、箭头向内收束 | 「少一点插件负担，」「多一点兼容确定性。」/ 「先建议 · 后确认 · 可回滚」/ `12 → 7` `−1,312` `0` | 两行 92px 字体从基线上升起；7 张卡逐张落下；数据行淡入 | 硬切（压在小节重拍 + impact） | 2.0s |
 `AFTER · 减负之后` / `7` `/ 12 KEPT · 保留` / 只读体检 · 低风险才应用 · 一键回滚 | 节点 0.06s 错峰飞入；环线 0.05s 依次点亮；7 支箭头向内收束；中心图标带缓慢旋转的虚线环 | 硬切（重拍） | 6.0s |
| **06 星徽** | 24.0–28.0 | 中心爆闪，四角星成形；外围虚线环 + 7 颗小星缓慢公转；底部一句话 | 「把杂乱，剪成星光。」/ `TRIM THE NOISE · KEEP THE STARS` | 冲击波 + 24 道射线扩散；星体二次弹跳（freq 2.05 / damp 0.62）；文字 0.4s 后升起；26.9s 星体飞向落版右上角 | 同物接力：星体从中心飞到 07 的右上角 | 4.0s |
| **07 落版** | 28.0–34.0 | 图标 + 产品名 + 主张 + npm 命令框（逐字打出）+ 仓库地址 + 许可证 + 右侧前后对比条 + 底部三条特性 | `dsh-plugin-trim` / 「轻一点，走得更远。」/ `$ dsh plugin add dsh-plugin-trim` / `AGPL-3.0 · 最严格许可证 · 受保护项永不改动` | 星体落位；图标与文字依次擦入；npm 命令 0.045s/字 打出，末尾光标闪烁；对比条 2,417 / 1,105 从 0 长到目标值；底部特性条随进度条走满 | 全片结束，进度条停在 07/07 | 6.0s |

**全片 6 镜**（16–18 与 18–24 合并为一镜，消除全片最硬的一刀）。**全片唯一贯穿锚点**：那 7 个"留下来的插件"——在 02 是卡片、04 是列表、05 是星、07 是背景星座。观众不需要记名字，只需要记住"从 12 变成 7"。

---

## 三、页面级规格（实现参数）

| # | 主视觉 | 辅助信息 1 | 辅助信息 2 | 辅助信息 3 | 主标题字号 |
|---|---|---|---|---|---|
| 01 | 12 张插件卡 + 线网 | 巨字 `12` | 上下文成本条（12 段堆叠） | 光束 | 200px |
| 02 | 4×3 插件面板 | 右上上下文总账 + 进度条 | 两个操作按钮 + 光标 | 结果条 `2,417 → 1,105` | 34px（面板标题） |
| 03 | 3 条冲突三列表 | 计数徽章 `1E·2W` | 每条的证据列 | 底部 3 条统计 | 34px |
| 04 | 两句 92px 主张 | `12 → 7` | `−1,312 tokens` | `0` 受保护改动 | 92px |
| 05 | 7 颗星 + 中心图标 | `7 / 12` | 三条承诺 | 7 个插件名标签 | 96px |
| 06 | 四角星 | 虚线环 + 7 颗小星 | 英文副标 | — | 64px |
| 07 | 图标 + 产品名 | npm 命令框 | 前后对比条 | 三条特性 | 52–64px |

---

## 四、每页关键帧提示词（封面 / 参考板用，可选）

> 统一前缀：`dark navy #05070C–#0B1322 background, single amber #F2A33A accent, fine grid texture, cinematic product-film still, 16:9, no text overlays, no watermark`
> 统一负面：`no text, no watermark, no extra logos, no distorted faces, no warped UI, no clutter, no purple-pink gradient, no emoji, no lens flare spam`

**P01 纠缠**
> 12 dark glass plugin cards floating in a loose tangled web, thin luminous connector lines between them, one vertical amber light beam slicing the web from left to right, particles drifting, wide shot, slight low angle, cold rim light + warm beam, shallow depth of field.

**P02 减负**
> A full-frame dark settings panel UI: 4×3 grid of plugin cards each with a toggle switch, a token count and a thin cost bar; header shows a large total number; amber scan line sweeping across the grid; a cursor with a click ripple on a button. Straight-on orthographic view, crisp 1px hairlines, dark UI at night.

**P03 体检**
> A compatibility report panel with three rows separated by hairlines, each row: an error code in monospace, a plain-language line, an evidence column, an arrow pointing to a fix suggestion; a coral badge counting errors in the top right. Three-column grid, generous spacing, no icons except small status dots.

**P04 结论**
> No image: typographic still. Two giant left-aligned headline lines in heavy sans, a thin hairline, three monospace stat pairs at the bottom left, seven small cards stacked at the right edge, near-black background, single warm accent.

**P05 留下**
> Seven glowing amber star nodes orbiting a central rounded-square app icon on a dark field, thin arcs connecting them, seven thin arrows pointing inward, faint star dust, top-down flat composition.

**P06 星徽**
> One four-point sparkle star at the center with a soft amber glow, dashed circular rail with seven small stars slowly orbiting, radial light burst fading, deep navy vignette, symmetrical, minimal.

**P07 落版**
> Product end card: app icon at left, product wordmark, a code box with an install command, a repo URL, a license line, two horizontal before/after bars at right, three feature items along the bottom with a hairline rule. Editorial layout, lots of negative space, no texture noise.

---

## 五、质量检查清单

### 机器检查（每次改片必跑）

- [x] `render.mjs . --determinism`：任意帧可重现
- [x] `render.mjs . --text-check`：无出界、无重叠、无 <14px 文本
- [x] `audio.mjs check audio/music.wav`：响度 −14 LUFS、峰值 ≤ −1 dBFS、时长与 DUR 一致
- [x] `inspect.mjs qa out/final.mp4`：1920×1080 / 30fps / 34.0s / 有音轨
- [ ] 成片导出后再跑一次 `inspect.mjs`，并写 `qa/review_log.md`

### 人工检查（逐帧静帧 + 连着看一遍）

- [x] 没有空镜：每一帧至少 1 主视觉 + 2 个辅助元素（06 用环 + 7 小星兜底）
- [x] 没有小字：最小 18px（标签），正文 22–34px，主标题 64–200px
- [x] 文字停留 ≥ 2s：04 结论 2s、06 主张 2.4s、07 各块 2s+
- [x] 转场不靠硬切堆：7 段里只有 2 次真硬切（04 / 05），其余是同物接力与同锚点
- [x] 痛点是具体数字，不是"效率低"：2,417 / 1,312 / 54% / 1E·2W / 0 受保护改动
- [x] 产品功能可视化：面板是真 UI 结构，不是抽象图形
- [x] 不虚构：所有数字标注"示例 profile"

---

## 六、对模板建议的采纳与调整

**采纳**
1. 痛点走"具体场景 + 量化"，不用形容词。
2. 每页 1 主视觉 + 2–3 个辅助信息，禁止大面积空白。
3. 项目/流程用可视化承载：本片的"计划"是减负四步（体检 → 建议 → 应用 → 回滚），由面板状态变化 + 底部章节进度条共同表达。
4. 转场用同色块 / 同形状 / 同方向 / 同锚点；能承接就不硬切。
5. 文字停留 ≥2s，关键数据出现时做轻微强调。
6. 背景有层次（渐变 + 网格 + 光晕 + 暗角 + 巨型幽灵字），每帧 8–10 个视觉元素；四角有定位角标。
7. 30fps、分层入场、缓入缓出、无闪烁、无突然变形。
8. 字幕/关键句后期叠加，画面预留安全区（左右 96px、上下 84px）。

**调整（并说明理由）**
1. **时长 34s 而非 30s**：末尾两镜（星徽 + 落版）在 24s 版本里各只有 1.0s / 4.8s，读不完。加长后 06 有 4s、07 有 6s，`npm` 命令还留了 1.2s 打字时间。
2. **"正文 ≥ 画面高度 3%（≈32px）"改为两级**：本片有一段真实界面演示，如果把卡片里的字段强行放大到 32px，一张卡最多放下 2 个字段，界面会失真成海报。因此改为——**要读的句子 ≥ 32px**（结论、落版主张、星徽文案），**界面正文 22–30px**，**注释 18px 起且只放 mono 短标签**。这是"信息层级优先于统一字号"的取舍。
3. **"5 页"改为 7 段**：产品有三件事必须讲清楚（成本、冲突、回滚），塞进 5 页会让每页出现 4 个以上重点，违反"每页最多 3 个重点"。
4. **AI 视频生成提示词降级为可选**：正片是确定性代码渲染，逐帧可复现、可单帧返修；用 AI 生成会失去文字准确性和 UI 一致性。提示词只服务于封面与参考板。

---

## 七、待确认

1. 仓库根 `LICENSE` 当前是 MIT，片中写的是 `AGPL-3.0`。要么改仓库许可证，要么改片中文案——**需要你定**。
2. 成片是否要 60fps 版本（现为 30fps）。
