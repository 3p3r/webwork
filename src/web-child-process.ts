import * as isoProcess from './iso-process';
export default isoProcess;
export const spawn = isoProcess.spawn;
export const exec = isoProcess.exec;
export type { ChildProcess, SpawnOptions, StdioOptions } from './iso-process';
