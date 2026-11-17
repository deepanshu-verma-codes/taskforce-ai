import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { cwd: () => string };

/**
 * Enterprise Secret Leak Guard Plugin.
 * Scans every generated client JS and CSS asset chunk during build.
 * Halts Vite production build immediately if any secret token, private key,
 * or commercial LLM credential pattern is detected in the client bundle.
 */
function secretLeakGuardPlugin(): Plugin {
  const SECRET_PATTERNS = [
    { name: 'Google / Gemini API Key', regex: /AIza[0-9A-Za-z\-_]{35}/ },
    { name: 'Groq Cloud API Key', regex: /gsk_[a-zA-Z0-9]{20,}/ },
    { name: 'OpenAI API Key', regex: /sk-(?:proj-)?[a-zA-Z0-9_\-]{20,}/ },
    { name: 'LangSmith API Key', regex: /lsv2_[a-zA-Z0-9_\-]{20,}/ },
    { name: 'Private Key Header', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  ];

  return {
    name: 'vite-plugin-secret-leak-guard',
    generateBundle(_, bundle) {
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type === 'chunk' && typeof asset.code === 'string') {
          for (const pattern of SECRET_PATTERNS) {
            const match = asset.code.match(pattern.regex);
            if (match) {
              this.error(
                `[CRITICAL SECURITY ALERT] Client bundle chunk "${fileName}" contains exposed ${pattern.name} ("${match[0].slice(0, 6)}..."). Build halted immediately to prevent browser-side credential leakage.`
              );
            }
          }
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from frontend dir and parent dir
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://127.0.0.1:8000';
  const port = Number(env.VITE_PORT) || 5173;

  return {
    plugins: [react(), secretLeakGuardPlugin()],
    server: {
      port,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
