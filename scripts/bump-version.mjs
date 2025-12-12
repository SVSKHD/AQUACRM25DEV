import fs from 'fs';

const pkgPath = new URL('../package.json', import.meta.url);
const lockPath = new URL('../package-lock.json', import.meta.url);

const incrementPatch = (version) => {
  const parts = version.split('.').map((n) => Number.parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join('.');
};

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const writeJson = (path, data) => fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

const pkgJson = readJson(pkgPath);
const nextVersion = incrementPatch(pkgJson.version ?? '0.0.0');

pkgJson.version = nextVersion;
writeJson(pkgPath, pkgJson);

if (fs.existsSync(lockPath)) {
  const lock = readJson(lockPath);
  lock.version = nextVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion;
  }
  writeJson(lockPath, lock);
}

console.log(`Version bumped to ${nextVersion}`);
