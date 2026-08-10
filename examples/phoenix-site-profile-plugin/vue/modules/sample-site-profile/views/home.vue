<template>
	<main class="sample-home">
		<section>
			<img src="../../../../assets/logo.svg" alt="Acme Workspace" />
			<p class="eyebrow">WELCOME</p>
			<h1>Acme Workspace</h1>
			<p>这是由站点外观插件贡献的权限内启动页。</p>
		</section>
	</main>
</template>

<script lang="ts" setup>
defineOptions({ name: 'sample-site-profile-home' });
</script>

<style scoped>
.sample-home {
	display: grid;
	min-height: 100%;
	padding: 24px;
	place-items: center;
	color: var(--pnw-workbench-default-text, #182236);
	background: var(--pnw-workbench-default-bg, #f5f7fb);
}

.sample-home section {
	width: min(100%, 680px);
	padding: 40px;
	border: 1px solid var(--pnw-workbench-default-border, #dbe3ed);
	border-radius: 20px;
	background: var(--pnw-workbench-default-surface, #fff);
	box-shadow: 0 18px 46px rgb(18 35 58 / 10%);
}

.sample-home img {
	display: block;
	width: 180px;
	height: 48px;
	object-fit: contain;
	object-position: left center;
}

.sample-home .eyebrow {
	margin: 32px 0 6px;
	color: #3468df;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.16em;
}

.sample-home h1 {
	margin: 0;
	font-size: clamp(30px, 5vw, 48px);
}

.sample-home p:last-child {
	margin: 12px 0 0;
	color: var(--pnw-workbench-default-muted, #687386);
}
</style>
