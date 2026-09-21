// Purpose: Type the optional Jev adapter and injected provider contract.
import type { Provider, DecisionRecord } from '@gbesse/decisionpacks';
export interface JevOptions { provider?: Provider; signal?: AbortSignal }
import type { World, Behavior, Plan } from './index.mjs';
export function planWithJev(world: World, actorId: string, behavior: Behavior, options?: JevOptions & { minProbability?: number }): Promise<Plan>;
