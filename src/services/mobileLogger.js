const isDevelopment = globalThis.__DEV__ === true;

export const mobileLogger = {
  warn: (event) => {
    if (isDevelopment) console.warn(`[mobile] ${event}`);
  },
  error: (event) => {
    if (isDevelopment) console.error(`[mobile] ${event}`);
  },
};
