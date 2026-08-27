import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	pahCreateHostPathContext,
	pahHostDependencyId,
	pahIsPathWithinRoot,
	pahNormalizeViteFsPath
} from '../../scripts/pah-host-runtime-dependencies';

function realpathMap(entries: Record<string, string>) {
	return (value: string) => entries[pahNormalizeViteFsPath(value)];
}

describe('Pah Host runtime dependency paths', () => {
	it('统一 Windows 反斜杠、Vite 正斜杠、file URL 与查询参数', () => {
		expect(
			pahNormalizeViteFsPath(
				'C:\\Phoenix Admin\\src\\modules\\example\\views\\list.vue?vue&type=script'
			)
		).toBe('C:/Phoenix Admin/src/modules/example/views/list.vue');
		expect(
			pahNormalizeViteFsPath(
				'/@fs/C:/Phoenix Admin/src/modules/example/views/list.vue?vue&type=script'
			)
		).toBe('C:/Phoenix Admin/src/modules/example/views/list.vue');
		expect(
			pahNormalizeViteFsPath(
				'file:///C:/Phoenix%20Admin/src/modules/example/views/list.vue#fragment'
			)
		).toBe('C:/Phoenix Admin/src/modules/example/views/list.vue');
	});

	it('Windows 路径按目录边界且不区分盘符大小写', () => {
		expect(pahIsPathWithinRoot('c:/Phoenix Admin/src/main.ts', 'C:/Phoenix Admin')).toBe(true);
		expect(pahIsPathWithinRoot('C:/Phoenix Administrator/main.ts', 'C:/Phoenix Admin')).toBe(
			false
		);
	});

	it('普通 Host 文件保持 Host 解析，外部目录交给依赖适配器', () => {
		const context = pahCreateHostPathContext({
			hostRoot: 'C:\\Phoenix Admin',
			realpath: realpathMap({
				'C:/Phoenix Admin': 'C:/Phoenix Admin',
				'C:/Phoenix Admin/src/main.ts': 'C:/Phoenix Admin/src/main.ts',
				'D:/Products/Open Issue/views/list.vue': 'D:/Products/Open Issue/views/list.vue'
			})
		});

		expect(context.isHostImporter('C:\\Phoenix Admin\\src\\main.ts')).toBe(true);
		expect(context.isHostImporter('D:\\Products\\Open Issue\\views\\list.vue')).toBe(false);
	});

	it('将 Host 内 Junction 挂载识别为外部插件', () => {
		const context = pahCreateHostPathContext({
			hostRoot: 'C:/Phoenix Admin',
			realpath: realpathMap({
				'C:/Phoenix Admin': 'C:/Phoenix Admin',
				'C:/Phoenix Admin/src/modules/open-issue/views/list.vue':
					'D:/Products/Open Issue/views/list.vue'
			})
		});

		expect(
			context.isHostImporter(
				'C:\\Phoenix Admin\\src\\modules\\open-issue\\views\\list.vue?vue&type=script'
			)
		).toBe(false);
	});

	it('通过真实目录挂载识别带空格的外部插件', () => {
		const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pah path '));
		const hostRoot = path.join(temporaryRoot, 'Phoenix Admin Host');
		const externalRoot = path.join(temporaryRoot, 'Open Issue Plugin');
		const mountRoot = path.join(hostRoot, 'src', 'modules', 'open-issue');
		const importer = path.join(mountRoot, 'views', 'list.vue');

		try {
			fs.mkdirSync(path.join(hostRoot, 'src', 'modules'), { recursive: true });
			fs.mkdirSync(path.join(externalRoot, 'views'), { recursive: true });
			fs.writeFileSync(path.join(externalRoot, 'views', 'list.vue'), '<template />');
			fs.symlinkSync(
				externalRoot,
				mountRoot,
				process.platform === 'win32' ? 'junction' : 'dir'
			);

			const context = pahCreateHostPathContext({ hostRoot });
			expect(context.isHostImporter(importer)).toBe(false);
		} finally {
			fs.rmSync(temporaryRoot, { recursive: true, force: true });
		}
	});

	it('Host 自身位于 Junction 时仍识别其物理目录', () => {
		const context = pahCreateHostPathContext({
			hostRoot: 'C:/Mounted Admin',
			realpath: realpathMap({
				'C:/Mounted Admin': 'D:/Repositories/Phoenix Admin',
				'C:/Mounted Admin/src/main.ts': 'D:/Repositories/Phoenix Admin/src/main.ts'
			})
		});

		expect(context.isHostImporter('C:/Mounted Admin/src/main.ts')).toBe(true);
		expect(context.hostRealRoot).toBe('D:/Repositories/Phoenix Admin');
	});

	it('Host 依赖 ID 始终使用 Vite 正斜杠并保留带空格目录', () => {
		expect(
			pahHostDependencyId(
				'C:\\Phoenix Admin\\node_modules\\marked',
				'marked',
				'marked/lib/marked.esm.js'
			)
		).toBe('C:/Phoenix Admin/node_modules/marked/lib/marked.esm.js');
	});
});
