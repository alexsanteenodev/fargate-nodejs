import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as esbuild from 'esbuild';

/**
 * Options for the Bundler
 */
export interface BundlerOptions {
  /**
   * Entry point file
   */
  entry: string;

  /**
   * Project root directory
   */
  projectRoot: string;

  /**
   * Node.js runtime version
   */
  runtime: string;

  /**
   * Whether to minify the output
   */
  minify?: boolean;

  /**
   * Whether to generate source maps
   */
  sourceMap?: boolean;

  /**
   * External modules that should not be bundled
   */
  externalModules?: string[];
}

/**
 * Bundles Node.js code using esbuild
 */
export class Bundler {
  private readonly entry: string;
  private readonly runtime: string;
  private readonly minify: boolean;
  private readonly sourceMap: boolean;
  private readonly externalModules: string[];

  constructor(options: BundlerOptions) {
    this.entry = options.entry;
    this.runtime = options.runtime;
    this.minify = options.minify ?? false;
    this.sourceMap = options.sourceMap ?? false;
    this.externalModules = options.externalModules || [];
  }

  bundle(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fargate-nodejs-'));

    const target = `node${this.runtime}`;

    const outfile = path.join(tempDir, 'index.js');
    const buildOptions: esbuild.BuildOptions = {
      entryPoints: [this.entry],
      bundle: true,
      platform: 'node',
      target,
      outfile,
      minify: this.minify,
      sourcemap: this.sourceMap,
      external: this.externalModules,
      format: 'cjs',
      logLevel: 'warning',
    };

    esbuild.buildSync(buildOptions);

    const dockerfileSrc = path.join(__dirname, '..', 'lib', 'docker', 'Dockerfile');
    const dockerfileDest = path.join(tempDir, 'Dockerfile');
    fs.copyFileSync(dockerfileSrc, dockerfileDest);

    return tempDir;
  }

  static findProjectRoot(startPath: string): string {
    let currentPath = startPath;
    while (currentPath !== path.dirname(currentPath)) {
      const packageJsonPath = path.join(currentPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    return startPath;
  }
}
