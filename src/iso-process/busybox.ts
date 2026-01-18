import fs from 'fs';
import { Duplex } from 'stream';
import { EventEmitter } from 'events';
import type { Writable, Readable } from 'stream';

import * as common from './common';
const PID_POOL = new common.PidPool();

interface EmscriptenModuleObject {
  callMain(args: string[]): Promise<number>;
  noExitRuntime: boolean;
  thisProgram: string;
  print: (msg: string) => void;
  printErr: (msg: string) => void;
  preRun?: Array<(module: any) => void>;
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
    const factory = require('../../busybox/build/out/web/busybox.js');

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

    Module.preRun = [
      (module: any) => {
        if (module.FS?.filesystems.PROXYFS) {
          const proxyFs = {
            lstat: (path: string) => fs.lstatSync(path),
            stat: (path: string) => fs.statSync(path),
            readdir: (path: string) => fs.readdirSync(path),
            readFile: (path: string, options?: any) => fs.readFileSync(path, options),
            writeFile: (path: string, data: any, options?: any) => fs.writeFileSync(path, data, options),
            mkdir: (path: string, options?: any) => fs.mkdirSync(path, options),
            rmdir: (path: string) => fs.rmdirSync(path),
            unlink: (path: string) => fs.unlinkSync(path),
            rename: (oldPath: string, newPath: string) => fs.renameSync(oldPath, newPath),
            readlink: (path: string) => fs.readlinkSync(path),
            symlink: (target: string, path: string) => fs.symlinkSync(target, path),
            exists: (path: string) => fs.existsSync(path),
            chmod: (path: string, mode: number) => fs.chmodSync?.(path, mode),
            chown: (path: string, uid: number, gid: number) => fs.chownSync?.(path, uid, gid),
            truncate: (path: string, len: number) => fs.truncateSync?.(path, len),
            utimes: (path: string, atime: number | Date, mtime: number | Date) => 
              fs.utimesSync?.(path, atime, mtime),
            open: (path: string, flags: any) => fs.openSync(path, flags),
            close: (fd: number) => fs.closeSync(fd),
            read: (fd: number, buffer: Buffer, offset: number, length: number, position: number) =>
              fs.readSync(fd, buffer, offset, length, position),
            write: (fd: number, buffer: Buffer, offset: number, length: number, position: number) =>
              fs.writeSync(fd, buffer, offset, length, position),
          };

          module.FS.mkdir('/work');
          module.FS.mount(module.FS.filesystems.PROXYFS, { root: '/', fs: proxyFs }, '/work');
          module.FS.chdir('/work');
        } else {
          console.warn('PROXYFS not available, BusyBox will have no filesystem access');
        }
      },
    ];

    const instance: EmscriptenModuleObject = await factory(Module);
    return instance;
  }
  private async _exec(instance: EmscriptenModuleObject): Promise<number> {
    const exitCode = await instance.callMain(this.spawnargs);
    return exitCode;
  }
  public get exitCode(): number | null {
    return this._exitCode;
  }
}
