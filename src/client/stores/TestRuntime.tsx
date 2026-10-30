import { useLayoutEffect, type ReactNode } from 'react';
import { useTestModel } from '../hooks/useTestModel';
import { useTestModelStore } from './testModel';

/** Run history/auth effects once above the routes, and publish their actions to Zustand. */
export function TestRuntime({ children }: { children: ReactNode }) {
  const model = useTestModel();
  const ready = useTestModelStore((state) => state.model !== null);

  useLayoutEffect(() => {
    useTestModelStore.setState({ model });
  }, [model]);

  useLayoutEffect(() => () => useTestModelStore.setState({ model: null }), []);

  return ready ? children : null;
}
