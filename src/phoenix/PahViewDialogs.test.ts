import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { PnwViewDialogHostController } from 'phoenix-wing';
import {
	pahActiveViewDialogOwnerId,
	pahCreatePhoenixViewDialogApi,
	pahRemovedViewDialogOwnerIds,
	pahRegisterViewDialogRenderers,
	pahViewDialogOwnerIds,
	type PhoenixViewDialogOpenRequest
} from './PahViewDialogs';

vi.mock('/$/base', () => ({
	useBase: () => ({ process: { list: [] } })
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ path: '/' })
}));

function fakeHost(): PnwViewDialogHostController {
	const open: PnwViewDialogHostController['open'] = async () => ({
		status: 'closed',
		reason: 'programmatic'
	});
	return {
		registerRenderer: vi.fn(() => vi.fn()),
		resolveRenderer: vi.fn(),
		open: vi.fn(open) as PnwViewDialogHostController['open'],
		submit: vi.fn(),
		cancel: vi.fn(),
		close: vi.fn(),
		closeByView: vi.fn(),
		closeAll: vi.fn(),
		focus: vi.fn(() => false),
		updateBounds: vi.fn(),
		activeDialogs: vi.fn(() => []),
		subscribe: vi.fn(listener => {
			listener([]);
			return vi.fn();
		})
	};
}

describe('Phoenix View Dialog Admin adapter', () => {
	it('由 Host 签发 owner view 与 requestId，业务请求不能提供这两个字段', async () => {
		const host = fakeHost();
		const api = pahCreatePhoenixViewDialogApi(
			host,
			() => '/example/items',
			() => 'request-1'
		);

		await api.open({
			rendererId: 'example.dialog.editor',
			instanceKey: 'edit:42',
			title: '编辑记录',
			props: { id: 42 }
		});

		expect(host.open).toHaveBeenCalledWith({
			rendererId: 'example.dialog.editor',
			instanceKey: 'edit:42',
			title: '编辑记录',
			props: { id: 42 },
			requestId: 'request-1',
			viewId: '/example/items'
		});
		expectTypeOf<keyof PhoenixViewDialogOpenRequest<unknown>>().not.toEqualTypeOf<
			'requestId' | 'viewId'
		>();
	});

	it('活动进程优先作为 owner，并保留当前 route 与所有存活 owner', () => {
		const processes = [
			{ path: '/example/a', active: false },
			{ path: '/example/b', active: true }
		];
		expect(pahActiveViewDialogOwnerId('/example/current', processes)).toBe('/example/b');
		expect(pahViewDialogOwnerIds('/example/current', processes)).toEqual([
			'/example/current',
			'/example/a',
			'/example/b'
		]);
		expect(
			pahRemovedViewDialogOwnerIds(
				['/example/current', '/example/a', '/example/b'],
				['/example/current', '/example/b']
			)
		).toEqual(['/example/a']);
	});

	it('只登记启用模块的 renderer，并可统一退订', () => {
		const host = fakeHost();
		const unregister = vi.fn();
		vi.mocked(host.registerRenderer).mockReturnValue(unregister);
		const registration = pahRegisterViewDialogRenderers(host, [
			{
				name: 'example-plugin',
				phoenix: {
					viewDialogRenderers: [
						{
							rendererId: 'example.dialog.editor',
							load: async () => ({ name: 'ExampleEditor' })
						}
					]
				}
			},
			{
				name: 'disabled-plugin',
				enable: false,
				phoenix: {
					viewDialogRenderers: [
						{
							rendererId: 'disabled.dialog',
							load: async () => ({ name: 'DisabledEditor' })
						}
					]
				}
			}
		]);

		expect(registration.issues).toEqual([]);
		expect(host.registerRenderer).toHaveBeenCalledTimes(1);
		expect(host.registerRenderer).toHaveBeenCalledWith(
			expect.objectContaining({ rendererId: 'example.dialog.editor' })
		);
		registration.dispose();
		expect(unregister).toHaveBeenCalledTimes(1);
	});

	it('重复或非法 renderer 只隔离本模块贡献，不拖垮其他模块', () => {
		const host = fakeHost();
		vi.mocked(host.registerRenderer)
			.mockImplementationOnce(() => {
				throw new TypeError('renderer id already registered');
			})
			.mockReturnValueOnce(vi.fn());

		const registration = pahRegisterViewDialogRenderers(host, [
			{
				name: 'broken-plugin',
				phoenix: {
					viewDialogRenderers: [
						{ rendererId: 'duplicate.dialog', load: async () => ({}) },
						{ rendererId: 'healthy.dialog', load: async () => ({ name: 'Healthy' }) }
					]
				}
			}
		]);

		expect(registration.issues).toEqual([
			{
				moduleId: 'broken-plugin',
				rendererId: 'duplicate.dialog',
				message: 'renderer id already registered'
			}
		]);
		expect(host.registerRenderer).toHaveBeenCalledTimes(2);
	});
});
