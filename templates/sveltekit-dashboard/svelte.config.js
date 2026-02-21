import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		paths: {
			// page-writer sets this based on deploy target
			// e.g., base: '/n8n' for GitHub Pages
			base: ''
		}
	}
};

export default config;
