interface TokenRefreshWaiter<T> {
	resolve: (token: string) => void;
	reject: (reason: unknown) => void;
}

/**
 * 协调 access token 刷新期间的并发请求。
 * 成功时为每个请求应用新 token；失败时必须全部 reject，避免初始化永久等待。
 */
export function createTokenRefreshQueue<T>() {
	let waiters: TokenRefreshWaiter<T>[] = [];

	return {
		wait(applyToken: (token: string) => T): Promise<T> {
			return new Promise<T>((resolve, reject) => {
				waiters.push({
					resolve: token => resolve(applyToken(token)),
					reject
				});
			});
		},

		resolve(token: string) {
			const current = waiters;
			waiters = [];
			current.forEach(waiter => waiter.resolve(token));
		},

		reject(reason: unknown) {
			const current = waiters;
			waiters = [];
			current.forEach(waiter => waiter.reject(reason));
		},

		get size() {
			return waiters.length;
		}
	};
}
