import { Duplex } from 'stream';
import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import * as common from './common';
const PID_POOL = new common.PidPool();

// https://emscripten.org/docs/api_reference/module.html#Module.thisProgram
interface EmscriptenModuleObject {
  callMain(args: string[]): Promise<number>;
  // https://emscripten.org/docs/api_reference/module.html#Module.noExitRuntime
  noExitRuntime: boolean;
  // busybox is sensitive to argv0 of the process! that's how it knows what to run.
  thisProgram: string;
  // https://emscripten.org/docs/api_reference/module.html#Module.print
  print: (msg: string) => void;
  // https://emscripten.org/docs/api_reference/module.html#Module.printErr
  printErr: (msg: string) => void;
}

export class BusyBoxIsomorphicChildProcess
  extends EventEmitter
  implements common.IsomorphicChildProcess
{
  readonly spawnargs: string[];
  readonly spawnfile: string;
  readonly stdout: Writable;
  readonly stderr: Writable;
  readonly stdin: Readable;
  readonly stdio: [Readable, Writable, Writable];
  readonly pid: number = PID_POOL.next();
  private _exitCode: number | null = null;
  constructor(
    opts: common.IsomorphicSpawnOptions = {},
    command: string = 'busybox',
    ...args: string[]
  ) {
    super();
    this.spawnfile = command;
    this.spawnargs = args ?? ['-h'];
    const [stdin, stdout, stderr] = common.normalizeStdio(opts.stdio);
    this.stdout = stdout || new Duplex();
    this.stderr = stderr || new Duplex();
    this.stdin = stdin;
    this.stdio = [this.stdin, this.stdout, this.stderr];
    this._fork()
      .then(async (instance: EmscriptenModuleObject) => {
        this.emit('spawn', instance);
        try {
          const exitCode = await this._exec(instance);
          this._exitCode = exitCode;
        } catch (err) {
          this._exitCode = 1;
          this.emit('error', err);
        }
      })
      .catch((err) => {
        this.emit('error', err);
      })
      .finally(() => {
        this.emit('exit', this.exitCode);
      });
  }
  private async _fork(): Promise<EmscriptenModuleObject> {
    // const variant = common.detectHostVariant();
    // this is handled by Webpack's "require expressions" capability (syntax matters, do not refactor):
    // https://webpack.js.org/guides/dependency-management/#require-with-expression
    const factory = require('../../busybox/busybox.js');

    // If spawnfile is not 'busybox', prepend it to args for busybox to know which applet to run
    const actualArgs =
      this.spawnfile === 'busybox' ? this.spawnargs : [this.spawnfile, ...this.spawnargs];

    const Module: Partial<EmscriptenModuleObject> = {
      noExitRuntime: true,
      thisProgram: this.spawnfile === 'zip' ? 'nanozip' : this.spawnfile,
      print: (msg: string) => {
        this.stdout.write(msg);
      },
      printErr: (msg: string) => {
        this.stderr.write(msg);
      },
    };
    const instance: EmscriptenModuleObject = await factory(Module);
    // Store the actual args to use in _exec
    (instance as any)._actualArgs = actualArgs;
    return instance;
  }
  private async _exec(instance: EmscriptenModuleObject): Promise<number> {
    const args = (instance as any)._actualArgs || this.spawnargs;
    const exitCode = await instance.callMain(args);
    return exitCode;
  }
  public get exitCode(): number | null {
    return this._exitCode;
  }
}
