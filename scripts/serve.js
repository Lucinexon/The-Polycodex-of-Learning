#!/usr/bin/env node
/* Dependency-free static server for local development, the perf harness and
   Playwright. Usage: node scripts/serve.js [port] */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var zlib = require('zlib');

var root = path.resolve(__dirname, '..');
var port = Number(process.argv[2] || process.env.PORT || 4173);
var types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

var gzipCache = {};

function send(res, code, body, type, cache, encoding) {
  var headers = {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': cache || 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Accept-Encoding'
  };
  if (encoding) headers['Content-Encoding'] = encoding;
  res.writeHead(code, headers);
  res.end(body);
}

http.createServer(function (req, res) {
  var parsed;
  try { parsed = url.parse(req.url); } catch (e) { send(res, 400, 'Bad request'); return; }
  var pathname = decodeURIComponent(parsed.pathname || '/');
  if (pathname === '/') pathname = '/index.html';
  var file = path.join(root, pathname);
  if (path.relative(root, file).startsWith('..')) { send(res, 403, 'Forbidden'); return; }
  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) { send(res, 404, 'Not found'); return; }
    fs.readFile(file, function (readErr, data) {
      if (readErr) { send(res, 500, 'Read error'); return; }
      var ext = path.extname(file).toLowerCase();
      var cache = /^\.(js|css|woff2?|svg|png|webp|ico|json)$/.test(ext) ? 'public, max-age=300' : 'no-store';
      var compressible = /^\.(html|js|mjs|css|json|svg|md)$/.test(ext);
      var acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
      if (compressible && acceptsGzip && data.length > 512) {
        var gzipKey = file + '|' + stat.mtimeMs + '|' + stat.size;
        if (gzipCache[gzipKey]) {
          send(res, 200, gzipCache[gzipKey], types[ext] || 'application/octet-stream', cache, 'gzip');
          return;
        }
        zlib.gzip(data, function (gzErr, packed) {
          if (gzErr) { send(res, 200, data, types[ext] || 'application/octet-stream', cache); return; }
          gzipCache[gzipKey] = packed;
          send(res, 200, packed, types[ext] || 'application/octet-stream', cache, 'gzip');
        });
        return;
      }
      send(res, 200, data, types[ext] || 'application/octet-stream', cache);
    });
  });
}).listen(port, '127.0.0.1', function () {
  process.stdout.write('Polycodex dev server: http://127.0.0.1:' + port + '/app.html\n');
});
