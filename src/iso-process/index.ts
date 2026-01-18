import { parse } from 'shell-quote';
import {
  ExecFunction,
  SpawnFunction,
  type IsoStdioOptions,
  type IsomorphicChildProcess,
  type IsomorphicSpawnOptions,
} from './common';
import { BusyBoxIsomorphicChildProcess } from './busybox';
// import { NodeSimIsomorphicChildProcess } from "./node-sim";

/** An isomorphic ChildProcess implementation */
type ChildProcess = IsomorphicChildProcess;
export { IsomorphicChildProcess as ChildProcess };

/** Isomorphic spawn options */
type SpawnOptions = IsomorphicSpawnOptions;
export { IsomorphicSpawnOptions as SpawnOptions };

/** Isomorphic stdio streams */
export { IsoStdioOptions as StdioOptions };

/**
 * An isomorphic child_process.exec() implementation.
 * @param cmd the command to execute (e.g. `"ls -la"`)
 * @param opts spawn options
 * @returns a new iso child process
 * @see https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
 */
export const exec: ExecFunction = (cmd: string, opts?: SpawnOptions): ChildProcess => {
  opts = opts || {};
  const [command, ...args] = parse(cmd) as string[];
  return spawn(command, args, opts);
};

/**
 * An isomorphic child_process.spawn() implementation.
 * @param cmd the command to execute (e.g. `"ls"`)
 * @param args the command arguments (e.g. `["-la"]`)
 * @param opts spawn options
 * @returns a new iso child process
 * @see https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
 */
export const spawn: SpawnFunction = (
  cmd: string,
  args?: string[],
  opts?: SpawnOptions,
): ChildProcess => {
  args = args || [];
  opts = opts || {};
  if (cmd === 'node') {
    throw new Error(`The "node" command is not supported in iso-process yet.`);
    // return new NodeSimIsomorphicChildProcess(opts, ...args);
  } else if (cmd in Command) {
    return new BusyBoxIsomorphicChildProcess(opts, cmd, ...args);
  } else {
    throw new Error(`Unknown command: ${cmd} with args: ${args}`);
  }
};

