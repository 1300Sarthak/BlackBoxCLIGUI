export type Flag =
  | {
      name: "canUseTool";
      enabled: boolean;
    }
  | {
      name: "agentSdk";
      enabled: boolean;
    }
  | {
      name: "sidechainSeparation";
      enabled: boolean;
    }
  | {
      name: "uuidOnSDKMessage";
      enabled: boolean;
    }
  | {
      name: "runSkillsDirectly";
      enabled: boolean;
    };

export type FlagName = Flag["name"];
