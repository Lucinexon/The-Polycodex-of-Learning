#!/usr/bin/env node
/**
 * content-inventory.js — dependency-free inventory of the legacy lesson data.
 *
 * Loads js/data/*.js in a Node vm sandbox (never printing lesson bodies) and
 * writes docs/v10/content-inventory.json with:
 *   id, sector, order index, title, headings, word count, KaTeX/code block
 *   counts, and a SHA-256 of the raw body.
 *
 * Also reports failures for missing/duplicate ids, changed order, empty
 * bodies and unresolved internal references (exit code 1).
 *
 * Usage:
 *   node scripts/content-inventory.js            # write inventory, report
 *   node scripts/content-inventory.js --check    # verify hashes with existing
 *   node scripts/content-inventory.js --summary  # counts only, no file write
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILES = [
  'js/data/sectors-part1.js',
  'js/data/sectors-part2.js',
  'js/data/sectors-part3.js',
];
const OUT = path.join(ROOT, 'docs', 'v10', 'content-inventory.json');
const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const SUMMARY = args.has('--summary');

function loadData() {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  for (const rel of DATA_FILES) {
    const file = path.join(ROOT, rel);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: rel });
  }
  const w = sandbox.window;
  const sectors = [].concat(w.SECTORS_PART1 || [], w.SECTORS_PART2 || [], w.SECTORS_PART3 || []);
  return { sectors, cards: w.CODEX_CARDS || [], masterExam: w.MASTER_EXAM || null, syslog: w.SYSLOG || null };
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ');
}

function stripHtml(s) {
  return decodeEntities(String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' '));
}

function countWords(s) {
  const t = stripHtml(s).trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

function headingsOf(md) {
  const out = [];
  const re = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
  let m;
  while ((m = re.exec(md))) out.push({ level: m[1].length, text: stripHtml(m[2]).trim() });
  const hre = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = hre.exec(md))) out.push({ level: +m[1], text: stripHtml(m[2]).trim() });
  // Legacy lessons also use <summary>Go deeper: …</summary> as a de-facto section.
  const sre = /<summary[^>]*>([\s\S]*?)<\/summary>/gi;
  while ((m = sre.exec(md))) out.push({ level: 3, text: stripHtml(m[1]).trim(), summary: true });
  return out;
}

function countMatches(s, re) {
  const m = String(s).match(re);
  return m ? m.length : 0;
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

function sectorRefs(md) {
  const refs = new Set();
  const re = /data-go="([^"]+)"/g;
  let m;
  while ((m = re.exec(md))) refs.add(m[1]);
  return [...refs];
}

function buildInventory() {
  const { sectors, cards, masterExam, syslog } = loadData();
  const lessons = [];
  const sectorsOut = [];
  const errors = [];
  const seenIds = new Map();
  let order = 0;

  for (const s of sectors) {
    const blocks = Array.isArray(s.blocks) ? s.blocks : [];
    sectorsOut.push({
      id: s.id,
      num: s.num,
      label: s.label,
      title: s.title,
      blockCount: blocks.length,
      quiz: s.quiz ? { title: s.quiz.title || s.title, questionCount: (s.quiz.qs || []).length } : null,
    });
    for (const b of blocks) {
      order += 1;
      const md = String(b.md || '');
      if (seenIds.has(b.id)) errors.push(`duplicate lesson id: ${b.id} (sectors ${seenIds.get(b.id)} and ${s.id})`);
      seenIds.set(b.id, s.id);
      if (!md.trim()) errors.push(`empty body: ${b.id}`);
      const headings = headingsOf(md);
      if (!headings.length) errors.push(`no headings: ${b.id}`);
      lessons.push({
        id: b.id,
        sector: s.id,
        sectorNum: s.num,
        sectorLabel: s.label,
        order,
        title: b.title,
        tags: b.tags || [],
        headings,
        wordCount: countWords(md),
        charCount: md.length,
        katexCount: countMatches(md, /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g),
        codeBlockCount: countMatches(md, /```|~~~/g) / 2,
        detailCount: countMatches(md, /<details\b/gi),
        refs: sectorRefs(md),
        sha256: sha256(md),
      });
    }
  }

  // References must resolve to a sector, a screen or an id in the data set.
  const known = new Set([
    ...sectors.map(s => s.id),
    'home', 'chrono', 'syslog', 'flash', 'exam', 'probes', 'dispatch', 'lobby', 'notebook',
  ]);
  for (const l of lessons) {
    for (const ref of l.refs) {
      if (!known.has(ref) && !seenIds.has(ref)) errors.push(`unresolved reference ${ref} in ${l.id}`);
    }
  }

  const totals = {
    sectors: sectorsOut.length,
    lessons: lessons.length,
    words: lessons.reduce((n, l) => n + l.wordCount, 0),
    katex: lessons.reduce((n, l) => n + l.katexCount, 0),
    codeBlocks: lessons.reduce((n, l) => n + l.codeBlockCount, 0),
    flashcards: cards.length,
    masterExamQuestions: masterExam ? (masterExam.qs || []).length : 0,
  };

  return {
    generatedBy: 'scripts/content-inventory.js',
    schema: 1,
    sourceFiles: DATA_FILES,
    totals,
    errors,
    sectors: sectorsOut,
    lessons,
    extras: {
      flashcards: cards.length,
      masterExam: masterExam ? { title: masterExam.title, questionCount: (masterExam.qs || []).length } : null,
      syslogSections: syslog ? Object.keys(syslog).length : 0,
    },
  };
}

function main() {
  const inv = buildInventory();
  if (SUMMARY) {
    console.log(JSON.stringify({ totals: inv.totals, errors: inv.errors }, null, 2));
    process.exit(inv.errors.length ? 1 : 0);
  }

  if (CHECK) {
    if (!fs.existsSync(OUT)) {
      console.error(`missing ${OUT}; run node scripts/content-inventory.js first`);
      process.exit(1);
    }
    const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const old = new Map((prev.lessons || []).map(l => [l.id, l]));
    const failures = [];
    for (const l of inv.lessons) {
      const p = old.get(l.id);
      if (!p) failures.push(`new lesson ${l.id}`);
      else if (p.sha256 !== l.sha256) failures.push(`body changed: ${l.id}`);
      else if (p.order !== l.order) failures.push(`order changed: ${l.id}`);
    }
    for (const id of old.keys()) if (!inv.lessons.some(l => l.id === id)) failures.push(`removed lesson ${id}`);
    const all = [...inv.errors, ...failures];
    if (all.length) {
      console.error('content-inventory check FAILED:\n - ' + all.join('\n - '));
      console.error('If a change is intentional, record it in docs/v10/content-changes.md and re-run with --write.');
      process.exit(1);
    }
    console.log(`content-inventory OK: ${inv.lessons.length} lessons, hashes and order match.`);
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(inv, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
  console.log(JSON.stringify(inv.totals, null, 2));
  if (inv.errors.length) {
    console.error('integrity errors:\n - ' + inv.errors.join('\n - '));
    process.exit(1);
  }
}

main();
