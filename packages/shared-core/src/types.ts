export type SymbolRecord = {
  readonly symbol: string;
  readonly grimoire: string;
  readonly namespace: string;
  readonly synopsis: string;
  readonly keyParams: ReadonlyArray<string>;
  readonly signature?: string;
  readonly rationale?: string;
  readonly examples?: ReadonlyArray<string>;
};

export type GrimoireRef = {
  readonly name: string;
  readonly file: string;
  readonly namespace?: string;
};

export type ToolResult = {
  readonly content: ReadonlyArray<{
    readonly type: 'text';
    readonly text: string;
  }>;
};
