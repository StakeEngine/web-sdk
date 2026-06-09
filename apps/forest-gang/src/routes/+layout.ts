// if you want to generate a static html file
// for your page.
// Documentation: https://kit.svelte.dev/docs/page-options#prerender
export const prerender = true;

export const ssr = false;

// How to manage the trailing slashes in the URLs
// the URL for about page witll be /about with 'ignore' (default)
// the URL for about page witll be /about/ with 'always'
// https://kit.svelte.dev/docs/page-options#trailingslash
export const trailingSlash = 'ignore';
