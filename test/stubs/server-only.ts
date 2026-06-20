// No-op stub for the `server-only` package so server modules can be imported
// inside Vitest (which doesn't run under the React Server "react-server"
// condition where the real no-op export is used).
export {};
