import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // IDKit ships a WASM module. The dependency optimiser rewrites the JS into
  // .vite/deps but leaves the .wasm behind it, so the request for
  // idkit_wasm_bg.wasm fell through to the SPA catch-all and came back as HTML.
  // The widget then died inside WebAssembly.instantiate and surfaced one word,
  // "generic_error", which says nothing about a MIME type. Excluding the package
  // from pre-bundling makes Vite serve its files as they sit in node_modules.
  //
  // `qrcode` has to stay pre-bundled: it is CommonJS, and excluding it too made
  // the whole page fail to boot on "does not provide an export named 'default'".
  optimizeDeps: {
    exclude: ["@worldcoin/idkit", "@worldcoin/idkit-core"],
    include: ["qrcode/lib/core/qrcode.js"],
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: false,
  },
});
