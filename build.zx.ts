import fs from 'fs';
import rc from 'rc';
import path from 'path';
import childProcess from 'child_process';
import { $, within, cd } from 'zx';

const config = rc('webwork', {
  openwork: {
    commit: '0a9960ff744a53a8f75c335447caf8ae40a1649a',
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
    version: '3.1.74',
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

async function installNodeDependencies(dir: string) {
  const fullPath = path.resolve(__dirname, dir);
  if (fs.existsSync(`${fullPath}/node_modules`)) {
    console.log(`Dependencies already installed in ${dir}, skipping.`);
    return;
  }
  console.log(`Installing dependencies in ${dir}...`);
  await $`cd ${fullPath} && npm install`;
}

async function fetchGitRepos() {
  await Promise.all([
    fetchRepo(config.openwork.repo, config.openwork.commit, config.openwork.root),
    fetchRepo(config.deepagents.repo, config.deepagents.commit, config.deepagents.root),
  ]);
}

async function installEmccSDK() {
  cd(__dirname);
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
    cd(path.resolve(__dirname, config.emscripten.root));
    await $`./emsdk install ${ver}`;
    await $`./emsdk activate ${ver}`;
    cd('upstream/emscripten');
    await $`ln -s emcc emgcc`;
    await $`ln -s emcc.py emgcc.py`;
    await $`./emgcc --version`;
  });
}

async function installAllDependencies() {
  await installEmccSDK();
  await installNodeDependencies(config.openwork.root);
  await installNodeDependencies(config.deepagents.root);
}

async function buildDeepAgents() {
  const cwd = path.resolve(__dirname, config.deepagents.root, 'libs/deepagents');

  if (fs.existsSync(path.join(cwd, 'dist'))) {
    console.log('DeepAgents already built, skipping.');
    return;
  }

  console.log('Building DeepAgents...');

  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_LOADER;

  await within(async () => {
    cd(cwd);
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
    cd(path.resolve(__dirname, config.busybox.root));
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
