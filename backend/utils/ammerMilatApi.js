const getEnv = (key, fallback = "") => (process.env[key] || fallback).trim();

/**
 * Ameer-e-Millat (FSD Ameer-e-Millat, fsdameeremillattourism.com) exposes
 * every endpoint under a `/api` prefix (see the "FSD Ameer-e-Millat" Postman
 * collection: `{{url}}/api/login`, `{{url}}/api/available/groups`, etc.).
 * `AmmerMilat_API_URL` in .env is the bare site root, so normalise it here
 * the same way we do for FZ Pakistan.
 */
export const getAmmerMilatApiBaseUrl = () => {
  const baseUrl = getEnv("AmmerMilat_API_URL").replace(/\/+$/, "");

  if (!baseUrl) return "";
  if (baseUrl.endsWith("/api")) return baseUrl;

  return `${baseUrl}/api`;
};

export const getAmmerMilatEnv = getEnv;
