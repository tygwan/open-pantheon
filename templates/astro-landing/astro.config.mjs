import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	// page-writer sets these based on deploy target
	// site: 'https://tygwan.github.io',
	// base: '/DXTnavis',
	vite: {
		plugins: [tailwindcss()]
	}
});
