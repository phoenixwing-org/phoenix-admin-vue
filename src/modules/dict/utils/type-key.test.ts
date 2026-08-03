import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DICT_TYPE_KEY_MAX_LENGTH, isValidDictTypeKey } from './type-key';

const dictViewSource = readFileSync(new URL('../views/list.vue', import.meta.url), 'utf8');

describe('Cool 字典 type key', () => {
	it('兼容 Host 短 key 与插件稳定命名空间', () => {
		expect(isValidDictTypeKey('brand')).toBe(true);
		expect(isValidDictTypeKey('phoenix-open-issue.issueCategory')).toBe(true);
	});

	it('拒绝空格、路径、非法开头与超长 key', () => {
		expect(isValidDictTypeKey('phoenix open issue')).toBe(false);
		expect(isValidDictTypeKey('phoenix/open-issue')).toBe(false);
		expect(isValidDictTypeKey('.hidden')).toBe(false);
		expect(isValidDictTypeKey(`a${'b'.repeat(DICT_TYPE_KEY_MAX_LENGTH)}`)).toBe(false);
	});

	it('把 namespace 长度和格式校验挂在 Key 字段而不是名称字段', () => {
		const nameField = dictViewSource.slice(
			dictViewSource.indexOf("prop: 'name'"),
			dictViewSource.indexOf("prop: 'key'")
		);
		const keyField = dictViewSource.slice(
			dictViewSource.indexOf("prop: 'key'"),
			dictViewSource.indexOf('// cl-upsert')
		);

		expect(nameField).toContain('maxlength: 20');
		expect(nameField).not.toContain('isValidDictTypeKey');
		expect(keyField).toContain('maxlength: DICT_TYPE_KEY_MAX_LENGTH');
		expect(keyField).toContain('isValidDictTypeKey');
	});
});
