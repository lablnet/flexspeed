// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/client/auth/AuthContext';
import { TestRuntime } from '../src/client/stores/TestRuntime';
import { useTestActions } from '../src/client/stores/testModel';
import { authClient } from '../src/client/auth/client';
import { browserResult, publicHistoryResult } from './fixtures/history';
import type { PublicResult } from '../src/shared/results';
import type { SavedResult } from '../src/shared/types';
import { initialState } from '../src/client/engine/state';

vi.mock('../src/client/auth/client', () => ({
  authClient: { signOut: vi.fn(), signIn: { social: vi.fn() } },
}));

let account: PublicResult[];
let failSync: boolean;
let failHistory: boolean;
let syncCalls: number;
let currentUser: string;

beforeEach(() => {
  // Node 26 exposes an optional native localStorage getter; use an isolated
  // browser-style store so these tests never depend on host storage settings.
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, String(value)),
    removeItem: (key: string) => stored.delete(key),
    clear: () => stored.clear(),
  });
  account = [];
  failSync = false;
  failHistory = false;
  syncCalls = 0;
  currentUser = 'alice';
  vi.mocked(authClient.signOut)
    .mockReset()
    .mockResolvedValue({ data: { success: true }, error: null });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input, 'http://localhost').pathname;
      if (path === '/api/auth/config') return Response.json({ google: true, storage: true });
      if (path === '/api/auth/get-session')
        return Response.json({
          user: { id: currentUser, name: currentUser, email: `${currentUser}@example.com` },
        });
      if (path === '/api/info')
        return Response.json({
          local: true,
          ip: null,
          network: null,
          asn: null,
          city: null,
          country: null,
          colo: null,
        });
      if (path === '/api/history')
        return failHistory
          ? Response.json({ error: 'Offline' }, { status: 503 })
          : Response.json({
              results: account.slice(0, 50),
              nextCursor: null,
              total: account.length,
            });
      if (path === '/api/history/sync') {
        syncCalls++;
        if (failSync) return Response.json({ error: 'Offline' }, { status: 503 });
        const entries = JSON.parse(init!.body as string) as SavedResult[];
        for (const entry of entries) {
          if (!entry.accountId) account.push({ ...publicHistoryResult(), metrics: entry.metrics });
        }
        return Response.json({
          syncedIds: entries.map((entry) => entry.id),
          discardedIds: [],
          remaining: 0,
        });
      }
      if (path === '/api/results') {
        const result = publicHistoryResult();
        account.unshift(result);
        return Response.json({
          id: result.id,
          shareUrl: result.shareUrl,
          posterUrl: result.posterUrl,
        });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(AuthProvider, null, createElement(TestRuntime, null, children));
const useModel = () => ({ auth: useAuth(), test: useTestActions((model) => model) });

describe('login and logout history lifecycle', () => {
  it('moves guest browser history into the account and updates the active count', async () => {
    localStorage.setItem('flexspeed.history', JSON.stringify([browserResult(), browserResult()]));
    const { result } = renderHook(useModel, { wrapper });
    await waitFor(() => expect(result.current.test.historyCount).toBe(2));
    await waitFor(() => expect(result.current.test.history).toHaveLength(0));
    expect(result.current.test.cloudHistory.results).toHaveLength(2);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('flexspeed.history')!)).toEqual([]));
    expect(syncCalls).toBe(1);
  });

  it('keeps browser records on a failed import and clears them only after retry succeeds', async () => {
    failSync = true;
    localStorage.setItem('flexspeed.history', JSON.stringify([browserResult()]));
    const { result } = renderHook(useModel, { wrapper });
    await waitFor(() => expect(result.current.test.syncError).toBe('Offline'));
    expect(result.current.test.history).toHaveLength(1);
    expect(syncCalls).toBe(1);
    failSync = false;
    act(() => result.current.test.retrySync());
    await waitFor(() => expect(result.current.test.history).toHaveLength(0));
    expect(result.current.test.historyCount).toBe(1);
  });

  it('copies the latest 20 available records only after logout succeeds', async () => {
    account = Array.from({ length: 25 }, publicHistoryResult);
    let completeLogout!: (value: { data: { success: boolean }; error: null }) => void;
    vi.mocked(authClient.signOut).mockImplementation(
      () =>
        new Promise((resolve) => {
          completeLogout = resolve;
        }) as never,
    );
    const { result } = renderHook(useModel, { wrapper });
    await waitFor(() => expect(result.current.test.historyCount).toBe(25));
    let signOut!: Promise<void>;
    act(() => {
      signOut = result.current.auth.signOut();
    });
    await waitFor(() => expect(authClient.signOut).toHaveBeenCalledOnce());
    expect(result.current.test.history).toHaveLength(0);
    expect(result.current.auth.user?.id).toBe('alice');
    await act(async () => {
      completeLogout({ data: { success: true }, error: null });
      await signOut;
    });
    expect(result.current.auth.user).toBeNull();
    expect(result.current.test.history).toHaveLength(20);
    expect(result.current.test.historyCount).toBe(20);
    expect(result.current.test.history.map((entry) => entry.id)).toEqual(
      account.slice(0, 20).map((entry) => entry.id),
    );
    expect(result.current.test.history.every((entry) => entry.accountId === 'alice')).toBe(true);
  });

  it('does not import another account’s logout cache when a different user signs in', async () => {
    currentUser = 'bob';
    const cached = { ...browserResult(), accountId: 'alice' };
    localStorage.setItem('flexspeed.history', JSON.stringify([cached, browserResult()]));
    const { result } = renderHook(useModel, { wrapper });
    await waitFor(() => expect(result.current.test.historyCount).toBe(1));
    await waitFor(() => expect(result.current.test.history).toHaveLength(0));
    expect(account).toHaveLength(1);
  });

  it('saves signed-in tests directly to the account without keeping browser copies', async () => {
    const { result } = renderHook(useModel, { wrapper });
    await waitFor(() => expect(result.current.auth.user?.id).toBe('alice'));
    const completed = browserResult();
    act(() =>
      result.current.test.onComplete(
        completed,
        { ...initialState(), phase: 'complete', metrics: completed.metrics },
        'measurement-token',
      ),
    );
    await waitFor(() => expect(result.current.test.cloudSave.status).toBe('saved'));
    await waitFor(() => expect(result.current.test.historyCount).toBe(1));
    expect(result.current.test.history).toEqual([]);
    expect(JSON.parse(localStorage.getItem('flexspeed.history')!)).toEqual([]);
  });

  it('keeps the user signed in if a fresh logout snapshot cannot be fetched', async () => {
    const { result } = renderHook(useModel, { wrapper });
    await waitFor(() => expect(result.current.auth.user?.id).toBe('alice'));
    failHistory = true;
    await act(async () => {
      await result.current.auth.signOut();
    });
    expect(result.current.auth.error).toBe('Offline');
    expect(result.current.auth.user?.id).toBe('alice');
    expect(authClient.signOut).not.toHaveBeenCalled();
  });
});
