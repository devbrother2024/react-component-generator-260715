import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useComponentGeneratorStreaming } from './useComponentGeneratorStreaming';

describe('useComponentGeneratorStreaming', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('스트림 청크를 받으면 코드를 점진적으로 누적한다', async () => {
    const chunks = [
      'const Hello = () => ',
      '(\n  <div>Hi</div>\n',
      ');\n\nrender(<Hello />);',
    ];
    let chunkIndex = 0;

    const mockBody = {
      getReader: () => ({
        read: async () => {
          if (chunkIndex >= chunks.length) {
            return { done: true };
          }
          const chunk = chunks[chunkIndex];
          chunkIndex++;
          return {
            done: false,
            value: new TextEncoder().encode(chunk),
          };
        },
      }),
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockBody,
    } as unknown as Response);

    const { result } = renderHook(() => useComponentGeneratorStreaming());

    await act(async () => {
      await result.current.generateStream('간단한 컴포넌트', undefined, 'anthropic');
    });

    expect(result.current.streamingCode).toBe('const Hello = () => (\n  <div>Hi</div>\n);\n\nrender(<Hello />);');
  });

  it('스트림이 완료되면 전체 컴포넌트를 저장한다', async () => {
    const completeCode = 'const App = () => <h1>Done</h1>;\nrender(<App />);';

    const mockBody = {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(completeCode),
          })
          .mockResolvedValueOnce({ done: true }),
      }),
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockBody,
    } as unknown as Response);

    const { result } = renderHook(() => useComponentGeneratorStreaming());

    await act(async () => {
      await result.current.generateStream('컴포넌트', undefined, 'anthropic');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].code).toBe(completeCode);
  });

  it('스트림 에러 발생 시 에러 상태를 설정한다', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network failed'));

    const { result } = renderHook(() => useComponentGeneratorStreaming());

    await act(async () => {
      await result.current.generateStream('테스트', undefined, 'anthropic');
    });

    expect(result.current.error).toBe('Network failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('스트림 중 읽기 오류가 발생하면 처리한다', async () => {
    const mockBody = {
      getReader: () => ({
        read: vi.fn().mockRejectedValue(new Error('Read error')),
      }),
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockBody,
    } as unknown as Response);

    const { result } = renderHook(() => useComponentGeneratorStreaming());

    await act(async () => {
      await result.current.generateStream('테스트', undefined, 'anthropic');
    });

    expect(result.current.error).toBe('Read error');
    expect(result.current.isLoading).toBe(false);
  });
});
