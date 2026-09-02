export type PahHostFileStatus = 'active' | 'deleted';
export type PahHostFileBindingStatus = 'active' | 'unbound';

export interface PahHostFileDescriptorV1 {
	schemaVersion: 1;
	fileId: string;
	version: number;
	sha256: string;
	mime: string;
	originalName: string;
	size: number;
	providerId: string;
	storageIdentity: string;
	status: PahHostFileStatus;
	ownerModuleId: string;
	createdBy: number;
	createdAt: string;
	updatedBy: number | null;
	updatedAt: string;
	deletedBy: number | null;
	deletedAt: string | null;
}

export interface PahHostFileBindingV1 {
	schemaVersion: 1;
	bindingId: string;
	ownerModuleId: string;
	resourceType: string;
	resourceKey: string;
	fileId: string;
	fileVersion: number;
	relationType: string;
	alias: string | null;
	note: string | null;
	attributes: Record<string, string | number | boolean | null>;
	sortOrder: number;
	isPrimary: boolean;
	status: PahHostFileBindingStatus;
	createdBy: number;
	createdAt: string;
	updatedBy: number | null;
	updatedAt: string;
	unboundBy: number | null;
	unboundAt: string | null;
}

export interface PahHostFilesRequest {
	url: string;
	method: 'GET' | 'POST' | 'PATCH';
	params?: Record<string, unknown>;
	data?: unknown;
	headers?: Record<string, string>;
	responseType?: 'blob';
}

export type PahHostFilesTransport = <T>(request: PahHostFilesRequest) => Promise<T>;

export interface PahHostFileBindingInput {
	fileId: string;
	resourceType: string;
	resourceKey: string;
	relationType: string;
	alias?: string | null;
	note?: string | null;
	attributes?: Record<string, string | number | boolean | null>;
	sortOrder?: number;
	isPrimary?: boolean;
	idempotencyKey: string;
}

export type PahHostFileBindingUpdate = Partial<
	Pick<PahHostFileBindingInput, 'alias' | 'note' | 'attributes' | 'sortOrder' | 'isPrimary'>
>;

interface PahHostFilesResult<T> {
	correlationId: string;
	list?: T[];
	descriptor?: PahHostFileDescriptorV1;
	binding?: PahHostFileBindingV1;
	pagination?: { page: number; size: number; total: number };
	storageDeduplicated?: boolean;
	providerReconcilePending?: boolean;
}

const MODULE_ID = /^[a-z][a-z0-9-]{0,127}$/u;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;

function ownerPath(ownerModuleId: string) {
	if (!MODULE_ID.test(ownerModuleId)) throw new Error('Host Files ownerModuleId 不合法');
	return `/admin/phoenix/files/${ownerModuleId}`;
}

function identityPath(value: string, label: string) {
	if (!UUID.test(value)) throw new Error(`Host Files ${label} 不合法`);
	return value.toLowerCase();
}

export function createPahHostFilesApi(transport: PahHostFilesTransport) {
	return {
		upload: (ownerModuleId: string, file: Blob, fileName: string) => {
			const data = new FormData();
			data.append('files', file, fileName);
			return transport<
				PahHostFilesResult<PahHostFileDescriptorV1> & {
					descriptor: PahHostFileDescriptorV1;
					storageDeduplicated: boolean;
					providerReconcilePending: boolean;
				}
			>({
				url: ownerPath(ownerModuleId),
				method: 'POST',
				data
			});
		},
		list: (
			ownerModuleId: string,
			query: { status?: PahHostFileStatus; page?: number; size?: number } = {}
		) =>
			transport<
				PahHostFilesResult<PahHostFileDescriptorV1> & {
					list: PahHostFileDescriptorV1[];
					pagination: { page: number; size: number; total: number };
				}
			>({ url: ownerPath(ownerModuleId), method: 'GET', params: query }),
		info: (ownerModuleId: string, fileId: string) =>
			transport<
				PahHostFilesResult<PahHostFileDescriptorV1> & {
					descriptor: PahHostFileDescriptorV1;
				}
			>({
				url: `${ownerPath(ownerModuleId)}/${identityPath(fileId, 'fileId')}`,
				method: 'GET'
			}),
		content: (
			ownerModuleId: string,
			fileId: string,
			disposition: 'preview' | 'download' = 'download'
		) =>
			transport<Blob>({
				url: `${ownerPath(ownerModuleId)}/${identityPath(fileId, 'fileId')}/content`,
				method: 'GET',
				params: { disposition },
				responseType: 'blob'
			}),
		updateDescriptor: (ownerModuleId: string, fileId: string, originalName: string) =>
			transport<
				PahHostFilesResult<PahHostFileDescriptorV1> & {
					descriptor: PahHostFileDescriptorV1;
				}
			>({
				url: `${ownerPath(ownerModuleId)}/${identityPath(fileId, 'fileId')}`,
				method: 'PATCH',
				data: { originalName }
			}),
		deleteDescriptor: (ownerModuleId: string, fileId: string) =>
			transport({
				url: `${ownerPath(ownerModuleId)}/${identityPath(fileId, 'fileId')}/delete`,
				method: 'POST'
			}),
		restoreDescriptor: (ownerModuleId: string, fileId: string) =>
			transport({
				url: `${ownerPath(ownerModuleId)}/${identityPath(fileId, 'fileId')}/restore`,
				method: 'POST'
			}),
		listBindings: (
			ownerModuleId: string,
			query: { resourceType: string; resourceKey: string; status?: PahHostFileBindingStatus }
		) =>
			transport<PahHostFilesResult<PahHostFileBindingV1> & { list: PahHostFileBindingV1[] }>({
				url: `${ownerPath(ownerModuleId)}/bindings`,
				method: 'GET',
				params: query
			}),
		createBinding: (ownerModuleId: string, input: PahHostFileBindingInput) =>
			transport<PahHostFilesResult<PahHostFileBindingV1> & { binding: PahHostFileBindingV1 }>(
				{
					url: `${ownerPath(ownerModuleId)}/bindings`,
					method: 'POST',
					data: input
				}
			),
		updateBinding: (
			ownerModuleId: string,
			bindingId: string,
			input: PahHostFileBindingUpdate
		) =>
			transport<PahHostFilesResult<PahHostFileBindingV1> & { binding: PahHostFileBindingV1 }>(
				{
					url: `${ownerPath(ownerModuleId)}/bindings/${identityPath(bindingId, 'bindingId')}`,
					method: 'PATCH',
					data: input
				}
			),
		unbind: (ownerModuleId: string, bindingId: string) =>
			transport({
				url: `${ownerPath(ownerModuleId)}/bindings/${identityPath(
					bindingId,
					'bindingId'
				)}/unbind`,
				method: 'POST'
			}),
		restoreBinding: (ownerModuleId: string, bindingId: string) =>
			transport({
				url: `${ownerPath(ownerModuleId)}/bindings/${identityPath(
					bindingId,
					'bindingId'
				)}/restore`,
				method: 'POST'
			})
	};
}
