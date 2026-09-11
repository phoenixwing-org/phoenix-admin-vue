import { defineAsyncComponent, type Component } from 'vue';
import { useRoute } from 'vue-router';
import {
	type PnwColorScheme,
	type PnwFloatingPanelPosition,
	type PnwPresentationResizeMode,
	type PnwViewDialogHostController,
	type PnwViewDialogOutcome,
	type PnwViewDialogSize,
	usePnwViewDialogHost
} from 'phoenix-wing';
import { useBase } from '/$/base';

export type PhoenixViewDialogRendererModule =
	| Component
	| {
			default: Component;
	  };

/**
 * 业务模块只能声明 renderer loader；组件不会进入请求或持久化状态。
 * rendererId 必须是稳定、全局唯一的插件命名空间 ID。
 */
export interface PhoenixViewDialogRendererContribution {
	readonly rendererId: string;
	readonly load: () => Promise<PhoenixViewDialogRendererModule>;
	readonly movable?: boolean;
	readonly resizable?: boolean | PnwPresentationResizeMode;
}

export interface PhoenixViewDialogOpenRequest<TProps> {
	readonly rendererId: string;
	readonly instanceKey?: string;
	readonly title: string;
	readonly props: TProps;
	readonly size?: Partial<PnwViewDialogSize>;
	readonly colorScheme?: PnwColorScheme;
	readonly position?: PnwFloatingPanelPosition;
}

export interface PhoenixViewDialogApi {
	open<TProps, TResult = unknown>(
		request: PhoenixViewDialogOpenRequest<TProps>
	): Promise<PnwViewDialogOutcome<TResult>>;
}

export interface PahViewDialogOwnerProcess {
	readonly path?: string;
	readonly active?: boolean;
}

export interface PahViewDialogModuleContribution {
	readonly name?: string;
	readonly enable?: boolean;
	readonly phoenix?: {
		readonly viewDialogRenderers?: readonly PhoenixViewDialogRendererContribution[];
	};
}

export interface PahViewDialogRendererRegistrationIssue {
	readonly moduleId: string;
	readonly rendererId?: string;
	readonly message: string;
}

export interface PahViewDialogRendererRegistration {
	readonly issues: readonly PahViewDialogRendererRegistrationIssue[];
	dispose(): void;
}

export function pahActiveViewDialogOwnerId(
	routePath: string,
	processes: readonly PahViewDialogOwnerProcess[]
): string {
	return processes.find(item => item.active)?.path || routePath;
}

export function pahViewDialogOwnerIds(
	routePath: string,
	processes: readonly PahViewDialogOwnerProcess[]
): readonly string[] {
	return Array.from(
		new Set(
			[routePath, ...processes.map(item => item.path)].filter(
				(item): item is string => !!item
			)
		)
	);
}

export function pahRemovedViewDialogOwnerIds(
	previous: readonly string[],
	next: readonly string[]
): readonly string[] {
	const active = new Set(next);
	return previous.filter(ownerId => !active.has(ownerId));
}

export function pahCreateViewDialogRequestId(): string {
	const uuid = globalThis.crypto?.randomUUID?.();
	if (uuid) return `phoenix-view-dialog:${uuid}`;
	return `phoenix-view-dialog:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export function pahCreatePhoenixViewDialogApi(
	host: PnwViewDialogHostController,
	resolveOwnerId: () => string,
	createRequestId: () => string = pahCreateViewDialogRequestId
): PhoenixViewDialogApi {
	return {
		open(request) {
			return host.open({
				...request,
				requestId: createRequestId(),
				viewId: resolveOwnerId()
			});
		}
	};
}

/**
 * Phoenix 插件页面的唯一对话框入口。owner View 与 requestId 均由 Host 签发，
 * 因而业务插件无法跨 Tab 关闭或冒充其他实例。
 */
export function usePhoenixViewDialog(): PhoenixViewDialogApi {
	const host = usePnwViewDialogHost();
	const route = useRoute();
	const { process } = useBase();
	return pahCreatePhoenixViewDialogApi(host, () =>
		pahActiveViewDialogOwnerId(route.path, process.list)
	);
}

function pahLoadedRendererComponent(value: PhoenixViewDialogRendererModule): Component {
	if (typeof value === 'object' && value !== null && 'default' in value) {
		return value.default;
	}
	return value;
}

/**
 * 将模块声明投影进 Wing 白名单 registry。单个模块错误只隔离该贡献，纯 Host 继续。
 */
export function pahRegisterViewDialogRenderers(
	host: PnwViewDialogHostController,
	modules: readonly PahViewDialogModuleContribution[]
): PahViewDialogRendererRegistration {
	const unregister: Array<() => void> = [];
	const issues: PahViewDialogRendererRegistrationIssue[] = [];

	for (const module of modules) {
		if (module.enable === false) continue;
		const moduleId = module.name || '<anonymous-module>';
		for (const contribution of module.phoenix?.viewDialogRenderers || []) {
			try {
				if (typeof contribution.load !== 'function') {
					throw new TypeError('renderer load 必须是函数');
				}
				unregister.push(
					host.registerRenderer({
						rendererId: contribution.rendererId,
						component: defineAsyncComponent(async () =>
							pahLoadedRendererComponent(await contribution.load())
						),
						movable: contribution.movable,
						resizable: contribution.resizable
					})
				);
			} catch (error) {
				issues.push({
					moduleId,
					rendererId: contribution.rendererId,
					message: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}

	return {
		issues,
		dispose() {
			for (const action of unregister.splice(0).reverse()) action();
		}
	};
}
