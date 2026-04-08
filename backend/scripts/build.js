import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(scriptDir, '..')
const outputFile = path.join(backendDir, 'dist', 'server.mjs')

await mkdir(path.dirname(outputFile), { recursive: true })

await build({
  entryPoints: [path.join(backendDir, 'server.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: outputFile,
  minify: true,
  external: ['bufferutil', 'utf-8-validate'],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
})
