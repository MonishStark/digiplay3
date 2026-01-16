export const toAbsoluteUrl = (pathname: string) =>
  (import.meta.env.VITE_APP_PUBLIC_URL || '') + pathname;