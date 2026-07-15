import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useComponentGenerator, STORAGE_KEY } from './useComponentGenerator';
import type { GeneratedComponent } from '../types';

function seedStorage(components: unknown[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
}

function readStorage(): Array<Omit<GeneratedComponent, 'createdAt'> & { createdAt: string }> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

describe('useComponentGenerator - localStorage 영속화', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('마운트 시 localStorage에 저장된 히스토리를 복원한다', () => {
    seedStorage([
      { id: '1', prompt: '저장된 프롬프트', code: 'const A = () => null;', createdAt: '2024-01-01T00:00:00.000Z' },
    ]);

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].prompt).toBe('저장된 프롬프트');
    expect(result.current.components[0].createdAt).toBeInstanceOf(Date);
  });

  it('손상된 JSON이 저장돼 있으면 조용히 무시하고 빈 배열로 시작한다', () => {
    localStorage.setItem(STORAGE_KEY, '{ not valid json');

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toEqual([]);
  });

  it('컴포넌트 생성 시 localStorage에 저장된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 'const Hello = () => null;' }),
      }),
    );

    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('안녕 컴포넌트', 'test-key', 'anthropic');
    });

    expect(result.current.components).toHaveLength(1);
    const stored = readStorage();
    expect(stored).toHaveLength(1);
    expect(stored[0].prompt).toBe('안녕 컴포넌트');
  });

  it('히스토리는 최근 20개까지만 유지하고 가장 오래된 항목을 제거한다', async () => {
    const seeded = Array.from({ length: 20 }, (_, i) => ({
      id: `seed-${i}`,
      prompt: `프롬프트 ${i}`,
      code: 'const A = () => null;',
      createdAt: new Date(2024, 0, i + 1).toISOString(),
    }));
    seedStorage(seeded);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 'const New = () => null;' }),
      }),
    );

    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.components).toHaveLength(20);

    await act(async () => {
      await result.current.generate('새 프롬프트', 'test-key', 'anthropic');
    });

    expect(result.current.components).toHaveLength(20);
    expect(result.current.components[0].prompt).toBe('새 프롬프트');
    expect(result.current.components.some((c) => c.id === 'seed-19')).toBe(false);

    const stored = readStorage();
    expect(stored).toHaveLength(20);
  });

  it('removeComponent 호출 시 localStorage에서도 제거된다', () => {
    seedStorage([
      { id: 'a', prompt: 'A', code: 'const A = () => null;', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', prompt: 'B', code: 'const B = () => null;', createdAt: '2024-01-02T00:00:00.000Z' },
    ]);

    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      result.current.removeComponent('a');
    });

    expect(result.current.components).toHaveLength(1);
    const stored = readStorage();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('b');
  });

  it('clearAll 호출 시 localStorage도 비워진다', () => {
    seedStorage([
      { id: 'a', prompt: 'A', code: 'const A = () => null;', createdAt: '2024-01-01T00:00:00.000Z' },
    ]);

    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.components).toEqual([]);
    expect(readStorage()).toEqual([]);
  });

  it('스키마가 어긋난 항목은 걸러내고 유효한 항목만 복원한다', () => {
    seedStorage([
      { id: 'valid', prompt: '정상 항목', code: 'const A = () => null;', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 123, prompt: '잘못된 id', code: 'const B = () => null;', createdAt: '2024-01-02T00:00:00.000Z' },
      { id: 'no-code', prompt: '코드 없음', createdAt: '2024-01-03T00:00:00.000Z' },
    ]);

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].id).toBe('valid');
  });

  it('저장된 히스토리가 20개를 초과하면 로드 시에도 최근 20개로 자른다', () => {
    const seeded = Array.from({ length: 25 }, (_, i) => ({
      id: `seed-${i}`,
      prompt: `프롬프트 ${i}`,
      code: 'const A = () => null;',
      createdAt: new Date(2024, 0, i + 1).toISOString(),
    }));
    seedStorage(seeded);

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toHaveLength(20);
    expect(result.current.components[0].id).toBe('seed-0');
    expect(result.current.components.some((c) => c.id === 'seed-19')).toBe(true);
    expect(result.current.components.some((c) => c.id === 'seed-24')).toBe(false);
  });
});
