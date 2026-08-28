<template>
	<error-page :code="404" :desc="$t('找不到您要查找的页面')" :detail="requestedPath" />
</template>

<script lang="ts" setup>
defineOptions({
	name: '404'
});

import ErrorPage from './components/error-page.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { coolReadableNotFoundPath } from '/@/cool/router/resolve';

const route = useRoute();
const requestedPath = computed(() => coolReadableNotFoundPath(route.query.from));
</script>
