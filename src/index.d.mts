// Purpose: Declare bounded game state, behavior packs, decisions and deterministic replay.
import type { DecisionRecord } from '@gbesse/decisionpacks';
export type ActionKind = 'wait' | 'rest' | 'eat' | 'greet' | 'share' | 'trade';
export interface Actor { id: string; name: string; role: string; stamina: number; food: number; coins: number; trust: Record<string, number> }
export interface Behavior { schemaVersion: 1; id: string; description: string; instructions: string; priorities: ActionKind[] }
export interface Action { id: string; kind: ActionKind; targetId: string | null; description: string }
export interface Plan { actorId: string; actionId: string; expectedFingerprint: string; source: string; behaviorId?: string; allowedActionIds: string[]; record?: DecisionRecord }
export interface Event { tick: number; actorId: string; actionId: string; source: string; before: string; after: string; description: string }
export interface HistoryEntry { plan: Plan; event: Event }
export interface World { schemaVersion: 1; tick: number; actors: Actor[]; history: HistoryEntry[] }
export function validateWorld(world: unknown): World;
export function validateBehavior(behavior: unknown): Behavior;
export function createWorld(actors: Actor[]): World;
export function worldFingerprint(world: World): string;
export function availableActions(world: World, actorId: string, behavior?: Behavior): Action[];
export function planScripted(world: World, actorId: string, behavior: Behavior): Plan;
export function commitTurn(world: World, plan: Plan): { world: World; event: Event };
export function replay(initial: World, history: HistoryEntry[]): World;
