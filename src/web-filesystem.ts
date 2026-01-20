import * as fs from 'wasabio';
import { fs as fsConstants } from './web-constants';

const fsPromises = fs.promises;

// Re-export all methods from wasabio (for regular fs imports)
export * from 'wasabio';

// Export all promise-based methods as named exports (for fs/promises imports)
export const access = fsPromises.access;
export const appendFile = fsPromises.appendFile;
export const chmod = fsPromises.chmod;
export const chown = fsPromises.chown;
export const close = fsPromises.close;
export const copyFile = fsPromises.copyFile;
export const exists = fsPromises.exists;
export const fchmod = fsPromises.fchmod;
export const fchown = fsPromises.fchown;
export const fdatasync = fsPromises.fdatasync;
export const freaddir = fsPromises.freaddir;
export const fstat = fsPromises.fstat;
export const fsync = fsPromises.fsync;
export const ftruncate = fsPromises.ftruncate;
export const futimes = fsPromises.futimes;
export const lchmod = fsPromises.lchmod;
export const lchown = fsPromises.lchown;
export const link = fsPromises.link;
export const lseek = fsPromises.lseek;
export const lstat = fsPromises.lstat;
export const lutimes = fsPromises.lutimes;
export const mkdir = fsPromises.mkdir;
export const mkdtemp = fsPromises.mkdtemp;
export const open = fsPromises.open;
export const opendir = fsPromises.opendir;
export const openfile = fsPromises.openfile;
export const read = fsPromises.read;
export const readdir = fsPromises.readdir;
export const readFile = fsPromises.readFile;
export const readlink = fsPromises.readlink;
export const realpath = fsPromises.realpath;
export const rename = fsPromises.rename;
export const rm = fsPromises.rm;
export const rmdir = fsPromises.rmdir;
export const stat = fsPromises.stat;
export const statfs = fsPromises.statfs;
export const symlink = fsPromises.symlink;
export const truncate = fsPromises.truncate;
export const unlink = fsPromises.unlink;
export const utimes = fsPromises.utimes;
export const write = fsPromises.write;
export const writeFile = fsPromises.writeFile;

// Create a default export that includes constants
const fsModule = {
  ...fs,
  promises: fsPromises,
  constants: fsConstants,
};

export default fsModule;
export { fsPromises as promises };
export { fsConstants as constants };
