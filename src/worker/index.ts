import { handleRequest } from './router';
import type { Env } from './types';

export default { fetch: handleRequest } satisfies ExportedHandler<Env>;
