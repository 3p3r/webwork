import fs from 'fs';
import rc from 'rc';
import { $ } from 'zx';

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
  await Promise.all([
    installDependencies(config.openwork.root),
    installDependencies(config.deepagents.root),
  ]);
  await $`npm run webpack:build`;
}

async function build() {
  await fetchGitRepos();
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
