import fs from 'fs';
import rc from 'rc';
import path from 'path';
import childProcess from 'child_process';
import { $, within } from 'zx';

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
    jsUrl: 'https://github.com/mayflower/busybox-wasm/releases/download/v1.37.0/busybox.js',
    wasmUrl: 'https://github.com/mayflower/busybox-wasm/releases/download/v1.37.0/busybox.wasm',
    root: 'busybox',
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
}

async function downloadBusyBox() {
  const busyboxDir = path.resolve(config.busybox.root);
  if (fs.existsSync(busyboxDir)) {
    console.log('BusyBox already downloaded, skipping.');
    return;
  }
  console.log('Downloading BusyBox WASM binaries...');
  fs.mkdirSync(busyboxDir, { recursive: true });
  const jsPath = path.join(busyboxDir, 'busybox.js');
  const wasmPath = path.join(busyboxDir, 'busybox.wasm');

  const downloadFile = async (url: string, dest: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }
    const data = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(data));
  };

  await Promise.all([
    downloadFile(config.busybox.jsUrl, jsPath),
    downloadFile(config.busybox.wasmUrl, wasmPath),
  ]);
}

async function installAllDependencies() {
  await Promise.all([
    downloadBusyBox(),
    installNodeDependencies(config.openwork.root),
    installNodeDependencies(config.deepagents.root),
  ]);
}

async function buildDeepagents() {
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

async function build() {
  await fetchGitRepos();
  await installAllDependencies();
  await buildDeepagents();
  await buildWebWork();
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
