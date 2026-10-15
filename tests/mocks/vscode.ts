export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export class Diagnostic {
  constructor(
    public readonly range: Range,
    public readonly message: string,
    public readonly severity?: DiagnosticSeverity,
  ) {}
}

export const published = new Map<string, Diagnostic[]>();

export const languages = {
  createDiagnosticCollection: () => ({
    set: (uri: { fsPath: string }, diagnostics: Diagnostic[]) =>
      void published.set(uri.fsPath, diagnostics),
    delete: (uri: { fsPath: string }) => void published.delete(uri.fsPath),
    dispose: () => published.clear(),
  }),
};
