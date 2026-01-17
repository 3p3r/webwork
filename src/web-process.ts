import { EventEmitter } from 'events';

declare const __BUILD_NODE_VERSION__: string;

export default new (class extends EventEmitter {
  platform = 'web';
  version = `v${__BUILD_NODE_VERSION__}`;
  versions = {
    node: __BUILD_NODE_VERSION__,
    electron: 'web',
    chrome: 'web',
  };
})();
