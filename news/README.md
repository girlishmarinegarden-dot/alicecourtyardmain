# Telegram Bot + GAS + Drive/Sheet + GitHub Pages

## 使用 `setting.txt`（本地配置）

- 在仓库根目录维护 `setting.txt`（格式见 [setting.example.txt](setting.example.txt)）。**该文件已加入 [.gitignore](.gitignore)，请勿把含 Token 的文件推送到公开仓库。**
- [news.js](news.js) 中 `CONFIG.SPREADSHEET_ID` 可与 `setting.txt` 对齐；若 **News** 不是第一个工作表，请把 `CONFIG.GID` 改成该表 URL 里 `gid=` 的值。
- **Apps Script → 项目设置 → 脚本属性** 须手动添加（值从 `setting.txt` 复制）：`BOT_TOKEN`、`DRIVE_FOLDER_ID`、`SPREADSHEET_ID`（与表格 ID 相同）。
- Webhook 已可按 `setting.txt` 中的 `gas link` 通过 Telegram `setWebhook` 绑定（若你更换了 GAS 部署 URL，需重新执行一次 `setWebhook`）。

## 1. Google 端（对应待办 google-setup）

1. **Drive**：新建文件夹，打开后从 URL 复制文件夹 ID（`/folders/` 后一段），记为 `DRIVE_FOLDER_ID`。
2. **表格**：新建 Google 表格，新增工作表命名为 **`News`**（与脚本常量一致）。第一行表头（四列，英文）：
   - `time` | `text` | `url` | `hasText`（`hasText` 列为布尔值 **true** / **false**）
3. **共享表格**：共享 → 「知道链接的任何人」→ **查看者**。复制表格 ID（`/d/` 与 `/edit` 之间），记为 `SPREADSHEET_ID`。打开 **News** 工作表，从 URL 复制 `gid=` 后的数字，写入 [news.js](news.js) 的 `CONFIG.GID`。
4. **Apps Script**：新建项目，将 [gas/Code.gs](gas/Code.gs) 全文粘贴到编辑器。
5. **脚本属性**（项目设置 → 脚本属性）：

| 属性 | 说明 |
|------|------|
| `BOT_TOKEN` | @BotFather 提供的 Bot Token |
| `DRIVE_FOLDER_ID` | 上述文件夹 ID |
| `SPREADSHEET_ID` | 上述表格 ID |
| `WEBHOOK_SECRET` | 可选；随机字符串，须与下方 `setWebhook` 的 `secret_token` 一致 |

## 2. 部署 Web 应用与 Webhook（对应待办 gas-webhook / set-webhook）

1. **部署**：部署 → 新建部署 → 类型选 **Web 应用**。执行身份：**我**；具有访问权限的用户：**任何人**。部署后复制 **Web 应用网址**（以 `/exec` 结尾）。
2. **设置 Webhook**（将占位符替换为实际值，在浏览器地址栏打开或用 curl）：

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<编码后的_GAS_WEB_APP_URL>&secret_token=<WEBHOOK_SECRET>
```

若未使用 `WEBHOOK_SECRET`，可省略 `secret_token` 参数，并删除脚本属性中的 `WEBHOOK_SECRET`。

3. **若 GAS 收不到 `X-Telegram-Bot-Api-Secret-Token`**：可把 Webhook URL 改为  
   `.../exec?secret=<WEBHOOK_SECRET>`（与脚本中 `e.parameter.secret` 校验一致）。

## 3. GitHub Pages（对应待办 github-pages-html）

1. 将本仓库推送到 GitHub。
2. 编辑 [news.js](news.js) 内 `CONFIG`：`SPREADSHEET_ID`、`GID`。
3. 仓库 **Settings → Pages**：源选分支与根目录（`index.html` 会跳转到 [news.html](news.html)；也可直接打开 `news.html`）。
4. 访问 `https://<user>.github.io/<repo>/` 或 `.../news.html` 查看公告板。

看板逻辑在 [news.js](news.js)，样式在 [news.css](news.css)。通过 **动态插入 `<script src="…gviz…">`** 读表（不走 `fetch`），**本地打开 `news.html`（file://）** 与 **GitHub Pages** 均可（表格须「知道链接的任何人可查看」）。

## 4. 联调验收（对应待办 e2e-test）

