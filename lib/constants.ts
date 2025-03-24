// file: ./lib/constants.ts
// feature: WebApp Core
export const APP_NAME = 'Nlaak Studios WebApp Framework';
export const APP_AUTHOR = 'Nlaak Studios, LLC';
export const APP_COPYRIGHT_YEAR_FROM = 2017;
export const APP_DOMAIN = 'localhost';
export const APP_VERSION = '2025.03.24.1722'; // TODO: Update this on every release
export const APP_PHASE = 'alpha' as 'alpha' | 'beta' | 'qa' | 'prod';
export const APP_DESCRIPTION = 'A Next.js framework for building web applications.';
export const APP_TAGS = ['next.js', 'Convex','shadcn/ui','react', 'typescript', 'tailwindcss', 'pwa','webapp'];
export const APP_URL = `http://${APP_DOMAIN}`;
export const APP_EMAILS = ['contact', 'legal', 'help'];
export const APP_SIGNIN_REDIRECT_ROUTE = '/';

export function appEmail(name: string): string | null {
    const lowerName = name.toLowerCase();
    return APP_EMAILS.includes(lowerName) ? `${lowerName}@${APP_DOMAIN}` : null;
}
