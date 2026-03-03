import type { BBTurnState, RunningBBTurnState, PendingBBTurnState } from "./BBTurn";

export interface BBSessionProcessDef {
  sessionProcessId: string;
  projectId: string;
  cwd: string;
  abortController: AbortController;
  setNextMessage: (input: { text: string; attachments?: Array<{ path: string }> }) => void;
}

export interface BBSessionProcessPendingState {
  type: "pending";
  def: BBSessionProcessDef;
  tasks: BBTurnState[];
  currentTask: BBTurnState;
}

export interface BBSessionProcessNotInitializedState {
  type: "not_initialized";
  def: BBSessionProcessDef;
  tasks: BBTurnState[];
  currentTask: PendingBBTurnState;
  rawUserMessage: string;
}

export interface BBSessionProcessInitializedState {
  type: "initialized";
  def: BBSessionProcessDef;
  tasks: BBTurnState[];
  currentTask: RunningBBTurnState;
  sessionId: string;
  rawUserMessage: string;
  initContext: {
    initMessage: { session_id: string };
  };
}

export interface BBSessionProcessFileCreatedState {
  type: "file_created";
  def: BBSessionProcessDef;
  tasks: BBTurnState[];
  currentTask: RunningBBTurnState;
  sessionId: string;
  rawUserMessage: string;
  initContext: {
    initMessage: { session_id: string };
  };
}

export interface BBSessionProcessPausedState {
  type: "paused";
  def: BBSessionProcessDef;
  tasks: BBTurnState[];
  sessionId: string;
}

export interface BBSessionProcessCompletedState {
  type: "completed";
  def: BBSessionProcessDef;
  tasks: BBTurnState[];
  sessionId: string;
}

export type BBSessionProcessState =
  | BBSessionProcessPendingState
  | BBSessionProcessNotInitializedState
  | BBSessionProcessInitializedState
  | BBSessionProcessFileCreatedState
  | BBSessionProcessPausedState
  | BBSessionProcessCompletedState;

export const isPublic = (
  state: BBSessionProcessState,
): state is
  | BBSessionProcessPausedState
  | BBSessionProcessInitializedState
  | BBSessionProcessNotInitializedState
  | BBSessionProcessFileCreatedState =>
  state.type === "paused" ||
  state.type === "initialized" ||
  state.type === "not_initialized" ||
  state.type === "file_created";

export const getAliveTasks = (
  state: BBSessionProcessState,
): RunningBBTurnState[] => {
  if (
    state.type === "not_initialized" ||
    state.type === "initialized" ||
    state.type === "file_created"
  ) {
    if (state.currentTask.status === "running") {
      return [state.currentTask];
    }
  }
  return [];
};

export const createVirtualConversation = (
  state: BBSessionProcessState,
  options: {
    sessionId: string;
    userMessage: string;
  },
) => {
  const { sessionId, userMessage } = options;
  const timestamp = new Date().toISOString();
  
  return {
    type: "user" as const,
    uuid: `${sessionId}-user-${Date.now()}`,
    timestamp,
    sessionId,
    isSidechain: false,
    userType: "external" as const,
    cwd: state.def.cwd,
    version: "1.0.0",
    message: {
      role: "user" as const,
      content: userMessage,
    },
    parentUuid: null,
  };
};
