export const apiFetch = (url, options = {}) =>
  fetch(url, { ...options, credentials: "include" });
