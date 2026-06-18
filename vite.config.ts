import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }
  // Mirror server Supabase URL into the client bundle when VITE_ copy is missing.
  if (!env.VITE_SUPABASE_URL && env.SUPABASE_URL) {
    envDefine["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(env.SUPABASE_URL);
  }
  if (!env.VITE_SUPABASE_PUBLISHABLE_KEY && env.SUPABASE_PUBLISHABLE_KEY) {
    envDefine["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(
      env.SUPABASE_PUBLISHABLE_KEY,
    );
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: { host: "::", port: 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: { entry: "server" },
      }),
      ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
      viteReact(),
    ],
  };
});
