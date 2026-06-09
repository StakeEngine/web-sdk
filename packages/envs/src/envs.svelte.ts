import * as envStaticPublic from '$env/static/public';

export let PUBLIC_SITE_MODE = envStaticPublic.PUBLIC_SITE_MODE || '';
export let PUBLIC_SENTRY_DSN = envStaticPublic.PUBLIC_SENTRY_DSN || '';
export let PUBLIC_CHROMATIC = envStaticPublic.PUBLIC_CHROMATIC === 'true';

// ==============================================================================================================================
// $env/dynamic/private
// If you're using adapter=node (or running vite preview), this is equivalent to process.env.
// This module only includes variables that do not begin with config.kit.env.publicPrefix.

// This module cannot be imported into client-side code. e.g.
// import { env } from '$env/dynamic/private';
// console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);

// In dev, $env/dynamic always includes environment variables from .env.
// In prod, this behavior will depend on your adapter.
// ==============================================================================================================================

// ==============================================================================================================================
// $env/dynamic/public = $env/dynamic/private + "PUBLIC_"
// ==============================================================================================================================

// ==============================================================================================================================
// $env/static/private
// Environment variables loaded by Vite from .env files and process.env

// Like $env/dynamic/private, this module cannot be imported into client-side code.
// Unlike $env/dynamic/private, the values exported from this module are statically injected into your bundle at build time,
// enabling optimisations like dead code elimination. (like tree shaking I assume 🤷‍♂️)

// Note that all environment variables referenced in your code should be declared (for example in an .env file),
// even if they don't have a value until the app is deployed:

// MY_FEATURE_FLAG=""
// You can override .env values from the command line like so:

// MY_FEATURE_FLAG="enabled" npm run dev
// ==============================================================================================================================

// ==============================================================================================================================
// $env/static/public = $env/static/private + "PUBLIC_"

// Values are replaced statically at build time.

// import { PUBLIC_BASE_URL } from '$env/static/public';

// PUBLIC_BASE_URL=""
// You can override .env values from the command line like so:

// PUBLIC_BASE_URL="xxx" npm run dev
// ==============================================================================================================================
