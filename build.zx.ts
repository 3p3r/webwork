import fs from 'fs';
import rc from 'rc';
import path from 'path';
import childProcess from 'child_process';
import { $, within, cd } from 'zx';

const config = rc('webwork', {
  openwork: {
    commit: '8bb546f51124dd805283be515476bd4f1f58ef1a',
    repo: 'https://github.com/langchain-ai/openwork.git',
    root: 'openwork',
  },
  deepagents: {
    commit: 'de2b4f1bec7038217a6dcde68f803258a9709c35',
    repo: 'https://github.com/langchain-ai/deepagentsjs.git',
    root: 'deepagents',
  },
  busybox: {
    root: 'busybox',
  },
  emscripten: {
    root: 'emcc-sdk',
    version: '3.1.35',
    sdkUrl: 'https://github.com/emscripten-core/emsdk/archive/refs/heads/main.zip',
  },
});

async function fetchRepo(repo: string, commit: string, dest: string) {
  if (fs.existsSync(dest)) {
    console.log(`${dest} already exists, skipping clone.`);
    return;
  }
  console.log(`Cloning ${repo} into ${dest}...`);
  await $`git clone ${repo} ${dest}`;
  await $`cd ${dest} && git checkout ${commit}`;
}

async function patchOpenWork() {
  const mainTsxPath = path.resolve(config.openwork.root, 'src/renderer/src/main.tsx');

  if (!fs.existsSync(mainTsxPath)) {
    console.log('main.tsx not found, skipping patch');
    return;
  }

  console.log('Patching OpenWork main.tsx to remove React StrictMode...');

  let content = fs.readFileSync(mainTsxPath, 'utf8');

  // Remove StrictMode wrapper
  content = content.replace(
    /ReactDOM\.createRoot\(document\.getElementById\('root'\)!\)\.render\(\s*<React\.StrictMode>\s*<App \/>\s*<\/React\.StrictMode>\s*\)/s,
    "ReactDOM.createRoot(document.getElementById('root')!).render(\n  <App />\n)",
  );

  fs.writeFileSync(mainTsxPath, content);
  console.log('OpenWork main.tsx patched successfully');
}

async function installNodeDependencies(dir: string) {
  if (fs.existsSync(`${dir}/node_modules`)) {
    console.log(`Dependencies already installed in ${dir}, skipping.`);
    return;
  }
  console.log(`Installing dependencies in ${dir}...`);
  await $`cd ${dir} && npm install`;
}

async function fetchGitRepos() {
  await Promise.all([
    fetchRepo(config.openwork.repo, config.openwork.commit, config.openwork.root),
    fetchRepo(config.deepagents.repo, config.deepagents.commit, config.deepagents.root),
  ]);
  await patchOpenWork();
}

async function installEmccSDK() {
  if (fs.existsSync(config.emscripten.root)) {
    console.log('Emscripten SDK already installed');
    return;
  }
  console.log('installing Emscripten SDK');
  const ver = config.emscripten.version;
  const url = config.emscripten.sdkUrl;
  await $`curl -L ${url} -o emsdk.zip`;
  await $`unzip emsdk.zip`;
  await $`mv emsdk-main ${config.emscripten.root}`;
  await $`rm emsdk.zip`;
  await within(async () => {
    cd(config.emscripten.root);
    await $`./emsdk install ${ver}`;
    await $`./emsdk activate ${ver}`;
    cd('upstream/emscripten');
    await $`ln -s emcc emgcc`;
    await $`ln -s emcc.py emgcc.py`;
    await $`./emgcc --version`;
  });
}

async function installAllDependencies() {
  installEmccSDK();
  installNodeDependencies(config.openwork.root);
  installNodeDependencies(config.deepagents.root);
}

async function buildDeepAgents() {
  const cwd = path.resolve(config.deepagents.root, 'libs/deepagents');

  if (fs.existsSync(path.join(cwd, 'dist'))) {
    console.log('DeepAgents already built, skipping.');
    return;
  }

  console.log('Building DeepAgents...');

  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_LOADER;

  await within(async () => {
    $.cwd = cwd;
    await $`npm install`;
  });

  childProcess.execSync('npm run build', {
    env: { ...cleanEnv, CI: 'true', NODE_ENV: 'production' },
    stdio: 'inherit',
    cwd,
  });
}

async function buildWebWork() {
  console.log('Building WebWork...');
  await $`npm run webpack:build`;
}

async function buildBusyBox() {
  console.log('Building BusyBox WASM binaries...');
  await within(async () => {
    cd(path.resolve(config.busybox.root));
    await $`mkdir -p build`;
    cd('build');
    await $`cmake ..`;
    await $`make -j2`;
  });
}

async function buildAllDependencies() {
  await buildDeepAgents();
  await buildBusyBox();
}

async function build() {
  await fetchGitRepos();
  await installAllDependencies();
  await buildAllDependencies();
  await buildWebWork();
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
