import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4173');
      if (response.ok) return;
    } catch {
      // The preview server has not started yet.
    }
    await delay(250);
  }
  throw new Error('The production preview did not start within 7.5 seconds.');
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(() => localStorage.clear());

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'AI Focus Coach' }).waitFor();
  assert.equal(await page.title(), 'Zenflow AI | Premium Cognitive Focus Workspace');

  await page.getByPlaceholder(/What are your goals/).fill('Ship the Zenflow hackathon submission');
  await page.getByRole('button', { name: 'Generate Focus Roadmap' }).click();
  await page.getByText('Your Focus Path').waitFor();

  await page.keyboard.press('Meta+K');
  await page.getByRole('dialog', { name: 'Command palette' }).waitFor();
  await page.getByLabel('Search commands').fill('task');
  await page.getByRole('button', { name: /Open Holographic Task Board/ }).click();
  await page.getByLabel('New task').fill('Ship browser test');
  await page.getByLabel('New task').press('Enter');
  const addedTask = page.locator('.task-capsule-item', { hasText: 'Ship browser test' });
  await addedTask.waitFor();
  const taskToggle = addedTask.getByRole('checkbox');
  await taskToggle.click();
  assert.equal(await taskToggle.getAttribute('aria-checked'), 'true');

  await page.getByRole('button', { name: 'Wave Focus Timer' }).click();
  await page.getByRole('heading', { name: 'Wave Focus Timer' }).waitFor();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Pause' }).waitFor();
  await page.getByRole('button', { name: 'Pause' }).click();

  await page.getByRole('button', { name: 'Procedural Audio Mixer' }).click();
  await page.getByRole('heading', { name: 'Procedural Synthesizer' }).waitFor();
  const rainSwitch = page.getByLabel('Toggle Procedural Rain');
  await rainSwitch.click();
  assert.equal(await rainSwitch.getAttribute('aria-checked'), 'true');
  await rainSwitch.click();
  assert.equal(await rainSwitch.getAttribute('aria-checked'), 'false');

  await page.getByRole('button', { name: 'Focus Statistics' }).click();
  await page.getByRole('heading', { name: 'Focus Statistics' }).waitFor();
  await page.getByTitle('System settings').click();
  await page.getByLabel('AI provider API key').waitFor();

  await page.locator('button[aria-label="Widget grid"]').click();
  assert.equal(await page.getByRole('heading', { name: 'AI Focus Coach' }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Wave Focus Timer' }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Procedural Synthesizer' }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Holographic Task Board' }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Focus Statistics' }).count(), 1);

  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  await browser.close();
  console.log('Browser smoke test passed.');
} finally {
  server.kill('SIGTERM');
}
