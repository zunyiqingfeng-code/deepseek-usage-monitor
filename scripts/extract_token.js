// 从 Chrome localStorage leveldb 提取 platform.deepseek.com 的 userToken
// 用法: node scripts/extract_token.js   （需 npm install leveldown）
// 原理: Chrome 运行中 Cookie 库被独占锁 + App-Bound 加密，但 localStorage 的
//       leveldb 文件可读（snappy 压缩），复制副本后用 leveldown 枚举键。
const leveldown = require('leveldown');
const path = require('path');
const os = require('os');

const base = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'User Data', 'Default');
const src = path.join(base, 'Local Storage', 'leveldb');
const copyDir = path.join(os.tmpdir(), 'ds-token-ldb-' + Date.now());

const fs = require('fs');
fs.mkdirSync(copyDir, { recursive: true });
for (const f of fs.readdirSync(src)) {
  try { fs.copyFileSync(path.join(src, f), path.join(copyDir, f)); } catch (e) { /* skip locked */ }
}

const db = leveldown(copyDir);
db.open({ createIfMissing: false }, (err) => {
  if (err) { console.error('open failed:', err.message); process.exit(1); }
  const it = db.iterator({ keyAsBuffer: true, valueAsBuffer: true });
  const next = () => {
    it.next((e, key, value) => {
      if (e || key === undefined) return finish();
      const k = key.toString('latin1');
      if (k.includes('platform.deepseek.com') && k.includes('userToken')) {
        let v = '';
        try { v = value.toString('utf8'); } catch (e2) { v = value.toString('latin1'); }
        const m = /"value"\s*:\s*"([^"]+)"/.exec(v);
        if (m) {
          console.log('读取到 userToken: ' + m[1]);
          console.log('在 DSH 面板点击「更新Token」粘贴该值即可。');
        } else {
          console.log('找到 userToken 键但解析失败: ' + v.slice(0, 120));
        }
      }
      next();
    });
  };
  const finish = () => {
    it.end(() => {
      db.close(() => {
        fs.rmSync(copyDir, { recursive: true, force: true });
        process.exit(0);
      });
    });
  };
  next();
});
