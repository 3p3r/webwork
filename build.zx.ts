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

async function installDependencies(dir: string) {
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

async function installAllDependencies() {
  await Promise.all([
    installDependencies(config.openwork.root),
    installDependencies(config.deepagents.root),
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
