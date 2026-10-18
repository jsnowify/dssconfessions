import { api } from "./index";

export async function featureRequest(method, path, data, signal) {
  try {
    const response = await api.request({ method, url: path, data, signal });
    return response.data;
  } catch (error) {
    if (signal?.aborted) throw error;
    const clean = new Error(
      error.response?.data?.error ||
        "This is unavailable. Please try again shortly.",
    );
    clean.status = error.response?.status;
    throw clean;
  }
}
