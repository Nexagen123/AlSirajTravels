import axios from "axios";
import crypto from "crypto";
import AlAyyanToken from "../models/AlAyyanToken.js";
import { getAlAyyanApiBaseUrl, getAlAyyanEnv } from "./alAyyanApi.js";

/**
 * Al Ayyan (travelagency.pos247.shop) AgentApi authenticates in two layers:
 *  - a static partner API key sent as `X-Api-Token` on every request (the
 *    partner-supplied docs say `x-api-key`, but the live server rejects that
 *    header with "API Token is missing (use X-Api-Token header)" — trust the
 *    server's own error message over the doc here)
 *  - a per-agent JWT access token (2h lifetime) obtained via Login, renewable
 *    via RefreshToken without a fresh username/password round-trip.
 *
 * We cache the access + refresh token pair in Mongo (mirrors the FZ Pakistan
 * token cache) so we don't log in on every outgoing request.
 */

const apiKeyHeaders = () => ({
  "X-Api-Token": getAlAyyanEnv("AL_AYYAN_API_KEY"),
  "Content-Type": "application/json",
});

const getCredentialHash = () => {
  const parts = [
    getAlAyyanApiBaseUrl(),
    getAlAyyanEnv("AL_AYYAN_API_KEY"),
    getAlAyyanEnv("AL_AYYAN_USERNAME"),
    getAlAyyanEnv("AL_AYYAN_PASSWORD"),
  ];

  return crypto.createHash("sha256").update(parts.join("\n")).digest("hex");
};

const loginAlAyyan = async () => {
  const baseUrl = getAlAyyanApiBaseUrl();
  const username = getAlAyyanEnv("AL_AYYAN_USERNAME");
  const password = getAlAyyanEnv("AL_AYYAN_PASSWORD");

  const response = await axios.post(
    `${baseUrl}/api/AgentApi/Authenticate/Login`,
    { username, password },
    { headers: apiKeyHeaders() },
  );

  return response.data;
};

const refreshAlAyyan = async (refreshToken) => {
  const baseUrl = getAlAyyanApiBaseUrl();

  const response = await axios.post(
    `${baseUrl}/api/AgentApi/RefreshToken`,
    { refreshToken },
    { headers: apiKeyHeaders() },
  );

  return response.data;
};

// Persist the {AccessToken, ExpiresIn, RefreshToken} shape returned by both
// Login and RefreshToken. Refresh a couple of minutes early so an
// in-flight request never races an expiring token.
const persistToken = async (data, credentialHash = getCredentialHash()) => {
  const expirySeconds = Number(data?.ExpiresIn) || 7200;
  const expiryDate = new Date(Date.now() + (expirySeconds - 120) * 1000);

  await AlAyyanToken.deleteMany({});
  return AlAyyanToken.create({
    accessToken: data.AccessToken,
    refreshToken: data.RefreshToken,
    expiry: expiryDate,
    credentialHash,
  });
};

/**
 * Returns a valid Al Ayyan access token, refreshing (or re-logging in) as
 * needed.
 */
export const getValidAlAyyanToken = async () => {
  const credentialHash = getCredentialHash();
  const existing = await AlAyyanToken.findOne().sort({ createdAt: -1 });
  const tokenMatchesCurrentCredentials =
    existing?.credentialHash === credentialHash;

  if (
    existing?.accessToken &&
    existing.expiry > new Date() &&
    tokenMatchesCurrentCredentials
  ) {
    return existing.accessToken;
  }

  if (existing && !tokenMatchesCurrentCredentials) {
    console.log(
      `Al Ayyan credentials changed; old hash=${existing.credentialHash?.slice(0, 8)}, new hash=${credentialHash?.slice(0, 8)} — logging in for fresh token`,
    );
  }

  if (existing?.refreshToken && tokenMatchesCurrentCredentials) {
    try {
      const data = await refreshAlAyyan(existing.refreshToken);
      if (data?.AccessToken) {
        const saved = await persistToken(data, credentialHash);
        console.log("Successfully refreshed Al Ayyan token");
        return saved.accessToken;
      }
    } catch (refreshError) {
      console.warn(
        "Al Ayyan token refresh failed, falling back to login:",
        refreshError.response?.data || refreshError.message,
      );
    }
  }

  try {
    const data = await loginAlAyyan();
    if (!data?.AccessToken) {
      throw new Error(`Login failed: Invalid response — ${JSON.stringify(data)}`);
    }

    const saved = await persistToken(data, credentialHash);
    console.log("Al Ayyan login successful — token cached");
    return saved.accessToken;
  } catch (error) {
    console.error(
      "Al Ayyan login ERROR:",
      error.response?.status,
      JSON.stringify(error.response?.data) || error.message,
    );
    throw new Error("Failed to authenticate with Al Ayyan API");
  }
};

/**
 * Ensures a valid Al Ayyan token exists in the DB, generating one on
 * startup if it doesn't exist yet or has expired.
 */
export const initializeAlAyyanToken = async () => {
  try {
    await getValidAlAyyanToken();
    console.log("Al Ayyan Token Initialized");
  } catch (error) {
    console.warn("Al Ayyan token initialization failed:", error.message);
  }
};

/** Full header set required by every authenticated Al Ayyan AgentApi call. */
export const getAlAyyanAuthHeaders = async () => ({
  "X-Api-Token": getAlAyyanEnv("AL_AYYAN_API_KEY"),
  Authorization: `Bearer ${await getValidAlAyyanToken()}`,
  "Content-Type": "application/json",
});
