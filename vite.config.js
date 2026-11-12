import { defineConfig } from "vite";
import { readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";

// Wesl is a simple language that is a superset of wgsl, adding a module system for more extensibility
import viteWesl from "wesl-plugin/vite";

/** @type {import('vite').UserConfig} */
const config = {
  base: "./",
  root: "./",
  appType: "mpa",
  plugins: [viteWesl(), dirSlashRedirect()],
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
};

export default defineConfig(config);

/**
 * Causes the Vite Dev Server to trigger a redirect from e.g. `/labs/lab-01` to `/labs/lab-01/` so
 * Vite correctly serves the `index.html` file (it won't, if the slash isn't there).
 * @returns {import('vite').Plugin}
 */
function dirSlashRedirect() {
  // ENORMOUS thanks to this guy, who had the exact same problem I did and had a solution I could
  // mostly copy from: https://stackoverflow.com/a/75208698/10549827
  return {
    name: "vite-custom-plugin-redirect",
    configureServer(server) {
      const root = server.config.root;
      server.middlewares.use((req, res, next) => {
        const url = req.url;
        if (url === undefined) {
          next();
          return;
        }
        const path = join(root, url);
        stat(path)
          .then((stats) => {
            if (stats.isDirectory() && !url.endsWith("/")) {
              // This is a directory, but they didn't end with a slash. Redirect:
              res.statusCode = 301;
              res.setHeader("Location", url + "/");
              res.setHeader("Content-Length", "0"); // Not sure if necessary... can't hurt?
              res.end();
            } else {
              // Otherwise, let Vite do its thing.
              next();
            }
          })
          // If anything goes wrong, fallback to Vite.
          .catch(() => next());
      });
    },
  };
}
