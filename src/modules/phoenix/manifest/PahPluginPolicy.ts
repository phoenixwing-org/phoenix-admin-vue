import {
	PAH_PLUGIN_FORMAT_VERSION,
	type PahDictionaryContribution,
	type PahPluginManifest,
	type PahPluginMigrationDeclaration
} from './PahPluginManifest';

const dictionaryTagPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/u;

function assertDictionaryContribution(
	value: unknown,
	index: number
): asserts value is PahDictionaryContribution {
	if (!isRecord(value)) throw new Error(`dictionaryContributions[${index}] 必须是对象`);
	if (
		typeof value.typeKey !== 'string' ||
		value.typeKey.length > 128 ||
		!value.typeKey.includes('.')
	) {
		throw new Error(`dictionaryContributions[${index}] typeKey 无效`);
	}
	if (value.retainOnUninstall !== true) {
		throw new Error(`dictionaryContributions[${index}] 必须在卸载时保留`);
	}
	if (!Array.isArray(value.items) || value.items.length === 0) {
		throw new Error(`dictionaryContributions[${index}] items 不能为空`);
	}
	for (const [itemIndex, item] of value.items.entries()) {
		if (!isRecord(item)) {
			throw new Error(`dictionaryContributions[${index}].items[${itemIndex}] 必须是对象`);
		}
		if (item.tags !== undefined) {
			if (
				!Array.isArray(item.tags) ||
				item.tags.length > 32 ||
				item.tags.some(tag => typeof tag !== 'string' || !dictionaryTagPattern.test(tag))
			) {
				throw new Error(`dictionaryContributions[${index}].items[${itemIndex}] tags 无效`);
			}
		}
		if (item.enabled !== undefined && typeof item.enabled !== 'boolean') {
			throw new Error(`dictionaryContributions[${index}].items[${itemIndex}] enabled 无效`);
		}
		if (item.itemClass === 'core' && item.enabled === false) {
			throw new Error(`dictionaryContributions[${index}].items[${itemIndex}] core 不能停用`);
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSafeMigrationPath(value: unknown): value is string {
	if (typeof value !== 'string' || value.includes('\\')) return false;
	const segments = value.split('/');
	return (
		segments.length >= 2 &&
		segments[0] === 'migrations' &&
		value.endsWith('.sql') &&
		segments.every(segment => /^[a-z0-9][a-z0-9._-]*$/u.test(segment))
	);
}

function assertMigration(
	value: unknown,
	index: number
): asserts value is PahPluginMigrationDeclaration {
	if (!isRecord(value)) throw new Error(`migrations[${index}] 必须是对象`);
	if (typeof value.checksum !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(value.checksum)) {
		throw new Error(`migrations[${index}] checksum 必须是 sha256: 加 64 位小写十六进制`);
	}
	if (!isRecord(value.artifact) || value.artifact.format !== 'sql') {
		throw new Error(`migrations[${index}] 只支持 SQL artifact`);
	}
	if (!isSafeMigrationPath(value.artifact.path)) {
		throw new Error(
			`migrations[${index}] artifact.path 必须是安全的 migrations/*.sql 相对路径`
		);
	}
}

/** Vue 只拒绝明显不兼容/不安全的输入，完整契约仍由 Node 权威校验。 */
export function parsePahPluginManifest(text: string): PahPluginManifest {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error('manifest JSON 格式错误');
	}
	if (!isRecord(value)) throw new Error('manifest 必须是 JSON 对象');
	if (value.formatVersion !== PAH_PLUGIN_FORMAT_VERSION) {
		throw new Error(`只接受 formatVersion ${PAH_PLUGIN_FORMAT_VERSION}`);
	}
	if (!Array.isArray(value.migrations)) throw new Error('migrations 必须是数组');
	value.migrations.forEach(assertMigration);
	if (value.dictionaryContributions !== undefined) {
		if (!Array.isArray(value.dictionaryContributions)) {
			throw new Error('dictionaryContributions 必须是数组');
		}
		value.dictionaryContributions.forEach(assertDictionaryContribution);
	}
	return value as unknown as PahPluginManifest;
}

export function pahHasMigrations(manifest: PahPluginManifest): boolean {
	return manifest.migrations.length > 0;
}

export function pahCanDirectInstall(manifest: PahPluginManifest): boolean {
	return !pahHasMigrations(manifest);
}

/** handler 二次门禁：模板条件不能成为 DDL 安全边界。 */
export function pahAssertDirectInstallAllowed(manifest: PahPluginManifest): void {
	if (!pahCanDirectInstall(manifest)) {
		throw new Error('包含 DDL 的插件只能生成 dry-run 计划，并由受控发布编排执行');
	}
}
