import { computed, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import {
	applyPahPublicLoginBrandingHead,
	readPahPublicLoginBrandingSnapshot,
	type PahPublicLoginBrandingSnapshot
} from './PahPublicLoginBranding';

export const usePahPublicLoginBrandStore = defineStore('pahPublicLoginBrand', () => {
	const snapshot = shallowRef<PahPublicLoginBrandingSnapshot>();

	function initialize() {
		if (snapshot.value) return snapshot.value;
		const value = readPahPublicLoginBrandingSnapshot();
		applyPahPublicLoginBrandingHead(value);
		snapshot.value = value;
		return value;
	}

	const current = computed(() => snapshot.value || initialize());
	const isHostDefault = computed(() => current.value.mode === 'host-default');

	return { current, isHostDefault, initialize };
});
