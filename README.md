# DeepSeek 用量监控面板 (deepseek-usage-monitor)

为 [DeepSeek Harness (DSH)](https://platform.deepseek.com) 编写的动态 Cordis 插件：在 Web GUI 里以悬浮全局面板实时展示 DeepSeek 开放平台的用量信息（余额、累计消费、本月/今日消费、API 请求次数、Token 用量、近 7 天消费柱状图、模型分布）。

数据直接来自 platform.deepseek.com 的私有 Web API（与官方「用量信息」页面同源同口径），非页面解析。

## 功能

- 充值余额 / 累计消费（CNY + USD）
- 本月消费 / 请求次数 / Tokens（按模型分布：deepseek-v4-pro / v4-flash / chat & reasoner）
- 今日消费 / 请求次数 / Tokens（小时级实时，与官方页面一致）
- 近 7 天消费柱状图
- 面板可拖动、缩放、最小化为胶囊，位置/大小记忆（localStorage）
- 侧边栏底部快捷开关按钮
- Token 过期时面板内直接粘贴更新（无需改代码）
- 60s 数据轮询 + 30s 界面刷新 + 手动刷新

## 安装

插件是 DSH 的动态 Cordis 插件（会话级，进程内运行）：

1. 在 DSH 会话中通过 `cordis_define` 定义（`plugin.host` 使用 `plugin/host.js`，`plugin.client` 使用 `plugin/client.js`），然后 `cordis_run` 激活。
2. 激活后右侧出现悬浮面板；如果 Token 未配置，面板会提示，点击「更新Token」粘贴你的 userToken。

> 动态插件随 DSH 会话存在，进程重启后需要重新定义运行。

## 获取 userToken

userToken 是 platform.deepseek.com 的登录态（localStorage 存储），用于访问私有 Web API：

方式一（浏览器手动）：
1. 登录 platform.deepseek.com
2. F12 → Application → Local Storage → `https://platform.deepseek.com`
3. 复制键 `userToken` 的值（JSON 的 `value` 字段）

方式二（脚本自动，Windows + Chrome）：
```bash
node scripts/extract_token.js
# 输出: 读取到 userToken: xxxx...
# 需要: npm install leveldown （仅本脚本用）
```

原理：Chrome 新版 Cookie 数据库有 App-Bound 加密无法外部读取，但 localStorage 的 leveldb 明文可读（运行中也能读，只是 snappy 压缩，需要解析）。

## 私有 API 协议

详见 [docs/protocol.md](docs/protocol.md)。

核心接口（`Authorization: Bearer <userToken>`）：

| 接口 | 用途 |
|---|---|
| `GET /api/v0/users/get_user_summary` | 余额、累计消费 |
| `GET /api/v0/usage/by_api_key/amount?start=&end=&tz=` | 用量分桶（天级/小时级，按 API Key × 模型） |
| `GET /api/v0/usage/by_api_key/cost?start=&end=&tz=` | 消费分桶（同上） |

时间参数为 GMT+8 秒级时间戳，`tz=28800`；范围大于 1 天自动按天分桶（86400s），单日按小时分桶（3600s，实时）。

## 免责声明

- 这些是私有 Web API，非官方公开接口，可能随时变更；请仅用于自己账号的用量监控。
- 数据口径与官方页面一致（今日为小时级实时，历史按天）。
- 本项目与 DeepSeek 官方无任何关联。

## 致谢

接口协议参考了 [CodexBar](https://github.com/steipete/CodexBar) 与 [deepseek-usage-monitor](https://github.com/Shiorangerin/deepseek-usage-monitor) 的逆向成果，并进一步通过浏览器抓包确认了官方页面同源的 `by_api_key` 实时接口。

## License

MIT
