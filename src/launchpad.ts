import { waitForInitialization } from './initialize';

async function launchpad() {
  await waitForInitialization();

  await import(/* webpackChunkName: "main" */ '../openwork/src/main/index');
  await import(/* webpackChunkName: "preload" */ '../openwork/src/preload/index');
  await import(/* webpackChunkName: "renderer" */ './index');
}

launchpad().catch((error) => {
  console.error('Launchpad failed:', error);
});
