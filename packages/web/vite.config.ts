import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import rootPackage from '../../package.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal ANSI colour set used only by the dev-server banner.
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
};

const WORDMARK = [
  `  ____                  _____ ____ ___   _____                       `,
  ` / __ \\                / ___|  __/ __ \\ / ____|                      `,
  `| |  | |_ __   ___ _ _| (___ |__ \\ ___ | (___                       `,
  `| |  | |'_ \\ / _ \\ '_ \\___ \\| |/ / |__/_ \\___ \\                     `,
  `| |__| | |_) |  __/ | | __/ / |__| | __| __/ /                      `,
  ` \\___\\_| .__/ \\___|_| |_____/|_|  | _____|\\____|                      `,
  `       |_|                                                           `,
  ``,
  `        O P E N   S E O   C H E C K E R                               `,
];

const TAGLINE = 'FRONTEND  ·  Vite + React 19';

/** Print a magenta FE banner that mirrors the BE banner from the API. */
function printFrontendBanner(port: number, version = rootPackage.version): void {
  const color = ANSI.magenta;
  const innerWidth = 70;
  const frame = `${ANSI.bold}${color}`;
  const horiz = `${frame}+${'='.repeat(innerWidth + 2)}+${ANSI.reset}`;
  const line = (content: string) =>
    `${frame}|${ANSI.reset} ${ANSI.bold}${color}${content.padEnd(innerWidth)}${ANSI.reset} ${frame}|${ANSI.reset}`;
  const tagline = `${frame}|${ANSI.reset} ${ANSI.dim}${color}${TAGLINE.padEnd(innerWidth)}${ANSI.reset} ${frame}|${ANSI.reset}`;

  const out = [
    '',
    horiz,
    ...WORDMARK.map(l => line(l)),
    tagline,
    horiz,
    `  ${ANSI.bold}${color}●${ANSI.reset}  ${ANSI.bold}${color}FRONTEND${ANSI.reset}  x  ${ANSI.bold}Vite + React 19${ANSI.reset}`,
    `  ${ANSI.dim}v${version}${ANSI.reset}    ${ANSI.bold}▶${ANSI.reset} dev server on ${ANSI.bold}${ANSI.green}http://localhost:${port}${ANSI.reset}`,
    `  ${ANSI.dim}/api proxied to the backend at :7437 (HMR + SPA).${ANSI.reset}`,
    `  ${ANSI.dim}Ctrl+C to stop. Logs forwarded to terminal.${ANSI.reset}`,
    '',
  ];
  // eslint-disable-next-line no-console
  console.log(out.join('\n'));
}

function frontendBannerPlugin(): import('vite').Plugin {
  return {
    name: 'oseo-frontend-banner',
    configureServer(server) {
      const httpServer = server.httpServer;
      if (!httpServer) return;
      const print = () => {
        const address = httpServer.address();
        const port = typeof address === 'object' && address ? address.port : 5173;
        printFrontendBanner(port);
      };
      if (httpServer.listening) {
        print();
      } else {
        httpServer.once('listening', print);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), frontendBannerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../../public'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7437',
        changeOrigin: true,
      },
    },
  },
});
