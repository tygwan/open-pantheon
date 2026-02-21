<script>
	import content from '$lib/data/content.json';
</script>

<svelte:head>
	<title>{content.meta.title}</title>
	<meta name="description" content={content.meta.tagline} />
</svelte:head>

<section class="hero">
	<h1>{content.hero.headline}</h1>
	<p>{content.hero.description}</p>
	{#if content.hero.badges}
		<div class="badges">
			{#each content.hero.badges as badge}
				<span class="badge">{badge}</span>
			{/each}
		</div>
	{/if}
</section>

<!-- page-writer adds section components here based on content.sections -->

<style>
	.hero {
		text-align: center;
		padding: var(--pn-space-xl) var(--pn-space-lg);
		min-height: min(80vh, 600px);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: var(--pn-space-md);
	}

	.hero h1 {
		font-size: clamp(2.5rem, 5vw, 4rem);
		letter-spacing: -0.02em;
	}

	.hero p {
		color: var(--pn-text-secondary);
		font-size: 1.25rem;
		max-width: 600px;
	}

	.badges {
		display: flex;
		gap: var(--pn-space-sm);
		flex-wrap: wrap;
		justify-content: center;
	}

	.badge {
		background: var(--pn-bg-card);
		border: 1px solid var(--pn-border);
		border-radius: var(--pn-radius);
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		color: var(--pn-text-secondary);
	}
</style>
