import { Duplex } from 'stream';
import { EventEmitter } from 'events';
import type { Writable, Readable } from 'stream';
import * as common from './common';

const PID_POOL = new common.PidPool();

export class ErrorReportChildProcess extends EventEmitter implements common.IsomorphicChildProcess {
  readonly spawnargs: string[];
  readonly spawnfile: string;
  readonly stdout: Writable;
  readonly stderr: Writable;
  readonly stdin: Readable;
  readonly stdio: [Readable, Writable, Writable];
  readonly pid: number = PID_POOL.next();
  readonly exitCode: number = 1;

  constructor(
    opts: common.IsomorphicSpawnOptions = {},
    command: string,
    args: string[],
    errorMessage: string,
  ) {
    super();
    this.spawnfile = command;
    this.spawnargs = args;
    const [stdin, stdout, stderr] = common.normalizeStdio(opts.stdio);
    this.stdout = stdout || new Duplex();
    this.stderr = stderr || new Duplex();
    this.stdin = stdin;
    this.stdio = [this.stdin, this.stdout, this.stderr];

    setImmediate(() => {
      this.emit('spawn');
      this.stderr.write(`${errorMessage}\n`);
      this.emit('exit', this.exitCode);
    });
  }
}
