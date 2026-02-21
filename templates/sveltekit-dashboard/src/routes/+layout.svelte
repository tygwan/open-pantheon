<script>
	import '../app.css';

	let { children } = $props();
</script>

<div class="layout">
	<header class="header">
		<nav>
			<!-- page-writer populates with project name and navigation -->
		</nav>
	</header>

	<main class="main">
		{@render children()}
	</main>

	<footer class="footer">
		<p>Built with <a href="https://github.com/tygwan/foliocraft">foliocraft</a></p>
	</footer>
</div>

<style>
	.layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--pn-bg-secondary);
		border-bottom: 1px solid var(--pn-border);
		padding: var(--pn-space-md) var(--pn-space-lg);
	}

	.main {
		flex: 1;
	}

	.footer {
		text-align: center;
		padding: var(--pn-space-lg);
		color: var(--pn-text-muted);
		font-size: 0.875rem;
		border-top: 1px solid var(--pn-border);
	}
</style>
