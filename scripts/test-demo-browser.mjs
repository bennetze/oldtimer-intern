// Disposable static browser harness. No instrumentation is shipped in index.html.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = await mkdtemp(join(tmpdir(), 'oldtimer-demo-test-'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/result') {
      if (req.headers.origin !== `http://127.0.0.1:${server.address().port}`) { res.writeHead(403); res.end(); return; }
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 10 * 1024 ** 2) throw new Error('Oversized test artifact'); chunks.push(chunk); }
      const data = Buffer.concat(chunks);
      await writeFile(join(output, 'results.json'), data);
      if (req.url === '/result') console.log(data.toString());
      res.end('ok'); return;
    }
    if (req.url === '/test') {
      res.setHeader('Content-Type', types['.html']);
      res.end('<!doctype html><meta charset="utf-8"><title>Demo browser regressions</title><pre id="results">Running…</pre><iframe id="editor" src="/oldtimer-intern/" style="width:1440px;height:900px"></iframe><script src="/cases.js"></script>'); return;
    }
    const relative = req.url === '/cases.js' ? 'tests/demo-browser-cases.js' : req.url.startsWith('/oldtimer-intern/') ? req.url.slice('/oldtimer-intern/'.length) || 'index.html' : req.url === '/' ? 'index.html' : req.url.slice(1);
    const path = resolve(root, relative);
    if (!path.startsWith(root) || relative.includes('..')) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(path); res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); res.end(bytes);
  } catch (error) { res.writeHead(404); res.end(error.message); }
});
server.listen(Number(process.env.PORT || 8789), '127.0.0.1', () => console.log(`Open http://127.0.0.1:${server.address().port}/test — artifacts: ${output}`));
