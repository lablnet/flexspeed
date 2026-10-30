import { create } from 'zustand';
import type { useTestModel } from '../hooks/useTestModel';

type TestModel = ReturnType<typeof useTestModel>;

/** History and persistence hooks publish their public actions here. No React context needed. */
export const useTestModelStore = create<{ model: TestModel | null }>(() => ({ model: null }));

export function useTestActions<T>(selector: (model: TestModel) => T): T {
  return useTestModelStore((state) => {
    if (!state.model) throw new Error('TestRuntime must be mounted');
    return selector(state.model);
  });
}
