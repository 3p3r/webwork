// @ts-expect-error - webpack will handle this as an asset
import wasmUrl from 'sql.js/dist/sql-wasm.wasm';

// Import sql-wasm as a module - webpack will bundle it
// @ts-expect-error
import initSqlJsModule from '!!file-loader!sql.js/dist/sql-wasm.js';

let sqlJsPromise: Promise<any> | null = null;

// In browser, we need to provide the WASM file URL
export default function initSqlJsWrapper(config?: any) {
  if (!sqlJsPromise) {
    sqlJsPromise = new Promise((resolve, reject) => {
      // Load the sql-wasm.js script dynamically
      const script = document.createElement('script');
      script.src = initSqlJsModule;
      script.onload = () => {
        if (typeof window !== 'undefined' && typeof window.initSqlJs === 'function') {
          resolve(window.initSqlJs);
        } else {
          reject(new Error('initSqlJs not found on window'));
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return sqlJsPromise.then((initSqlJs) =>
    initSqlJs({
      locateFile: (_file: string) => {
        // Return the webpack-resolved URL for the wasm file
        return wasmUrl;
      },
      ...config,
    }),
  );
}

// @ts-expect-error - re-export all named exports
export * from 'sql.js';
