# 资源目录说明

本目录用于存放网页所需的图片与音频，请按以下结构放置文件（与 `constants.js`、`index.html` 中引用一致）：

## 目录结构

- **characters/** — 角色立绘（.webp）
  - 命名：`{角色id}default.webp`（默认）、`{角色id}_{表情}.webp`（如 `hana_prologue.webp`）
  - **好感度心情立绘**（按好感度自动切换）：`{角色id}_心情1.webp`～`{角色id}_心情5.webp`，对应 Lv1（0-20）～Lv5（91-100）。缺图时回退到 default。
  - 每日任务（Meiling）立绘：优先 `meilingdefault.webp`，若无则自动尝试 `meiling.webp`（任一即可）
  - **moichan 浮游导航**：`moichan1.webp`（开眼）、`moichan2.webp`（闭眼），用于可拖动的 300px 导航图标
  - 示例：`hanadefault.webp`、`hana_心情1.webp`～`hana_心情5.webp`、`alicedefault.webp`、`meilingdefault.webp`、`moichan1.webp`、`moichan2.webp`
- **backgrounds/** — 背景图（.webp）
  - **时段背景**（整页动态背景，刷新时按当前时间选一张）：`T1.webp`（早上 5–11 时）、`T2.webp`（中午 11–14 时）、`T3.webp`（下午 14–18 时）、`T4.webp`（晚上 18–5 时）
  - 示例：`map_main.webp`、`ember_bg.webp`、`sea_bed.webp`、`T1.webp`～`T4.webp`
- **icons/** — 图标（.png 或 .webp）
  - **通用**：`lock_icon.png`（锁定等 UI 用）
  - **PWA 安装图标**（用于「添加到主屏幕」/ 安装 App）：`icon_192.png`（192×192）、`icon_512.png`（512×512），须为 PNG，放在 `assets/icons/`。若缺失，安装后可能使用浏览器默认图标。
  - **地图节点图标**（庭院、市集、画廊等，用于主页地图上的入口）  
    路径：`assets/icons/`  
    命名：`icon_{节点英文名}.png` 或 `icon_{节点英文名}.webp`，与下方对应关系一致即可。
  - **节点与文件名对应表**：

    | 节点名称 | 建议文件名 | 说明 |
    |---------|------------|------|
    | 庭院 | `icon_garden.png` | Hana · 迎宾 / 抽卡 |
    | 市集 | `icon_market.png` | Shella · 因果值兑换 |
    | 画廊 | `icon_gallery.png` | Azalea · 卡牌收集 |
    | 图书馆 | `icon_library.png` | Mizuki · 角色设定 |
    | 每日任务 | `icon_daily.png` | Meiling · 每日祈愿 |
    | 歌剧 | `icon_theater.png` | 专使频道 |
    | 占卜 | `icon_divination.png` | Sienna · 占卜 |
    | 记忆 | `icon_memory.png` | 记忆 · 拍照场地 |

  - 若提供上述文件，可在 CSS 或 HTML 中通过 `assets/icons/icon_garden.png` 等路径引用；未提供时地图节点会以纯色边框+光效显示。

## 记忆 · 拍照场地

- **入口**：地图节点「记忆」、moichan 导航「记忆」。图标路径：**`assets/icons/icon_memory.png`**（与上表一致，缺图时节点仍显示「记忆」文字）。
- **功能**：独立拍照区，最多 10 个图片容器；支持「本地图片」上传、「庭院图片」从 `assets` 下 .webp 选择；容器可移动、旋转、翻转、层级(z)、裁剪、缩放(10%～600%)、删除；一键截图下载；返回地图时清空内容。
- **可选**：若需「庭院图片」列出全部子目录 .webp，可在 `assets/` 下放置 `webp-manifest.json`（字符串数组，如 `["characters/hanadefault.webp", ...]`），否则使用内置约定列表。

## 歌剧 · 专使频道链接设定

歌剧场景（地图节点「歌剧」→ 专使频道）中的**频道链接**与**嵌入视频**在 **`index.html`** 中写死，需手动修改：

| 项目 | 位置（index.html） | 说明 |
|------|--------------------|------|
| **关注频道链接** | `#scene-theater` 内 `.channel-promo a` 的 `href` | 当前占位：`https://www.youtube.com/@YourChannel`，改为你的 YouTube 频道主页（如 `https://www.youtube.com/@你的频道名`）。 |
| **嵌入视频** | `#theater-iframe` 的 `src` | 当前占位：`https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&rel=0`，改为要内嵌的单个视频的 embed 地址（格式：`https://www.youtube.com/embed/视频ID?enablejsapi=1&rel=0`）。 |

修改后保存即可生效，无需改 `constants.js` 或其它资源。

- **ui/** — 界面素材（如卡背）
  - 示例：`card_back.webp`
- **cards/** — 画廊卡牌图片（卡面/立绘），用于画廊展示
  - **命名规则**：文件名必须与卡牌 id **完全一致**，扩展名建议 `.webp` 或 `.png`。
  - 卡牌 id 来自 `assets/data/cards_index.json` 及 `assets/data/cards/*.json` 中的 `id` 字段（如 `CARD_001`、`CARD_002`）。
  - 示例：若 id 为 `CARD_001`，则图片命名为 `CARD_001.webp` 或 `CARD_001.png`，放在 `assets/cards/` 下。
  - 路径约定：`assets/cards/{卡牌id}.webp`（如 `assets/cards/CARD_001.webp`）。缺图时画廊会显示卡牌名称文字。
- **bgm/** — 背景音乐（.mp3），右下角 BGM 按钮会从此目录随机播放
  - 将本目录下所有要参与随机播放的 .mp3 文件名填入 `constants.js` 的 `BGM_FILES` 数组，如：`["theme.mp3", "track2.mp3"]`
  - 示例：`theme.mp3`
- **data/** — 已存在，卡牌 JSON 数据

若某张图缺失，页面会显示灰色「图」占位或文字，不影响使用。建议用**本地服务器**打开项目（如 `npx serve`）以保证路径正确加载。
