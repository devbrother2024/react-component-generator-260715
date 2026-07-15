import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';

const STORAGE_KEY = 'react-component-generator:history';
const MAX_HISTORY = 20;

function loadStoredComponents(): GeneratedComponent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Array<Omit<GeneratedComponent, 'createdAt'> & { createdAt: string }>;
    if (!Array.isArray(parsed)) return [];

    return parsed.map((c) => ({ ...c, createdAt: new Date(c.createdAt) }));
  } catch {
    return [];
  }
}

function persistComponents(components: GeneratedComponent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
  } catch {
    // 저장 공간 부족, 프라이빗 브라우징 등으로 실패해도 메모리 상태만으로 계속 동작한다.
  }
}

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(loadStoredComponents);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: data.code,
        createdAt: new Date(),
      };

      setComponents((prev) => {
        const next = [newComponent, ...prev].slice(0, MAX_HISTORY);
        persistComponents(next);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistComponents(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
    persistComponents([]);
  }, []);

  return { components, isLoading, error, generate, removeComponent, clearAll };
}
