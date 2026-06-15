/* ============================================
   文俊影视 - 本地代理服务器
   解决CORS问题：代理所有API请求 + 提供静态文件
   ============================================ */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4567;
const STATIC_DIR = __dirname;

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// API 代理配置
const PROXY_RULES = [
  { prefix: '/api/vod/',   target: 'https://suoniapi.com/api.php/provide/vod/' },
  { prefix: '/api/search/', target: 'https://hhzyapi.com/api.php/provide/vod/' },
  { prefix: '/api/drama',  target: 'https://www.duanju.click/api/short/baidu' }
];

function proxyRequest(targetBase, reqPath, reqQuery, method, res) {
  const targetUrl = targetBase + reqPath + (reqQuery ? '?' + reqQuery : '');
  console.log('  [PROXY]', method, targetUrl.slice(0, 120));
  
  const parsed = url.parse(targetUrl);
  const opts = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: method,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'WenJunVideo/1.0',
      'Accept-Encoding': 'identity'
    },
    rejectUnauthorized: false
  };

  const proxyReq = https.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error('  [ERROR]', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ code: -1, msg: '代理请求失败: ' + e.message, list: [] }));
  });

  proxyReq.end();
}

function serveStatic(reqPath, res) {
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(STATIC_DIR, reqPath);
  
  // 安全检查
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // CORS预检
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    res.end();
    return;
  }

  // 代理API请求
  for (const rule of PROXY_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      // 处理前缀匹配：/api/drama 或 /api/drama/xxx → subPath
      let subPath = pathname.slice(rule.prefix.length);
      if (subPath.startsWith('/')) subPath = subPath.slice(1);
      proxyRequest(rule.target, subPath, parsed.query || '', req.method, res);
      return;
    }
  }

  // 静态文件
  serveStatic(pathname, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🎬 文俊影视 - 代理服务器         ║');
  console.log('║   地址: http://localhost:' + PORT + '         ║');
  console.log('║   VOD代理: /api/vod/ → suoniapi     ║');
  console.log('║   短剧代理: /api/drama/ → duanju.click ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});
