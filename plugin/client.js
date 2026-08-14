// DeepSeek 用量监控 - Client 半
// DSH 动态 Cordis 插件 Client 代码（plain JavaScript + React.createElement，无 JSX）
// 注册两个 UI：右侧悬浮面板（shell.overlay）+ 侧边栏底部开关（sidebar.footer.action）
return {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    styles.insert(`
.dsu-root{font-family:inherit;color:var(--dsw-alias-label-primary);background:transparent;padding:10px 12px;box-sizing:border-box}
.dsu-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap}
.dsu-title{font-weight:650;font-size:13px}
.dsu-head-actions{display:flex;align-items:center;gap:8px}
.dsu-btn{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 9px;font-size:11px;cursor:pointer}
.dsu-btn:disabled{opacity:.5;cursor:default}
.dsu-link{background:none;border:none;color:var(--dsw-alias-brand-primary);font-size:11px;cursor:pointer;padding:0;text-decoration:underline}
.dsu-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:7px;margin-bottom:8px}
.dsu-card{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:7px 9px}
.dsu-label{font-size:10px;color:var(--dsw-alias-label-secondary)}
.dsu-value{font-size:15px;font-weight:650;margin-top:2px;line-height:1.3}
.dsu-sub{font-size:10px;color:var(--dsw-alias-label-secondary)}
.dsu-err{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);color:var(--dsw-alias-state-error-primary);border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);border-radius:8px;padding:7px 9px;font-size:11px;margin-bottom:8px}
.dsu-err small{display:block;margin-top:4px;opacity:.75;word-break:break-all}
.dsu-sec{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);margin:8px 0 5px}
.dsu-bars{display:flex;align-items:flex-end;gap:6px;height:52px}
.dsu-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px}
.dsu-bar{width:100%;background:var(--dsw-alias-brand-primary);border-radius:3px 3px 0 0;opacity:.85}
.dsu-bar-day{font-size:9px;color:var(--dsw-alias-label-secondary)}
.dsu-row{display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px dashed var(--dsw-alias-border-l1);font-size:11px;gap:8px}
.dsu-row:last-child{border-bottom:none}
.dsu-mname{color:var(--dsw-alias-label-primary);word-break:break-all}
.dsu-mnum{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dsu-foot{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.dsu-token-edit{display:flex;gap:7px;align-items:center;margin-top:7px;width:100%;flex-wrap:wrap}
.dsu-input{flex:1;min-width:180px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px;font-size:11px}
.dsu-overlay{position:fixed;z-index:10;pointer-events:auto;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 10px 36px rgba(0,0,0,.25);font-family:inherit;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;overflow:hidden}
.dsu-body{overflow:auto;flex:1;min-height:0}
.dsu-drag{cursor:move;user-select:none;-webkit-user-select:none}
.dsu-resize{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 52%,var(--dsw-alias-label-secondary) 52%,var(--dsw-alias-label-secondary) 62%,transparent 62%);opacity:.55;border-bottom-right-radius:11px}
.dsu-resize:hover{opacity:1}
.dsu-mini{position:fixed;z-index:10;pointer-events:auto;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;cursor:pointer;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:12px;color:var(--dsw-alias-label-primary);white-space:nowrap;user-select:none;-webkit-user-select:none}
.dsu-mini:hover{background:var(--dsw-alias-bg-layer-2)}
.dsu-close{background:none;border:none;color:var(--dsw-alias-label-secondary);font-size:13px;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1}
.dsu-close:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dsu-hint{font-size:9px;color:var(--dsw-alias-label-secondary);text-align:right;margin-top:6px}
.dsu-toggle{display:inline-flex;align-items:center;gap:5px;background:transparent;border:none;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer;padding:6px 8px;border-radius:6px;white-space:nowrap}
.dsu-toggle:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
`)

    const store = { open: true, listeners: [] }
    function subscribe(fn) {
      store.listeners.push(fn)
      return () => { store.listeners = store.listeners.filter((x) => x !== fn) }
    }
    function setOpen(v) {
      store.open = v
      store.listeners.slice().forEach((fn) => fn())
    }

    const POS_KEY = 'dsum.panel.v1'
    const panelState = { right: 12, top: 12, w: 352, h: 0, min: false }
    try {
      const raw = window.localStorage.getItem(POS_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.right === 'number') panelState.right = p.right
        if (typeof p.top === 'number') panelState.top = p.top
        if (typeof p.w === 'number') panelState.w = p.w
        if (typeof p.h === 'number') panelState.h = p.h
        if (typeof p.min === 'boolean') panelState.min = p.min
      }
    } catch (e) { /* ignore */ }
    function saveState() {
      try { window.localStorage.setItem(POS_KEY, JSON.stringify(panelState)) } catch (e) { /* ignore */ }
    }

    function fmtInt(n) {
      if (n == null || isNaN(n)) return '—'
      return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
    function fmtTokens(n) {
      if (n == null || isNaN(n)) return '—'
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
      return String(Math.round(n))
    }
    function fmtMoney(n, cur) {
      if (n == null || isNaN(n)) return '—'
      const sign = n < 0 ? '-' : ''
      return (cur === 'USD' ? '$' : '¥') + sign + Math.abs(n).toFixed(2)
    }

    function DashboardBody(props) {
      const [snap, setSnap] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [nowMs, setNowMs] = React.useState(Date.now())
      const [receivedAt, setReceivedAt] = React.useState(0)
      const [showToken, setShowToken] = React.useState(false)
      const [tokenInput, setTokenInput] = React.useState('')
      const [tokenMsg, setTokenMsg] = React.useState('')

      const load = async (silent) => {
        if (!silent) setBusy(true)
        try {
          const s = await host.call(silent ? 'snapshot' : 'refresh')
          setSnap(s)
          setReceivedAt(Date.now())
          setError(s && s.error ? s.error : null)
        } catch (e) {
          setError(String((e && e.message) || e))
        } finally {
          setBusy(false)
        }
      }

      React.useEffect(() => {
        void load(false)
        const t1 = ctx.interval(() => setNowMs(Date.now()), 1000)
        const t2 = ctx.interval(() => { void load(true) }, 30000)
        return () => { t1(); t2() }
      }, [])

      if (!snap && !error) {
        return React.createElement('div', { className: 'dsu-root' },
          React.createElement('div', { className: 'dsu-title' }, 'DeepSeek 用量监控'),
          React.createElement('div', { className: 'dsu-sub' }, '加载中…'))
      }

      const countdown = receivedAt ? Math.max(0, 30 - Math.floor((nowMs - receivedAt) / 1000)) : 0
      const week = (snap && snap.week) || []
      const maxCost = week.reduce((s, d) => Math.max(s, d.cost || 0), 0) || 1
      const bars = week.map((d) => React.createElement('div', {
        key: d.date,
        className: 'dsu-bar-col',
        title: d.date + ' 消费 ' + fmtMoney(d.cost, 'CNY') + ' · Tokens ' + fmtTokens(d.tokens) + ' · 请求 ' + fmtInt(d.requests),
      },
        React.createElement('div', { className: 'dsu-bar', style: { height: Math.max(2, Math.round(((d.cost || 0) / maxCost) * 34)) + 'px' } }),
        React.createElement('div', { className: 'dsu-bar-day' }, d.date.slice(5))))

      const models = (snap && snap.month && snap.month.models) || []
      const modelRows = models.map((m) => React.createElement('div', { key: m.name, className: 'dsu-row' },
        React.createElement('span', { className: 'dsu-mname' }, m.name),
        React.createElement('span', { className: 'dsu-mnum' }, fmtInt(m.requests) + ' 次 · ' + fmtTokens(m.tokens) + ' · ' + fmtMoney(m.cost, 'CNY'))))

      const stat = (label, value, sub) => React.createElement('div', { className: 'dsu-card' },
        React.createElement('div', { className: 'dsu-label' }, label),
        React.createElement('div', { className: 'dsu-value' }, value),
        sub ? React.createElement('div', { className: 'dsu-sub' }, sub) : null)

      const timeText = receivedAt ? new Date(receivedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '—'
      const diag = (snap && snap.diag) || null

      return React.createElement('div', { className: 'dsu-root' },
        React.createElement('div', { className: 'dsu-head dsu-drag', onPointerDown: props.onDragStart },
          React.createElement('span', { className: 'dsu-title' }, 'DeepSeek 用量监控'),
          React.createElement('div', { className: 'dsu-head-actions' },
            React.createElement('button', { className: 'dsu-btn', disabled: busy, onClick: () => { void load(false) } }, busy ? '刷新中…' : '刷新'),
            React.createElement('span', { className: 'dsu-sub' }, '自动 ' + countdown + 's'),
            React.createElement('button', { className: 'dsu-close', title: '最小化为胶囊', onClick: () => props.onMinimize() }, '–'),
            React.createElement('button', { className: 'dsu-close', title: '收起面板', onClick: () => props.onClose() }, '✕'))),
        error ? React.createElement('div', { className: 'dsu-err' }, '⚠ ' + error,
          diag ? React.createElement('small', null, '诊断: runner=' + diag.runner + ' policy=' + diag.policy + ' 尝试=' + diag.attempts + ' 末次=' + (diag.lastAt || 0)) : null) : null,
        React.createElement('div', { className: 'dsu-grid' },
          stat('充值余额', fmtMoney(snap && snap.balance && snap.balance.cny, 'CNY'),
            'USD ' + fmtMoney(snap && snap.balance && snap.balance.usd, 'USD') + (snap && snap.balance && snap.balance.bonus ? ' · 赠送 ' + fmtMoney(snap.balance.bonus, 'USD') : '')),
          stat('累计消费', fmtMoney(snap && snap.totalCost && snap.totalCost.cny, 'CNY'),
            'USD ' + fmtMoney(snap && snap.totalCost && snap.totalCost.usd, 'USD')),
          stat('本月消费 (' + ((snap && snap.monthLabel) || '—') + ')', fmtMoney(snap && snap.month && snap.month.cost, 'CNY')),
          stat('本月请求', fmtInt(snap && snap.month && snap.month.requests)),
          stat('本月 Tokens', fmtTokens(snap && snap.month && snap.month.tokens)),
          stat('今日消费', fmtMoney(snap && snap.today && snap.today.cost, 'CNY'), snap && snap.today ? snap.today.date : null),
          stat('今日请求', fmtInt(snap && snap.today && snap.today.requests)),
          stat('今日 Tokens', fmtTokens(snap && snap.today && snap.today.tokens))),
        React.createElement('div', { className: 'dsu-sec' }, '近 7 天消费 (CNY)'),
        React.createElement('div', { className: 'dsu-bars' }, bars),
        models.length ? React.createElement('div', { className: 'dsu-sec' }, '本月模型分布') : null,
        models.length ? React.createElement('div', null, modelRows) : null,
        React.createElement('div', { className: 'dsu-foot' },
          React.createElement('span', { className: 'dsu-sub' }, '更新于 ' + timeText + ' · 延迟约 5 分钟'),
          React.createElement('span', { className: 'dsu-sub' }, 'Token: ' + ((snap && snap.tokenMasked) || '—')),
          React.createElement('button', { className: 'dsu-link', onClick: () => setShowToken(!showToken) }, showToken ? '收起' : '更新Token')),
        showToken ? React.createElement('div', { className: 'dsu-token-edit' },
          React.createElement('input', {
            className: 'dsu-input',
            value: tokenInput,
            placeholder: '粘贴新的 userToken（localStorage → userToken → value）',
            onChange: (e) => { setTokenInput(e.target.value); setTokenMsg('') },
          }),
          React.createElement('button', {
            className: 'dsu-btn',
            onClick: async () => {
              const t = tokenInput.trim()
              if (!t) return
              setTokenMsg('保存中…')
              try {
                const s = await host.call('set-token', { token: t })
                setSnap(s)
                setReceivedAt(Date.now())
                setError(s && s.error ? s.error : null)
                setTokenMsg(s && s.ok ? '已更新' : '已更新，但获取失败')
                setShowToken(false)
                setTokenInput('')
              } catch (e2) {
                setTokenMsg('失败: ' + String((e2 && e2.message) || e2))
              }
            },
          }, '保存'),
          React.createElement('span', { className: 'dsu-sub' }, tokenMsg)) : null,
        React.createElement('div', { className: 'dsu-hint' }, '拖动标题栏移动 · 右下角缩放 · – 最小化'))
    }

    function UsageToggle(ownerProps) {
      const [open, setOpenState] = React.useState(store.open)
      React.useEffect(() => subscribe(() => setOpenState(store.open)), [])
      return React.createElement('button', {
        className: 'dsu-toggle',
        title: 'DeepSeek 用量监控（点击' + (open ? '收起' : '展开') + '）',
        onClick: () => setOpen(!open),
      },
        React.createElement('span', null, '📊'),
        ownerProps.wide ? React.createElement('span', null, '用量') : null)
    }

    function UsagePanel() {
      const [open, setOpenState] = React.useState(store.open)
      const [pos, setPos] = React.useState({ right: panelState.right, top: panelState.top })
      const [size, setSize] = React.useState({ w: panelState.w, h: panelState.h })
      const [minimized, setMinimized] = React.useState(panelState.min)
      React.useEffect(() => subscribe(() => setOpenState(store.open)), [])
      if (!open) return null

      const drag = { on: false, startX: 0, startY: 0, origRight: 0, origTop: 0, moved: 0 }
      function onDragStart(e) {
        if (e.target.closest && e.target.closest('button, input')) return
        drag.on = true
        drag.moved = 0
        drag.startX = e.clientX
        drag.startY = e.clientY
        drag.origRight = panelState.right
        drag.origTop = panelState.top
        const move = (ev) => {
          if (!drag.on) return
          const dx = ev.clientX - drag.startX
          const dy = ev.clientY - drag.startY
          drag.moved = Math.max(drag.moved, Math.abs(dx), Math.abs(dy))
          const w = minimized ? 190 : panelState.w
          const right = Math.max(8, Math.min(window.innerWidth - w - 8, drag.origRight - dx))
          const top = Math.max(8, Math.min(window.innerHeight - 48, drag.origTop + dy))
          panelState.right = right
          panelState.top = top
          setPos({ right, top })
        }
        const up = () => {
          drag.on = false
          document.removeEventListener('pointermove', move)
          document.removeEventListener('pointerup', up)
          saveState()
        }
        document.addEventListener('pointermove', move)
        document.addEventListener('pointerup', up)
        e.preventDefault()
      }

      const resize = { on: false, startX: 0, startY: 0, origW: 0, origH: 0 }
      function onResizeDown(e) {
        resize.on = true
        resize.startX = e.clientX
        resize.startY = e.clientY
        resize.origW = panelState.w
        resize.origH = panelState.h || 560
        const move = (ev) => {
          if (!resize.on) return
          const w = Math.max(280, Math.min(window.innerWidth - panelState.right - 16, resize.origW + (ev.clientX - resize.startX)))
          const h = Math.max(300, Math.min(window.innerHeight - panelState.top - 16, resize.origH + (ev.clientY - resize.startY)))
          panelState.w = w
          panelState.h = h
          setSize({ w, h })
        }
        const up = () => {
          resize.on = false
          document.removeEventListener('pointermove', move)
          document.removeEventListener('pointerup', up)
          saveState()
        }
        document.addEventListener('pointermove', move)
        document.addEventListener('pointerup', up)
        e.preventDefault()
        e.stopPropagation()
      }

      if (minimized) {
        return React.createElement('div', {
          className: 'dsu-mini',
          style: { right: pos.right + 'px', top: pos.top + 'px' },
          title: '点击展开 DeepSeek 用量监控',
          onPointerDown: onDragStart,
          onClick: (e) => {
            if (drag.moved > 6) return
            panelState.min = false
            setMinimized(false)
            saveState()
          },
        },
          React.createElement('span', null, '📊'),
          React.createElement('span', null, 'DeepSeek 用量监控'),
          React.createElement('span', { className: 'dsu-sub' }, '· 点击展开'))
      }

      const style = {
        right: pos.right + 'px',
        top: pos.top + 'px',
        width: size.w + 'px',
        height: size.h ? size.h + 'px' : 'auto',
        maxHeight: size.h ? 'none' : 'calc(100vh - ' + (pos.top + 12) + 'px)',
      }
      return React.createElement('div', { className: 'dsu-overlay', style },
        React.createElement('div', { className: 'dsu-body' },
          React.createElement(DashboardBody, {
            onClose: () => setOpen(false),
            onMinimize: () => { panelState.min = true; setMinimized(true); saveState() },
            onDragStart,
          })),
        React.createElement('div', { className: 'dsu-resize', title: '拖动缩放', onPointerDown: onResizeDown }))
    }

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'dsum-usage-panel', order: 60 },
      (props) => React.createElement(UsagePanel, null),
    ))
    slots.inject('sidebar.footer.action', () => slots.register(
      { name: 'sidebar.footer.action', id: 'dsum-usage-toggle', order: 10 },
      (props) => React.createElement(UsageToggle, props),
    ))
  },
}
