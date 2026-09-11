import type { PnwLocale } from 'phoenix-wing';

/** Wing 只处理框架文案；Admin 继续持有并持久化实际语言。 */
export function pahWorkbenchLocale(locale: string | null | undefined): PnwLocale {
	return locale?.toLowerCase() === 'en' ? 'en-US' : 'zh-CN';
}
