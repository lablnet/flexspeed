import type { Phase } from '../../shared/types';
export const activePhases = ['connecting', 'latency', 'download', 'upload'];
export const phaseLabels: Record<Phase, string> = {
  idle: 'Ready when you are',
  connecting: 'Connecting to your edge',
  latency: 'Measuring idle latency',
  download: 'Measuring download',
  upload: 'Measuring upload',
  complete: 'Your results are ready',
  cancelled: 'Test cancelled',
  error: 'Connection interrupted',
};
