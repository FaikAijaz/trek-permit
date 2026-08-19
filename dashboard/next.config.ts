import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Otherwise Turbopack walks up from here, finds an unrelated
    // package-lock.json outside this git repo (some other project on this
    // machine), and warns about it on every build.
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