- 在 Telegram 向 Bot 发送 `/start`，再发送一张图片；应出现「含文字 / 不含文字」按钮。
- 若发图时已带说明：点按钮后应提示已记录；Drive 文件夹有新文件（链接可打开），`News` 表新增一行。
- 若发图无说明：点按钮后 Bot 要求再发文字；发送纯文字后同样写入 Drive 与表格。
- 浏览器打开 GitHub Pages：应能滚动展示表格中的条目（若表格为空或 ID 错误会报错）。

## 5. 排错：`/diag` 没反应、`getWebhookInfo` 返回 404

### `{"ok":false,"error_code":404}` 访问 `getWebhookInfo`

说明里的 **`TOKEN` 是占位符**，必须换成 **@BotFather 给你的整段 Token**，中间**不能**多空格、不能把英文单词 `TOKEN` 写进地址。

- **错误**：`https://api.telegram.org/botTOKEN/getWebhookInfo`
- **正确格式**：`https://api.telegram.org/bot<数字>:<字母数字下划线连字符>/getWebhookInfo`  
  例如：`https://api.telegram.org/bot123456789:AAbx...（省略）.../getWebhookInfo`

先用 **`getMe`** 确认 Token 是否有效（同样要把整段 Token 接在 `bot` 后面）：

```
https://api.telegram.org/bot<你的完整Token>/getMe
```

若 `getMe` 仍不是 `"ok":true`，说明 Token 抄错、过期或已在 BotFather 里撤销，需要重新复制或换新 Token，并在 **Apps Script 脚本属性** 里把 `BOT_TOKEN` 改成同一串。

### `getWebhookInfo` 正常后要看什么

在 **`ok":true`** 的 JSON 里看 `result.url`：

- 若 **没有 `url` 或为空**：Webhook 未设置，请用 [第 2 节](#2-部署-web-应用与-webhook对应待办-gas-webhook--set-webhook) 的 `setWebhook` 把地址设成当前 GAS 的 **`/exec`** 链接（与浏览器能打开 `ok gas webhook endpoint` 的那条一致）。
- 若 **`url` 不是你现在这条 GAS 部署**：Telegram 还在把更新推到旧地址，请重新 `setWebhook`。

### GAS 能打开、`getMe` 正常，但 Telegram 里仍无回复

1. **脚本属性里的 `BOT_TOKEN`** 必须与浏览器里测试用的 **完全一致**（同一 Bot）。
2. 打开 Apps Script → **执行记录**，发一条 `/diag` 后看是否有 **`doPost`**：没有则 Webhook 仍不对或未部署「任何人」；有则点进去看报错（例如 `sendMessage` 失败原因）。
3. 确认对话里是 **对正确的 Bot** 发消息（与 Token 对应的那一个）。

### `Wrong response from the webhook: 302 Moved Temporarily`（`pending_update_count` 堆积）

Telegram 要求 Webhook **直接返回 HTTP 200**，不能接受 **302**。

**原因 A（部署）**：Web 应用选成了「以访问网页的用户身份执行」/ **User accessing the web app**，匿名请求会被 302 到登录。应改为 **Execute as: Me** + **Anyone**（含匿名）。

**原因 B（代码，更常见且与部署无关）**：Google 文档说明，用 **ContentService** 返回内容时，会 **302 重定向到 `script.googleusercontent.com`** 再展示结果；Telegram **不跟随**该重定向，就会报 302 错。本项目 [gas/Code.gs](gas/Code.gs) 已改为用 **HtmlService** 通过 `webhookResponse_()` 返回 `ok`，请把最新代码粘贴进 Apps Script 并 **新版本部署**。

部署检查清单：

1. **部署 → 管理部署 → 编辑 → 新版本**。
2. **执行身份**：**我 / Me**。
3. **访问权限**：**任何人 / Anyone**（匿名）。
4. 再执行 **`setWebhook`**（`/exec` URL 不变亦可）。
5. 用 `getWebhookInfo` 查看 **`last_error_message`** 与 **`pending_update_count`**；必要时 **`deleteWebhook`** 再 **`setWebhook`**。

若仍 302 且使用 **Google Workspace**，可能是组织策略限制匿名访问 Web 应用，需管理员调整或改用中间层转发 POST。
