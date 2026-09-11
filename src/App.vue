<template>
	<router-view />
	<cool />
	<PahWingGlobalHosts :view-dialog-host="viewDialogHost" />
</template>

<script setup lang="ts">
import { pnwCreateViewDialogHost, pnwProvideViewDialogHost } from 'phoenix-wing';
import Cool from '/@/cool/index.vue';
import PahWingGlobalHosts from '/@/phoenix/PahWingGlobalHosts.vue';

// 每个 Admin 应用实例只拥有一个 controller；业务 View 通过父级注入消费，
// 全局 Host 组件只负责渲染，不能退化为模块级 singleton。
const viewDialogHost = pnwProvideViewDialogHost(
	pnwCreateViewDialogHost({
		maxOpenDialogs: 6
	})
);
</script>
