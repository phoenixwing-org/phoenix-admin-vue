/** 用单个斜杠连接服务地址，避免 `/dev` 与 `/admin` 形成 `/dev//admin`。 */
export function joinServiceUrl(baseUrl: string, path: string): string {
	const base = baseUrl.replace(/\/+$/, '');
	const suffix = path.replace(/^\/+/, '');

	if (!base) {
		return suffix ? `/${suffix}` : '/';
	}

	return suffix ? `${base}/${suffix}` : base;
}
