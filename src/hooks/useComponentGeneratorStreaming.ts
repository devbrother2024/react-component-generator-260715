import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { STORAGE_KEY } from './useComponentGenerator';

const MAX_HISTORY = 20;

function persistComponents(components: GeneratedComponent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
  } catch {
    // 저장 공간 부족, 프라이빗 브라우징 등으로 실패해도 메모리 상태만으로 계속 동작한다.
  }
}

interface UseComponentGeneratorStreamingReturn {
  components: GeneratedComponent[];
  streamingCode: string;
  isLoading: boolean;
  error: string | null;
  generateStream: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  clearAll: () => void;
}

export function useComponentGeneratorStreaming(): UseComponentGeneratorStreamingReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>([]);
  const [streamingCode, setStreamingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    persistComponents(components);
  }, [components]);

  const generateStream = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);
    setStreamingCode('');

    try {
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate component');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let code = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        code += chunk;
        setStreamingCode(code);
      }

      // 스트림 완료 후 완성된 컴포넌트 저장
      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code,
        createdAt: new Date(),
      };

      setComponents((prev) => {
        const next = [newComponent, ...prev].slice(0, MAX_HISTORY);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
    setStreamingCode('');
  }, []);

  return { components, streamingCode, isLoading, error, generateStream, clearAll };
}
