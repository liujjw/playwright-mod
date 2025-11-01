/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from '../../sdk/bundle';
import { defineTabTool } from './tool';

const DEFAULT_DETECT_TIMEOUT_MS = 10_000;

const solveCaptchaSample = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_solve_captcha_sample',
    title: 'Wait for captcha solver (sample)',
    description: 'Waits for Captcha.waitForSolve CDP command to detect and solve a captcha on the current page.',
    inputSchema: z.object({
      detectTimeout: z.number().optional().describe('Milliseconds to wait for captcha detection before timing out. Defaults to 10000.'),
    }),
    type: 'action',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const detectTimeout = params.detectTimeout ?? DEFAULT_DETECT_TIMEOUT_MS;
    response.addCode(`const client = await page.context().newCDPSession(page);`);
    response.addCode(`const { status } = await client.send('Captcha.waitForSolve', {`);
    response.addCode(`  detectTimeout: ${detectTimeout},`);
    response.addCode(`});`);
    response.addCode(`console.log('Captcha status:', status);`);

    await tab.waitForCompletion(async () => {
      const browserContext = tab.page.context() as { newCDPSession?: (page: unknown) => Promise<any> };
      if (!browserContext.newCDPSession)
        throw new Error('Captcha solver requires a Chromium-based browser with CDP support.');

      const client = await browserContext.newCDPSession(tab.page);
      try {
        const result = await client.send('Captcha.waitForSolve', { detectTimeout });
        const status = typeof result?.status === 'string' ? result.status : 'unknown';
        response.addResult(`Captcha status: ${status}`);
      } finally {
        if (typeof client.detach === 'function') {
          try {
            await client.detach();
          } catch {
            // Swallow detach errors to avoid masking the original result.
          }
        }
      }
    });
  },
});

export default [
  solveCaptchaSample,
];
