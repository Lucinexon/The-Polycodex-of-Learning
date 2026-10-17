// @ts-check
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('main chat renders saved and fallback avatars without breaking grouping', async ({ page }) => {
  await page.goto(pathToFileURL(resolve(process.cwd(), 'index.html')).href);
  await page.waitForFunction(() => Boolean(window.NetworkEngine?.ChatEngine && window.CodexAvatar));

  const result = await page.evaluate(() => {
    const chat = window.NetworkEngine.ChatEngine;
    const saved = window.CodexAvatar.forName('Saved operator');
    const now = Date.now();
    chat.render([
      { _id: 'saved', u: 'saved-uid', n: 'Saved operator', av: saved, t: 'saved', ts: now },
      { _id: 'legacy', u: 'legacy-uid', n: 'Legacy operator', t: 'legacy', ts: now + 1 },
      { _id: 'grouped', u: 'legacy-uid', n: 'Legacy operator', av: 'malformed', t: 'grouped', ts: now + 2 }
    ]);
    const log = document.querySelector('#chatLog');
    return {
      avatarCount: log.querySelectorAll('.cm:not(.grp) .cav svg').length,
      placeholderCount: log.querySelectorAll('.cm.grp .cav.sp').length,
      savedCode: chat.avatarFor({ u: 'saved-uid', n: 'Saved operator', av: saved }),
      fallbackCode: chat.avatarFor({ u: 'fallback-uid', n: 'Fallback operator', av: '' }),
      fallbackExpected: window.CodexAvatar.forName('Fallback operator')
    };
  });

  expect(result.avatarCount).toBe(2);
  expect(result.placeholderCount).toBe(1);
  expect(result.savedCode).not.toBe('');
  expect(result.fallbackCode).toBe(result.fallbackExpected);
});
