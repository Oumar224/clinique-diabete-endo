import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import IconsResolver from 'unplugin-icons/resolver'
import fs from "node:fs";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";


// ─── Copie automerge_wasm_bg.wasm dans dist-electron/ ────────────────────────
function copyWasmPlugin() {
  return {
    name: 'copy-automerge-wasm',
    buildStart() {
      const candidates = [
        'node_modules/@automerge/automerge/dist/cjs/automerge_wasm_bg.wasm',
        'node_modules/@automerge/automerge/dist/mjs/wasm_bindgen_output/nodejs/automerge_wasm_bg.wasm',
        'node_modules/@automerge/automerge/dist/automerge.wasm',
      ]

      const wasmSrc = candidates
          .map(p => path.resolve(p))
          .find(p => fs.existsSync(p))

      if (!wasmSrc) {
        console.warn('[copy-wasm] ✗ automerge_wasm_bg.wasm introuvable dans node_modules')
        console.warn('[copy-wasm] Chemins testés :\n', candidates.join('\n'))
        return
      }

      const wasmDest = path.resolve('dist-electron/automerge_wasm_bg.wasm')
      fs.mkdirSync(path.dirname(wasmDest), { recursive: true })
      fs.copyFileSync(wasmSrc, wasmDest)
      console.log('[copy-wasm] ✓ copié depuis', wasmSrc)
    },
  }
}

// ─── Copie les fichiers de données (JSON) dans dist-electron/data/ ────────────
function copyDataPlugin() {
  return {
    name: 'copy-data-files',
    buildStart() {
      const srcDir = path.resolve('electron/data')
      const destDir = path.resolve('dist-electron/data')
      if (!fs.existsSync(srcDir)) return
      fs.mkdirSync(destDir, { recursive: true })
      for (const file of fs.readdirSync(srcDir)) {
        const src = path.join(srcDir, file)
        const dest = path.join(destDir, file)
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest)
          console.log(`[copy-data] ✓ ${file}`)
        }
      }
    },
  }
}


// https://vitejs.dev/config/
export default defineConfig({
  resolve : {
    alias: {
      "@": path.resolve('src'),
      "_electron":path.resolve('electron'),
      "_app":path.resolve('.'),
    }
  } ,
  plugins: [
    vue(),
    AutoImport({
      resolvers: [
        ElementPlusResolver({
          importStyle: false,
        }),
      ],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [
        ElementPlusResolver({
          importStyle: false
        }),
        IconsResolver({
          prefix: 'icon',
          enabledCollections: ['ep'],
        }),
      ],
      dts: 'src/components.d.ts',
    }),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite:{
          plugins: [
            copyWasmPlugin(),
            copyDataPlugin(),
            wasm(),
            topLevelAwait()
          ],
          resolve:{
            alias: {
              "_electron":path.resolve('electron'),
              "_app":path.resolve('.'),
            }
          },
            build:{
              rollupOptions:{
                external:["node:sqlite"]
              }
            },
        }
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: {
      },
    }),
  ],
})
