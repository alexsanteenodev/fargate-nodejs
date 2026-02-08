import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('Package Synthesis', () => {
  const rootDir = path.join(__dirname, '..');
  const fixtureDir = path.join(__dirname, 'fixtures', 'synth-test');
  const staticTarball = path.join(fixtureDir, 'fargate-nodejs.tgz');

  test('packed package synthesizes', () => {
    const output = execSync('npm pack', { cwd: rootDir, encoding: 'utf-8' });
    const tarball = output.trim().split('\n').pop() || '';
    const tarballPath = path.join(rootDir, tarball);
    
    fs.renameSync(tarballPath, staticTarball);

    expect(() => {
      execSync('npm install', { cwd: fixtureDir, stdio: 'pipe' });
      execSync(`npm install ${staticTarball}`, { cwd: fixtureDir, stdio: 'pipe' });
      execSync('npx cdk synth', { cwd: fixtureDir, stdio: 'pipe' });
    }).not.toThrow();
  }, 120000);
});
