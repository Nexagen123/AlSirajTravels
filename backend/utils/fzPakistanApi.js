const getEnv = (key, fallback = "") => (process.env[key] || fallback).trim();

export const getFzPakistanApiBaseUrl = () => {
  const baseUrl = getEnv("FZ_PAK_API_URL").replace(/\/+$/, "");

  if (!baseUrl) return "";
  if (baseUrl.endsWith("/api")) return baseUrl;

  return `${baseUrl}/api`;
};

export const getFzPakistanEnv = getEnv;
