import { EventEmitter } from 'events';
import { memoize } from 'lodash';
import type { Duplex } from 'stream';

function createStandardStream(isError: boolean): Duplex {
  const { Duplex } = require('stream');
  const stream = new Duplex();
  stream._read = () => {};
  stream._write = (
    chunk: any,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) => {
    if (isError) {
      console.error(chunk.toString());
    } else {
      console.log(chunk.toString());
    }
    callback();
  };
  return stream;
}

const getStdout = memoize(() => createStandardStream(false));
const getStderr = memoize(() => createStandardStream(true));

declare const __BUILD_NODE_VERSION__: string;

// From: https://github.com/kumavis/browser-process-hrtime/blob/38920d3d06ddecf0ad1b51f0f6872db946e3c035/index.js
// polyfill for window.performance.now
const performance = globalThis.performance || {};
const performanceNow =
  performance.now ||
  // @ts-expect-error
  performance.mozNow ||
  // @ts-expect-error
  performance.msNow ||
  // @ts-expect-error
  performance.oNow ||
  // @ts-expect-error
  performance.webkitNow ||
  (() => Date.now());

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
const NS_PER_SEC = 1e9;
const hrtime = (previousTimestamp?: [number, number]) => {
  const clocktime = performanceNow.call(performance) * 1e-3;
  let seconds = Math.floor(clocktime);
  let nanoseconds = Math.floor((clocktime % 1) * NS_PER_SEC);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += NS_PER_SEC;
    }
  }
  return [seconds, nanoseconds];
};
// https://github.com/sagemathinc/cowasm/blob/7ec0dad2ef471edf893c75d65a86000d82d16024/packages/wasi-js/src/bindings/browser-hrtime.ts
hrtime.bigint = (time?: [number, number]) => {
  const diff = hrtime(time);
  return diff[0] * NS_PER_SEC + diff[1];
};

export default new (class extends EventEmitter {
  env: { [key: string]: string | undefined } = {};
  hrtime = hrtime;
  platform = 'web';
  version = `v${__BUILD_NODE_VERSION__}`;
  versions = {
    node: __BUILD_NODE_VERSION__,
    electron: 'web',
    chrome: 'web',
  };
  binding(name: string) {
    if (name === 'constants') return require('constants-browserify');
    throw new Error(`process.binding("${name}") is not supported`);
  }
  exitCode: number = 0;
  exit(status: number): void {
    this.exitCode = status;
  }
  nextTick(callback: (...args: unknown[]) => void, ...args: unknown[]): void {
    Promise.resolve()
      .then(() => callback(...args))
      .catch((err) => {
        this.emit('uncaughtException', err);
      });
  }
  _cwd: string = '/';
  cwd(): string {
    return this._cwd;
  }
  chdir(directory: string): void {
    this._cwd = directory;
  }
  argv: string[] = [];
  get stdout(): Duplex {
    return getStdout();
  }
  get stderr(): Duplex {
    return getStderr();
  }
})();
