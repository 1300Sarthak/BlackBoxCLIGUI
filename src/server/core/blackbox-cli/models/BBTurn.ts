export interface BBOptions {
  model?: string;
  maxTurns?: number;
  maxThinkingTokens?: number;
  systemPrompt?: string;
}

export interface NewBBTurnDef {
  type: "new";
  turnId: string;
  bbOptions?: BBOptions;
}

export interface ResumeBBTurnDef {
  type: "resume";
  turnId: string;
  sessionId?: string;
  baseSessionId: string;
  bbOptions?: BBOptions;
}

export interface ForkBBTurnDef {
  type: "fork";
  turnId: string;
  sessionId: string;
  baseSessionId: string;
  bbOptions?: BBOptions;
}

export interface ContinueBBTurnDef {
  type: "continue";
  turnId: string;
  sessionId: string;
  baseSessionId: string;
  bbOptions?: BBOptions;
}

export type BBTurnDef =
  | NewBBTurnDef
  | ResumeBBTurnDef
  | ForkBBTurnDef
  | ContinueBBTurnDef;

export interface PendingBBTurnState {
  def: BBTurnDef;
  status: "pending";
}

export interface RunningBBTurnState {
  def: BBTurnDef;
  status: "running";
  sessionId?: string;
}

export interface CompletedBBTurnState {
  def: BBTurnDef;
  status: "completed";
  sessionId?: string;
}

export interface FailedBBTurnState {
  def: BBTurnDef;
  status: "failed";
  error: unknown;
}

export type BBTurnState =
  | PendingBBTurnState
  | RunningBBTurnState
  | CompletedBBTurnState
  | FailedBBTurnState;
