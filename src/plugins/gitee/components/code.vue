<template>
	<button
		type="button"
		class="cl-comm__icon gitee-link"
		title="在 Gitee 查看 Phoenix Admin"
		aria-label="在 Gitee 查看 Phoenix Admin"
		@click="toCode"
	>
		<img class="gitee-link__mark" :src="giteeIconUrl" alt="" aria-hidden="true" />
	</button>
</template>

<script setup lang="ts">
import giteeIconUrl from '/@/modules/base/static/svg/gitee.svg?url';

const PHOENIX_ADMIN_GITEE_URL = 'https://gitee.com/phoenixwing/phoenix-admin-vue';

function toCode() {
	window.open(PHOENIX_ADMIN_GITEE_URL, '_blank', 'noopener,noreferrer');
}
</script>

<style lang="scss" scoped>
.gitee-link {
	padding: 0;
	font: inherit;

	&__mark {
		display: block;
		width: 16px;
		height: 16px;
	}
}
</style>
