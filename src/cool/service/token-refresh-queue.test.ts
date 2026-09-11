import { describe, expect, it, vi } from 'vitest';
import { createTokenRefreshQueue } from './token-refresh-queue';

describe('token refresh queue', () => {
	it('刷新成功后释放全部等待请求并应用新 token', async () => {
		const queue = createTokenRefreshQueue<string>();
		const firstApply = vi.fn(token => `first:${token}`);
		const secondApply = vi.fn(token => `second:${token}`);
		const first = queue.wait(firstApply);
		const second = queue.wait(secondApply);

		expect(queue.size).toBe(2);
		queue.resolve('new-token');

		await expect(first).resolves.toBe('first:new-token');
		await expect(second).resolves.toBe('second:new-token');
		expect(queue.size).toBe(0);
	});

	it('刷新失败后拒绝并清空全部等待请求', async () => {
		const queue = createTokenRefreshQueue<string>();
		const first = queue.wait(token => token);
		const second = queue.wait(token => token);
		const failure = new Error('refresh failed');

		queue.reject(failure);

		await expect(first).rejects.toBe(failure);
		await expect(second).rejects.toBe(failure);
		expect(queue.size).toBe(0);
	});

	it('失败清理后允许下一轮刷新正常完成', async () => {
		const queue = createTokenRefreshQueue<string>();
		const failed = queue.wait(token => token);
		queue.reject(new Error('first refresh failed'));
		await expect(failed).rejects.toThrow('first refresh failed');

		const recovered = queue.wait(token => token);
		queue.resolve('recovered-token');

		await expect(recovered).resolves.toBe('recovered-token');
	});
});
