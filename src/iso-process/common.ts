import type { EventEmitter } from 'events';
import type { Readable, Writable } from 'stream';

export type IsoStdioOptions =
  | undefined
  | 'inherit'
  | [
      undefined | 'inherit' | 0,
      undefined | 'inherit' | 1 | Writable | 'ignore',
      undefined | 'inherit' | 2 | Writable | 'ignore',
    ];

/** options used for creation of the iso process */
export interface IsomorphicSpawnOptions {
  /** stdio streams used for creation and usage in the iso process */
  readonly stdio?: IsoStdioOptions;
  /** @hidden */
  readonly override?: {
    readonly fs: typeof import('fs');
    readonly env: typeof import('process').env;
  };
}

/** various possible events emitted by the iso process */
export interface IsomorphicChildProcessEvents extends EventEmitter {
  /** Event sent once this iso process has been spawned successfully, otherwise an error is emitted. */
  on(event: 'spawn', listener: () => void): this;
  /** Event once this iso process encounters an error */
  on(event: 'error', listener: (err: Error) => void): this;
  /** Event once this iso process exits */
  on(event: 'exit', listener: (code: number | null) => void): this;
}

/**
 * Asynchronous and simulated in-process "child process" that can be used in browsers, Node, and soon every where else
 * where WASM / WASI execution is possible. Goal is to make this as close to the NodeJS child process API as possible,
 * so it can be used with bundlers.
 * @see https://nodejs.org/api/child_process.html
 */
export interface IsomorphicChildProcess extends IsomorphicChildProcessEvents {
  /** full list of command-line arguments the child process was launched with. */
  readonly spawnargs: string[];
  /** the executable file name of the child process that is launched. */
  readonly spawnfile: string;
  /** The `stream` that this iso process writes its stdout buffer into */
  readonly stdout: Writable;
  /** The `stream` that this iso process writes its stderr buffer into */
  readonly stderr: Writable;
  /** The `stream` that this iso process reads its stdin buffer from (your `process.stdin`) */
  readonly stdin: Readable;
  /**
   * stdio `stream` associated with this iso process.
   * @note stdio[0] is always the same as your `process.stdin`!
   */
  readonly stdio: [Readable, Writable, Writable];
  /**
   * The process id of this iso process.
   * @note randomly generated, but never the same pid twice. safe to be used for bookkeeping purposes, just like how you
   * would for a real process.
   */
  readonly pid: number;
  /** Exit code of this iso process or `null` if it hasn't exited yet. */
  readonly exitCode: number | null;
}

/**
 * Executes the given `command` in a new iso process.
 * @note This method parses the `command` and calls `spawn()` internally
 * @see https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
 */
export type ExecFunction = (
  command: string,
  opts?: IsomorphicSpawnOptions,
) => IsomorphicChildProcess;
/**
 * Spawns a new iso process with the given `command` and `args`.
 * @note This method does not parse the `command` and `args`
 * @see https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
 */
export type SpawnFunction = (
  command: string,
  args?: string[],
  opts?: IsomorphicSpawnOptions,
) => IsomorphicChildProcess;

/** normalize stdio streams. @hidden */
export function normalizeStdio(
  stdio?: IsoStdioOptions,
): [Readable, Writable | undefined, Writable | undefined] {
  if (stdio === undefined || stdio === 'inherit') {
    return [process.stdin, process.stdout, process.stderr];
  }
  const [stdin, stdout, stderr] = stdio ?? ['inherit', 'inherit', 'inherit'];
  const out: [Readable, Writable | undefined, Writable | undefined] = [
    stdin,
    stdout,
    stderr,
  ] as any;
  if (stdin === 'inherit') {
    out[0] = process.stdin;
  }
  if (stdout === 1 || stdout === 'inherit') {
    out[1] = process.stdout;
  } else if (stdout === 'ignore') {
    out[1] = undefined;
  }
  if (stderr === 2 || stderr === 'inherit') {
    out[2] = process.stderr;
  } else if (stderr === 'ignore') {
    out[2] = undefined;
  }
  return out;
}

/** @hidden */
export class PidPool {
  private readonly _pids = new Set<number>();
  private _nextPid = 1;
  public next(): number {
    while (this._pids.has(this._nextPid)) {
      this._nextPid++;
    }
    this._pids.add(this._nextPid);
    return this._nextPid;
  }
  public free(pid: number): void {
    this._pids.delete(pid);
  }
}

export enum Environment {
  /** Running on native system with real access */
  node = 'node',
  /** Running in browser with no native system access */
  web = 'web',
}

export function detectHostVariant(): Environment {
  if (typeof window !== 'undefined' || typeof postMessage !== 'undefined') {
    return Environment.web;
  } else {
    return Environment.node;
  }
}
