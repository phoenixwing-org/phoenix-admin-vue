import { describe, expect, it, vi } from 'vitest';
import {
	createPahHostFilesApi,
	type PahHostFilesRequest,
	type PahHostFilesTransport
} from './PahHostFilesApi';

const OWNER = 'example-plugin';
const FILE_ID = '11111111-1111-4111-8111-111111111111';
const BINDING_ID = '22222222-2222-4222-8222-222222222222';

describe('Phoenix Host Files v1 Vue adapter', () => {
	it('所有动作只生成冻结 Host endpoint，不拼接公开 upload URL', async () => {
		const requests: PahHostFilesRequest[] = [];
		const transport: PahHostFilesTransport = async request => {
			requests.push(request);
			return {} as never;
		};
		const api = createPahHostFilesApi(transport);

		await api.list(OWNER);
		await api.info(OWNER, FILE_ID);
		await api.content(OWNER, FILE_ID, 'preview');
		await api.updateDescriptor(OWNER, FILE_ID, 'drawing.pdf');
		await api.deleteDescriptor(OWNER, FILE_ID);
		await api.restoreDescriptor(OWNER, FILE_ID);
		await api.listBindings(OWNER, { resourceType: 'part', resourceKey: 'P-001' });
		await api.createBinding(OWNER, {
			fileId: FILE_ID,
			resourceType: 'part',
			resourceKey: 'P-001',
			relationType: 'drawing',
			idempotencyKey: 'fixture-1'
		});
		await api.updateBinding(OWNER, BINDING_ID, { isPrimary: true });
		await api.unbind(OWNER, BINDING_ID);
		await api.restoreBinding(OWNER, BINDING_ID);

		expect(requests).toHaveLength(11);
		for (const request of requests) {
			expect(request.url).toMatch(/^\/admin\/phoenix\/files\/example-plugin(?:\/|$)/u);
			expect(request.url).not.toContain('/upload');
		}
		expect(requests[2]).toEqual(
			expect.objectContaining({
				method: 'GET',
				params: { disposition: 'preview' },
				responseType: 'blob'
			})
		);
	});

	it('上传使用 multipart files 字段，并拒绝把不合法 owner 或 identity 放进路径', async () => {
		const requests: PahHostFilesRequest[] = [];
		const transport: PahHostFilesTransport = vi.fn(async request => {
			requests.push(request);
			return {} as never;
		});
		const api = createPahHostFilesApi(transport);
		await api.upload(OWNER, new Blob(['fixture']), 'fixture.txt');

		const request = requests[0];
		expect(request).toEqual(
			expect.objectContaining({
				url: '/admin/phoenix/files/example-plugin',
				method: 'POST'
			})
		);
		expect(request.data).toBeInstanceOf(FormData);
		expect((request.data as FormData).get('files')).toBeInstanceOf(Blob);
		expect(() => api.list('../other')).toThrow('ownerModuleId');
		expect(() => api.info(OWNER, '../file')).toThrow('fileId');
	});
});
