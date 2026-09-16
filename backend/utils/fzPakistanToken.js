import axios from "axios";
import FzPakistanToken from "../models/FzPakistanToken.js";
import { getFzPakistanApiBaseUrl, getFzPakistanEnv } from "./fzPakistanApi.js";

/**
 * Returns a valid FZ Pakistan API token, refreshing it via login if the
 * stored token is missing or about to expire.
 */
export const getValidFzPakistanToken = async () => {
  const existing = await FzPakistanToken.findOne().sort({ createdAt: -1 });

  if (existing && existing.expiry > new Date(Date.now() + 60000)) {
    return existing.token;
  }

  const baseUrl = getFzPakistanApiBaseUrl();
  const email = getFzPakistanEnv("FZ_PAK_EMAIL");
  const agencyCode = getFzPakistanEnv("FZ_PAK_AGENT_CODE");
  const password = getFzPakistanEnv("FZ_PAK_PASSWORD");

  try {
    const response = await axios.post(`${baseUrl}/auth/admin/login`, {
      email,
      agencyCode,
      password,
    });

    if (response.data?.success && response.data?.token) {
      const newToken = response.data.token;

      // Set expiry to 30 minutes from now
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 30);

      await FzPakistanToken.deleteMany({});
      await FzPakistanToken.create({
        token: newToken,
        expiry: expiryDate,
      });

      console.log("Successfully refreshed FZ Pakistan Token");
      return newToken;
    } else {
      throw new Error("Login failed: Invalid response format");
    }
  } catch (error) {
    console.error(
      "Error fetching FZ Pakistan Token:",
      error.response?.data || error.message,
    );
    throw new Error("Failed to authenticate with FZ Pakistan API");
  }
};

/**
 * Ensures a valid FZ Pakistan token exists in the DB, generating one on
 * startup if it doesn't exist yet or has expired.
 */
export const initializeFzPakistanToken = async () => {
  try {
    await getValidFzPakistanToken();
    console.log("FZ Pakistan Token Initialized");
  } catch (error) {
    console.warn("FZ Pakistan token initialization failed:", error.message);
  }
};
