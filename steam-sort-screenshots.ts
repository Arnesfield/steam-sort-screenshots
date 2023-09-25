#!/usr/bin/env -S deno run --allow-read --allow-write

import * as path from 'https://deno.land/std@0.55.0/path/mod.ts';

// sort and move Steam uncompressed screenshots into directories

async function exists(filename: string) {
  try {
    await Deno.stat(filename);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw error;
    }
  }
}

const glob = '*.png';
const sortPath =
  Deno.args.length === 0 ? Deno.cwd() : path.resolve(Deno.args[0]);
const proceed = confirm(`Sort Steam screenshots (${glob}) in "${sortPath}"?`);
if (!proceed) Deno.exit(1);

const regExp = path.globToRegExp(glob);
const cachedDirs = new Set<string>();
for await (const entry of Deno.readDir(sortPath)) {
  // make sure file matches glob and includes `_`
  let index: number;
  if (
    !entry.isFile ||
    (index = entry.name.indexOf('_')) === -1 ||
    !regExp.test(entry.name)
  ) {
    continue;
  }

  const dirName = entry.name.slice(0, index);
  const dirPath = path.resolve(sortPath, dirName);
  if (cachedDirs.has(dirPath)) {
    // do nothing and ASSUME anyway that the directory was
    // created and never removed until execution has finished
  } else if (await exists(dirPath)) {
    cachedDirs.add(dirPath);
  } else {
    console.log('Creating %o', dirPath);
    await Deno.mkdir(dirPath);
    cachedDirs.add(dirPath);
  }

  // move file
  const filePaths = {
    old: { absolute: path.resolve(sortPath, entry.name), relative: entry.name },
    new: {
      absolute: dirPath + path.SEP + entry.name,
      relative: dirName + path.SEP + entry.name
    }
  };
  try {
    console.log(
      'Moving %o to %o',
      filePaths.old.relative,
      filePaths.new.relative
    );
    await Deno.rename(filePaths.old.absolute, filePaths.new.absolute);
  } catch (error) {
    console.error(
      'Failed: %o to %o',
      filePaths.old.relative,
      filePaths.new.relative,
      error
    );
  }
}
