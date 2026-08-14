# platform.deepseek.com 私有 API 协议

> 与官方「用量信息」页面同源同口径。所有请求带 `Authorization: Bearer <userToken>`，
> 附带头：`x-app-version: 1.0.0`、`Origin: https://platform.deepseek.com`、
> `Referer: https://platform.deepseek.com/usage`。
> 响应包壳统一为 `{code:0, msg:"", data:{biz_code:0, biz_msg:"", biz_data:...}}`。

## 余额与累计消费

```
GET /api/v0/users/get_user_summary
```

`biz_data`:
- `normal_wallets[]`: `{currency, balance}` — 充值余额（USD / CNY）
- `bonus_wallets[]`: `{currency, balance}` — 赠送余额
- `total_costs[]`: `{currency, amount}` — 历史累计消费

## 用量分桶（核心，实时）

```
GET /api/v0/usage/by_api_key/amount?start=<ts>&end=<ts>&tz=28800
GET /api/v0/usage/by_api_key/cost?start=<ts>&end=<ts>&tz=28800
```

- `start` / `end`: GMT+8 秒级时间戳（如 2026-08-14 00:00 +08:00 = 1786636800）
- `tz=28800`: GMT+8 偏移，决定分桶边界
- `bucket` 自动粒度：范围 > 1 天 → 86400（天级）；单日范围 → 3600（小时级，实时）

`amount` 的 `biz_data`:

```
{
  start, end, bucket,
  models: ["deepseek-chat & deepseek-reasoner", "deepseek-v4-flash", "deepseek-v4-pro"],
  series: [{
    api_key: { tracking_id, name, sensitive_id, valid },
    model: "...",
    buckets: [{ time, usage: { RESPONSE_TOKEN, REQUEST, PROMPT_CACHE_HIT_TOKEN, PROMPT_CACHE_MISS_TOKEN } }]
  }]
}
```

`cost` 的 `biz_data`（数组，按货币）：

```
[{
  currency: "CNY",           // 或 USD
  series: [{ api_key, model, buckets: [{ time, cost: "1.5270522000000000" }] }]
}]
```

### 官方页面「今天」的请求方式

```
start = 今天 00:00 GMT+8 时间戳
end   = 明天 00:00 GMT+8 时间戳
→ bucket = 3600，24 个（或到当前小时）小时桶，实时累计
```

## 注意事项

- 旧接口 `GET /api/v0/usage/amount|cost?month=&year=` 的 `days[]` 数组对**当天**数据
  滞后数小时（约 6 小时），历史日期正常；且其 REQUEST 口径与页面有约 2% 偏差。
  因此「今日」数据应使用 `by_api_key` 单日（小时级）接口。
- `by_api_key` 响应按 API Key 拆分（`series[].api_key.name` / `sensitive_id`），
  页面「全部」筛选即所有 series 求和；可按需按 key 过滤展示。
- bucket `time` 转 GMT+8 日期：`new Date((time + 28800) * 1000).toISOString().slice(0, 10)`
- 页面 HTML 在 AWS WAF（CloudFront）后面，headless/脚本直接访问会被 403/202 拦截；
  但 `/api/v0/*` 接口本身带 Bearer 即可访问，不受 WAF 挑战限制。

## userToken 说明

`userToken` 是平台 Web 登录态，存于 localStorage（键 `userToken`，JSON 的 `value` 字段）。
它是敏感凭据：仅用于自己账号的监控，请勿提交到任何公开仓库。
