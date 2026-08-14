// DeepSeek 用量监控 - Host 半
// DSH 动态 Cordis 插件 Host 代码（plain JavaScript，无 import/TS）
//
// 配置：Token 初始为空，面板激活后点击「更新Token」粘贴 userToken
// （获取方式见 README.md）。Token 仅在进程内存中，不会落盘。
return {
  inject: ['timer'],
  apply(ctx) {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
    const TZ_OFFSET = 28800
    let token = ''
    let snapshot = { ok: false, error: '请先点击「更新Token」粘贴 userToken', fetchedAt: 0, tokenMasked: '未配置', diag: { runner: '?', policy: '?', attempts: 0, lastAt: 0 } }
    let fetching = false
    let attempts = 0
    let lastAt = 0
    let runnerMode = '?'

    function mask(t) {
      return t.length <= 8 ? '****' : t.slice(0, 4) + '…' + t.slice(-3)
    }
    function pad2(n) {
      return String(n).padStart(2, '0')
    }
    function tsUtc8(y, m, d) {
      // GMT+8 零点 = UTC 前日 16:00
      return Math.floor(Date.UTC(y, m - 1, d) / 1000) - TZ_OFFSET
    }
    function dateStrOfBucket(ts) {
      const d = new Date((ts + TZ_OFFSET) * 1000)
      return d.toISOString().slice(0, 10)
    }

    function withTimeout(promise, ms) {
      return new Promise((resolve, reject) => {
        let done = false
        const cancel = ctx.timer.timeout(() => { if (!done) { done = true; reject(new Error('抓取超时（>' + ms + 'ms）')) } }, ms)
        promise.then((v) => { if (!done) { done = true; cancel(); resolve(v) } }, (e) => { if (!done) { done = true; cancel(); reject(e) } })
      })
    }

    // 网络走 ctx.shell 执行 curl.exe。
    // 关键：必须显式传 sandboxPolicy danger-full-access，
    // 否则 Windows 沙箱下管道捕获会 EPERM 导致 run 永不返回。
    function getRunner() {
      const shell = ctx.get('shell')
      if (shell !== undefined) {
        let policy
        try {
          const sp = ctx.get('sandboxPolicy')
          if (sp !== undefined) {
            const base = sp.resolve()
            policy = Object.assign({}, base, { mode: 'danger-full-access' })
          }
        } catch (e) { policy = undefined }
        const policyMode = policy ? policy.mode : 'none'
        return {
          mode: policyMode,
          run: async (command) => {
            const spec = shell.resolve({ command, timeoutMs: 25000, stdoutMaxBytes: 8000000, sandboxPolicy: policy })
            const res = await shell.run(spec)
            if (res.exitCode !== 0) {
              const why = res.stderr && res.stderr.text ? res.stderr.text.slice(0, 300) : ''
              const sfx = res.sandbox && res.sandbox.denied ? ' [sandbox denied]' : ''
              throw new Error('命令失败 exit=' + res.exitCode + ' ' + why + sfx)
            }
            return (res.stdout && res.stdout.text) || ''
          },
        }
      }
      return null
    }

    async function fetchJson(runner, path, params) {
      const q = params ? '?' + params.map((kv) => kv[0] + '=' + kv[1]).join('&') : ''
      const url = 'https://platform.deepseek.com/api/v0' + path + q
      const cmd = 'curl.exe -sS --max-time 15 -w "\\n__HTTP__%{http_code}" '
        + '-H "Authorization: Bearer ' + token + '" '
        + '-H "x-app-version: 1.0.0" -H "Accept: application/json" '
        + '-H "Origin: https://platform.deepseek.com" '
        + '-H "Referer: https://platform.deepseek.com/usage" '
        + '-H "User-Agent: ' + UA + '" "' + url + '"'
      const out = await runner.run(cmd)
      const m = /__HTTP__(\d+)\s*$/.exec(out)
      const status = m ? Number(m[1]) : 0
      const body = m ? out.slice(0, m.index) : out
      if (status >= 400) {
        throw new Error('HTTP ' + status + (status === 401 || status === 403 ? '（登录 token 可能已过期，请点「更新Token」）' : ''))
      }
      let parsed
      try { parsed = JSON.parse(body) } catch (e) {
        throw new Error('响应解析失败: len=' + body.length + ' head=' + body.slice(0, 100).replace(/\s+/g, ' ') + ' tail=' + out.slice(-30).replace(/\s+/g, ' '))
      }
      if (!parsed || parsed.code !== 0) {
        throw new Error('API 错误 code=' + (parsed && parsed.code) + ' msg=' + ((parsed && parsed.msg) || ''))
      }
      return parsed.data && parsed.data.biz_data
    }

    function attachDiag(s) {
      s.diag = { runner: (ctx.get('shell') !== undefined ? 'shell' : 'none'), policy: runnerMode, attempts, lastAt }
      return s
    }

    async function fetchAll() {
      if (fetching) return snapshot
      fetching = true
      attempts += 1
      lastAt = Date.now()
      try {
        if (!token) throw new Error('未配置 Token，请点击「更新Token」粘贴 userToken')
        const runner = getRunner()
        runnerMode = runner ? runner.mode : 'none'
        if (!runner) throw new Error('shell 服务不可用，无法发起请求')
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const day = now.getDate()
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const todayStr = year + '-' + pad2(month) + '-' + pad2(day)
        const monthStart = tsUtc8(year, month, 1)
        const nextMonthStart = tsUtc8(nextYear, nextMonth, 1)
        const todayStart = tsUtc8(year, month, day)
        const tomorrowStart = tsUtc8(year, month, day + 1)
        const tz = TZ_OFFSET
        const [summary, mAmount, mCost, tAmount, tCost] = await withTimeout(Promise.all([
          fetchJson(runner, '/users/get_user_summary'),
          fetchJson(runner, '/usage/by_api_key/amount', [['start', monthStart], ['end', nextMonthStart], ['tz', tz]]),
          fetchJson(runner, '/usage/by_api_key/cost', [['start', monthStart], ['end', nextMonthStart], ['tz', tz]]),
          fetchJson(runner, '/usage/by_api_key/amount', [['start', todayStart], ['end', tomorrowStart], ['tz', tz]]),
          fetchJson(runner, '/usage/by_api_key/cost', [['start', todayStart], ['end', tomorrowStart], ['tz', tz]]),
        ]), 45000)
        const wallets = summary.normal_wallets || []
        const costs = summary.total_costs || []
        const pick = (arr, cur) => {
          const x = (arr || []).find((i) => i.currency === cur)
          return x ? Number(x.balance != null ? x.balance : x.amount) : null
        }
        const bonus = (summary.bonus_wallets || []).find((i) => i.currency === 'USD')
        const dayMap = new Map()
        const modelAgg = new Map()
        for (const s of (mAmount.series || [])) {
          const e = modelAgg.get(s.model) || { name: s.model, requests: 0, tokens: 0, cost: 0 }
          for (const b of (s.buckets || [])) {
            const u = b.usage || {}
            const req = Number(u.REQUEST || 0)
            const tok = Number(u.RESPONSE_TOKEN || 0) + Number(u.PROMPT_CACHE_HIT_TOKEN || 0) + Number(u.PROMPT_CACHE_MISS_TOKEN || 0)
            const date = dateStrOfBucket(b.time)
            const day = dayMap.get(date) || { date, requests: 0, tokens: 0, cost: 0 }
            day.requests += req
            day.tokens += tok
            dayMap.set(date, day)
            e.requests += req
            e.tokens += tok
          }
          modelAgg.set(s.model, e)
        }
        for (const cur of (mCost.data || [])) {
          for (const s of (cur.series || [])) {
            const e = modelAgg.get(s.model) || { name: s.model, requests: 0, tokens: 0, cost: 0 }
            for (const b of (s.buckets || [])) {
              const c = Number(b.cost || 0)
              const date = dateStrOfBucket(b.time)
              const day = dayMap.get(date) || { date, requests: 0, tokens: 0, cost: 0 }
              day.cost += c
              dayMap.set(date, day)
              e.cost += c
            }
            modelAgg.set(s.model, e)
          }
        }
        const models = Array.from(modelAgg.values())
        const monthRequests = models.reduce((s, m) => s + m.requests, 0)
        const monthTokens = models.reduce((s, m) => s + m.tokens, 0)
        const monthCost = models.reduce((s, m) => s + m.cost, 0)
        const dates = Array.from(dayMap.keys()).sort().filter((k) => k <= todayStr)
        const week = dates.slice(-7).map((k) => dayMap.get(k))
        let todayReq = 0, todayTok = 0, todayCost = 0
        for (const s of (tAmount.series || [])) {
          for (const b of (s.buckets || [])) {
            const u = b.usage || {}
            todayReq += Number(u.REQUEST || 0)
            todayTok += Number(u.RESPONSE_TOKEN || 0) + Number(u.PROMPT_CACHE_HIT_TOKEN || 0) + Number(u.PROMPT_CACHE_MISS_TOKEN || 0)
          }
        }
        for (const cur of (tCost.data || [])) {
          for (const s of (cur.series || [])) {
            for (const b of (s.buckets || [])) todayCost += Number(b.cost || 0)
          }
        }
        const today = { date: todayStr, cost: todayCost, requests: todayReq, tokens: todayTok }
        snapshot = attachDiag({
          ok: true,
          error: null,
          fetchedAt: now.getTime(),
          tokenMasked: mask(token),
          monthLabel: year + '-' + pad2(month),
          balance: { usd: pick(wallets, 'USD'), cny: pick(wallets, 'CNY'), bonus: bonus ? Number(bonus.balance) : null },
          totalCost: { usd: pick(costs, 'USD'), cny: pick(costs, 'CNY') },
          month: { cost: monthCost, requests: monthRequests, tokens: monthTokens, models },
          today,
          week,
        })
      } catch (e) {
        snapshot = attachDiag({
          ok: false,
          error: String((e && e.message) || e),
          fetchedAt: Date.now(),
          tokenMasked: mask(token || '未配置'),
          monthLabel: '',
          balance: null,
          totalCost: null,
          month: null,
          today: null,
          week: null,
        })
      } finally {
        fetching = false
      }
      return snapshot
    }

    harness.handle('snapshot', async () => snapshot)
    harness.handle('refresh', async () => fetchAll())
    harness.handle('set-token', async (args) => {
      const t = args && typeof args.token === 'string' ? args.token.trim() : ''
      if (t) {
        token = t
        snapshot = Object.assign({}, snapshot, { tokenMasked: mask(token) })
        await fetchAll()
      }
      return snapshot
    })

    ctx.timer.interval(() => { void fetchAll() }, 60000)
    void fetchAll()
  },
}
