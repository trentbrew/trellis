/**
 * DevTools LLM provider bridge tests.
 */

import { describe, it, expect } from 'vitest';
import { createDevtoolsLLMProvider } from '../../src/llm/devtools-provider.js';
import type {
  LLMProvider,
  LLMCompletionResponse,
  LLMMessage,
} from '../../src/llm/types.js';

class StubDevtoolsProvider implements LLMProvider {
  id = 'stub-devtools';
  name = 'Stub';

  async complete(): Promise<LLMCompletionResponse> {
    return {
      id: 'stub-1',
      model: 'stub',
      choices: [
        {
          message: { role: 'assistant', content: 'ok' },
          finish_reason: 'stop',
        },
      ],
    };
  }

  async *stream() {
    yield { id: '1', choices: [{ delta: {}, finish_reason: 'stop' }] };
  }
}

describe('createDevtoolsLLMProvider', () => {
  it('wraps an injected DevTools factory', async () => {
    const provider = await createDevtoolsLLMProvider({
      importCreateLLMProvider: async () => ({
        createLLMProvider: () => new StubDevtoolsProvider(),
      }),
    });

    const res = await provider.complete([
      { role: 'user', content: 'ping' } as LLMMessage,
    ]);
    expect(res.choices[0].message.content).toBe('ok');
    expect(provider.id).toBe('stub-devtools');
  });
});
