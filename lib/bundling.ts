import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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

  /**
   * Bundle the code and return the output directory
   */
  bundle(): string {
    // Create a temporary directory for the bundle
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fargate-nodejs-'));

    // Get target from runtime
    const target = `node${this.runtime}`;

    // Build with esbuild
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

    // Copy the Dockerfile to the temp directory
    // __dirname points to dist/ after compilation, so go up and into lib/
    const dockerfileSrc = path.join(__dirname, '..', 'lib', 'docker', 'Dockerfile');
    const dockerfileDest = path.join(tempDir, 'Dockerfile');
    fs.copyFileSync(dockerfileSrc, dockerfileDest);

    return tempDir;
  }

  /**
   * Find the project root by looking for package.json
   */
  static findProjectRoot(startPath: string): string {
    let currentPath = startPath;
    while (currentPath !== path.dirname(currentPath)) {
      const packageJsonPath = path.join(currentPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    // If not found, return the start path
    return startPath;
  }
}
