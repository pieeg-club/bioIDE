export type Language = "javascript" | "python";

export interface FileBuffer {
  id: string;
  name: string;
  language: Language;
  content: string;
}

export interface ExecutionResult {
  ok: boolean;
  language: Language;
  stdout: string;
  error?: string;
  durationMs: number;
}

export interface RuntimeApi {
  executeCode(code: string, lang: Language): Promise<ExecutionResult>;
  isPythonReady(): Promise<boolean>;
}

export type EngineListener = () => void;
