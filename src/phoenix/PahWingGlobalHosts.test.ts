import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';
import {
	pnwChoiceDialogOpen,
	pnwChoiceDialogRequest,
	pnwPromptChoice,
	pnwResolveChoice
} from 'phoenix-wing';

afterEach(() => {
	pnwResolveChoice(null);
});

describe('PahWingGlobalHosts', () => {
	it('在应用根层只挂载一个 Wing 选择对话框宿主', () => {
		const appSource = readFileSync(
			fileURLToPath(new URL('../App.vue', import.meta.url)),
			'utf8'
		);
		const hostsSource = readFileSync(
			fileURLToPath(new URL('./PahWingGlobalHosts.vue', import.meta.url)),
			'utf8'
		);

		expect(appSource.match(/<pah-wing-global-hosts\s/gu)).toHaveLength(1);
		expect(hostsSource.match(/<pnw-choice-dialog-host\s*\/>/gu)).toHaveLength(1);
		expect(appSource).toContain('pnwCreateViewDialogHost');
		expect(appSource).toContain('pnwProvideViewDialogHost');
		expect(hostsSource.match(/<pnw-view-dialog-host\s/gu)).toHaveLength(1);
		expect(hostsSource).toContain('pahRegisterViewDialogRenderers');
	});

	it('解析全局选择请求并结束等待中的 Promise', async () => {
		const result = pnwPromptChoice({
			title: '停用功能',
			message: '确认停用？',
			choices: [
				{ id: 'confirm', label: '停用', variant: 'danger' },
				{ id: 'cancel', label: '取消' }
			],
			defaultChoiceId: 'cancel'
		});

		expect(pnwChoiceDialogOpen.value).toBe(true);
		expect(pnwChoiceDialogRequest.value?.title).toBe('停用功能');

		pnwResolveChoice('cancel');
		await expect(result).resolves.toEqual({ choiceId: 'cancel', checkedIds: [] });
		expect(pnwChoiceDialogOpen.value).toBe(false);
		expect(pnwChoiceDialogRequest.value).toBeNull();
	});
});
