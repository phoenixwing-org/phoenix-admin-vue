export const DICT_TYPE_KEY_MAX_LENGTH = 128;

/**
 * Cool keeps backward-compatible short keys (for example `brand`) and also
 * accepts plugin-owned dotted namespaces such as `example-plugin.status`.
 */
export function isValidDictTypeKey(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.length <= DICT_TYPE_KEY_MAX_LENGTH &&
		/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(value)
	);
}
