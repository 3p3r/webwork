import * as fs from 'wasabio';
import { fs as fsConstants } from './web-constants';

const fsPromises = (fs as any).promises;

// Re-export all methods from wasabio
export * from 'wasabio';

// Create a default export that includes constants
const fsModule = {
  ...fs,
  promises: fsPromises,
  constants: fsConstants,
};

export default fsModule;
export const promises = fsPromises;
export const constants = fsConstants;
