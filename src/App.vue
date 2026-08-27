<template>
	<router-view />
	<cool />
	<PahWingGlobalHosts />
</template>

<script setup lang="ts">
import Cool from '/@/cool/index.vue';
import PahWingGlobalHosts from '/@/phoenix/PahWingGlobalHosts.vue';
</script>
