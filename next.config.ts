import type { NextConfig } from "next";

/**
 * Site estático (pasta out/), pronto para GitHub Pages ou qualquer hospedagem simples.
 * Para publicar em subpasta (ex.: https://rover-project.github.io/Rover/), defina
 * NEXT_PUBLIC_BASE_PATH=/Rover no build.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