/** All available commands */
export enum Command {
  /**
   * pattern scanning and processing language
   * @see https://busybox.net/BusyBox.html#awk
   */
  awk = 'awk',
  /**
   * Base64 encode or decode FILE to standard output
   * @see https://busybox.net/BusyBox.html#base64
   */
  base64 = 'base64',
  /**
   * Strip directory path and .SUFFIX from FILE
   * @see https://busybox.net/BusyBox.html#basename
   */
  basename = 'basename',
  /** This is mainly to show busybox's help in runtime */
  busybox = 'busybox',
  /**
   * Concatenate FILEs and print them to stdout
   * @see https://busybox.net/BusyBox.html#cat
   */
  cat = 'cat',
  /**
   * Change file mode bits
   * @see https://busybox.net/BusyBox.html#chmod
   */
  chmod = 'chmod',
  /**
   * Change file owner and group
   * @see https://busybox.net/BusyBox.html#chown
   */
  chown = 'chown',
  /**
   * Calculate the CRC32 checksums of FILES
   * @see https://busybox.net/BusyBox.html#cksum
   */
  cksum = 'cksum',
  /**
   * Clears the screen/terminal
   * @see https://busybox.net/BusyBox.html#clear
   */
  clear = 'clear',
  /**
   * Zorse Companion CLI
   * Inspired by @see https://github.com/AntonOsika/gpt-engineer/
   */
  companion = 'companion',
  /**
   * Copy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY
   * @see https://busybox.net/BusyBox.html#cp
   */
  cp = 'cp',
  /**
   * Strip non-directory suffix from FILENAME
   * @see https://busybox.net/BusyBox.html#dirname
   */
  dirname = 'dirname',
  /**
   * Display the current date and time
   * @see https://busybox.net/BusyBox.html#date
   */
  date = 'date',
  /**
   * Print the difference between two files
   * @see https://busybox.net/BusyBox.html#diff
   */
  diff = 'diff',
  /**
   * Echo the STRING(s) to standard output
   * @see https://busybox.net/BusyBox.html#echo
   */
  echo = 'echo',
  /**
   * Search for PATTERNS in each FILE.
   * https://linux.die.net/man/1/egrep
   */
  egrep = 'egrep',
  /**
   * Print the current environment or run PROG after setting up the specified environment
   * @see https://busybox.net/BusyBox.html#env
   */
  env = 'env',
  /**
   * Print the value of EXPRESSION to stdout
   * @see https://busybox.net/BusyBox.html#expr
   */
  expr = 'expr',
  /**
   * Return an exit code of FALSE (1)
   * @see https://busybox.net/BusyBox.html#false
   */
  false = 'false',
  /**
   * Find files in a directory hierarchy
   * @see https://busybox.net/BusyBox.html#find
   */
  fgrep = 'fgrep',
  /**
   * Find files in a directory hierarchy
   * @see https://busybox.net/BusyBox.html#find
   */
  find = 'find',
  /**
   * Search for PATTERN in FILEs (or stdin)
   * @see https://busybox.net/BusyBox.html#grep
   */
  grep = 'grep',
  /**
   * hd is an alias for hexdump -C
   * @see https://busybox.net/BusyBox.html#hd
   */
  hd = 'hd',
  /**
   * Display the contents of a file or files
   * @see https://busybox.net/BusyBox.html#head
   */
  head = 'head',
  /**
   * Display FILEs (or stdin) in a user specified format
   * @see https://busybox.net/BusyBox.html#hexdump
   */
  hexdump = 'hexdump',
  /**
   * call the link function to create a link to a file
   * @see https://linux.die.net/man/1/link
   */
  link = 'link',
  /**
   * Create a link LINK or DIR/TARGET to the specified TARGET(s)
   * @see https://busybox.net/BusyBox.html#ln
   */
  ln = 'ln',
  /**
   * List directory contents
   * @see https://busybox.net/BusyBox.html#ls
   */
  ls = 'ls',
  /**
   * Print or check MD5 checksums
   * @see https://busybox.net/BusyBox.html#md5sum
   */
  md5sum = 'md5sum',
  /**
   * Create a directory, if it does not already exist
   * @see https://busybox.net/BusyBox.html#mkdir
   */
  mkdir = 'mkdir',
  /**
   * Create a FIFO special file (named pipe)
   * @see https://busybox.net/BusyBox.html#mkfifo
   */
  mkfifo = 'mkfifo',
  /**
   * Create a filesystem node (file, device special file or named pipe)
   * @see https://busybox.net/BusyBox.html#mknod
   */
  mknod = 'mknod',
  /**
   * Create a temporary file or directory, safely
   * @see https://busybox.net/BusyBox.html#mktemp
   */
  mktemp = 'mktemp',
  /**
   * Move (rename) SOURCE to DEST
   * @see https://busybox.net/BusyBox.html#mv
   */
  mv = 'mv',
  /**
   * Zips and unzips files or directories
   * @see https://github.com/richgel999/miniz
   */
  nanozip = 'nanozip',
  // /** todo: NodeJS subset simulation */
  // node = "node",
  /**
   * apply a diff file to an original
   * @see https://busybox.net/BusyBox.html#patch
   */
  patch = 'patch',
  /**
   * Print environment VARIABLEs. If no VARIABLE specified, print all.
   * @see https://busybox.net/BusyBox.html#printenv
   */
  printenv = 'printenv',
  /**
   * Format and print ARGUMENT(s) according to FORMAT
   * @see https://busybox.net/BusyBox.html#printf
   */
  printf = 'printf',
  /**
   * Print the current working directory
   * @see https://busybox.net/BusyBox.html#pwd
   */
  pwd = 'pwd',
  /**
   * Display the value of a symlink
   * @see https://busybox.net/BusyBox.html#readlink
   */
  readlink = 'readlink',
  /**
   * Return the absolute pathnames of given FILE
   * @see https://busybox.net/BusyBox.html#realpath
   */
  realpath = 'realpath',
  /**
   * Remove (unlink) the FILE(s)
   * @see https://busybox.net/BusyBox.html#rm
   */
  rm = 'rm',
  /**
   * Remove empty directories
   * @see https://busybox.net/BusyBox.html#rmdir
   */
  rmdir = 'rmdir',
  /**
   * stream editor for filtering and transforming text
   * @see https://busybox.net/BusyBox.html#sed
   */
  sed = 'sed',
  /**
   * Print or check SHA256 checksums
   * @see https://busybox.net/BusyBox.html#sha256sum
   */
  sha256sum = 'sha256sum',
  /**
   * Pause for a time equal to the total of the args given
   * @see https://busybox.net/BusyBox.html#sha512sum
   */
  sleep = 'sleep',
  /**
   * Sort lines of text
   * @see https://busybox.net/BusyBox.html#sort
   */
  sort = 'sort',
  /**
   * split a file into pieces
   * @see https://busybox.net/BusyBox.html#split
   */
  split = 'split',
  /**
   * Display file (default) or filesystem status
   * @see https://busybox.net/BusyBox.html#stat
   */
  stat = 'stat',
  /**
   * Print the last 10 lines of each FILE to standard output
   * @see https://busybox.net/BusyBox.html#tail
   */
  tail = 'tail',
  /**
   * Create, extract, or list files from a tar file
   * @see https://busybox.net/BusyBox.html#tar
   */
  tar = 'tar',
  /**
   * Check file types, compare values etc. Exits with 0/1 based on input
   * @see https://busybox.net/BusyBox.html#test
   */
  test = 'test',
  /**
   * Update the last-modified date on the given FILE[s]
   * @see https://busybox.net/BusyBox.html#touch
   */
  touch = 'touch',
  /**
   * Return an exit code of TRUE (0)
   * @see https://busybox.net/BusyBox.html#true
   */
  true = 'true',
  /**
   * Pause for N microseconds
   * @see https://busybox.net/BusyBox.html#usleep
   */
  usleep = 'usleep',
  /**
   * Discard duplicate lines
   * @see https://busybox.net/BusyBox.html#uniq
   */
  uniq = 'uniq',
  /**
   * call the unlink function to remove the specified file
   * https://linux.die.net/man/1/unlink
   */
  unlink = 'unlink',
  /**
   * Extract files from ZIP archives
   * @see https://busybox.net/BusyBox.html#unzip
   */
  unzip = 'unzip',
  /**
   * Print the user name associated with the current effective user id
   * @see https://busybox.net/BusyBox.html#whoami
   */
  whoami = 'whoami',
  /**
   * build and execute command lines from standard input
   * @see https://busybox.net/BusyBox.html#xargs
   */
  xargs = 'xargs',
  /** Same as "nanozip" above, aliased for convenience */
  zip = 'zip',
}
