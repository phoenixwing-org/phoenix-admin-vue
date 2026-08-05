<template>
	<cl-view-group ref="ViewGroup">
		<template #item-name="{ item }"> {{ item.name }} - {{ item.key }} </template>

		<template #right>
			<cl-crud ref="Crud">
				<cl-row>
					<!-- 刷新按钮 -->
					<cl-refresh-btn />
					<!-- 新增按钮 -->
					<cl-add-btn />
					<!-- 批量删除 -->
					<cl-multi-delete-btn />
					<cl-flex1 />
					<el-select
						v-model="filters.enabled"
						clearable
						placeholder="启用状态"
						style="width: 120px"
						@change="refresh()"
					>
						<el-option label="启用" value="enabled" />
						<el-option label="停用" value="disabled" />
					</el-select>
					<el-select
						v-model="filters.core"
						clearable
						placeholder="保护级别"
						style="width: 120px"
						@change="refresh()"
					>
						<el-option label="核心项" value="core" />
						<el-option label="普通项" value="normal" />
					</el-select>
					<el-select
						v-model="filters.tag"
						clearable
						filterable
						placeholder="标签"
						style="width: 140px"
						@change="refresh()"
					>
						<el-option
							v-for="tag in availableTags"
							:key="tag"
							:label="tag"
							:value="tag"
						/>
					</el-select>
					<!-- 关键字搜索 -->
					<cl-search-key :placeholder="$t('搜索名称')" />
				</cl-row>

				<cl-row>
					<!-- 数据表格 -->
					<cl-table ref="Table">
						<template #column-enabled="{ scope }">
							<el-tooltip
								:content="scope.row.core ? '核心项不能停用' : '点击切换启用状态'"
								placement="top"
							>
								<el-switch
									:model-value="scope.row.enabled !== false"
									:disabled="scope.row.core"
									:loading="enabledUpdatingIds.has(scope.row.id)"
									:aria-label="
										scope.row.enabled === false ? '启用字典项' : '停用字典项'
									"
									@change="changeEnabled(scope.row, $event)"
								/>
							</el-tooltip>
						</template>
						<template #slot-actions="{ scope }">
							<div class="dict-row-actions">
								<el-tooltip content="新增子项" placement="top">
									<el-button
										v-if="service.dict.info._permission?.add"
										type="success"
										text
										circle
										:icon="Plus"
										aria-label="新增子项"
										@click.stop="append(scope.row)"
									/>
								</el-tooltip>
								<el-tooltip content="编辑" placement="top">
									<el-button
										v-if="service.dict.info._permission?.update"
										type="primary"
										text
										circle
										:icon="Edit"
										aria-label="编辑"
										@click.stop="Crud?.rowEdit(scope.row)"
									/>
								</el-tooltip>
								<el-tooltip
									:content="
										scope.row.core || scope.row.ownerModuleId
											? '核心或插件受管字典项不能删除'
											: '删除'
									"
									placement="top"
								>
									<el-button
										v-if="service.dict.info._permission?.delete"
										type="danger"
										text
										circle
										:icon="Delete"
										:disabled="scope.row.core || !!scope.row.ownerModuleId"
										aria-label="删除"
										@click.stop="Crud?.rowDelete(scope.row)"
									/>
								</el-tooltip>
							</div>
						</template>
					</cl-table>
				</cl-row>

				<cl-row>
					<cl-flex1 />
				</cl-row>

				<!-- 新增、编辑 -->
				<cl-upsert ref="Upsert">
					<template #slot-tags>
						<div class="dict-tags-editor">
							<el-tag
								v-for="tag in tagValues"
								:key="tag"
								closable
								:disable-transitions="true"
								@close="removeTag(tag)"
							>
								{{ tag }}
							</el-tag>
							<el-input
								v-model="tagDraft"
								placeholder="输入标签后按回车；点确定也会提交"
								clearable
								@keydown.enter.prevent="commitTagDraft()"
							/>
						</div>
						<div class="dict-tags-hint">仅支持小写字母、数字、点、下划线和连字符</div>
					</template>
					<template #slot-value="{ scope }">
						<div>
							<el-input
								v-model="scope.value"
								:placeholder="$t('请填写值')"
								clearable
								type="textarea"
								:rows="2"
								class="mb-2"
							/>

							<cl-upload-space
								:text="$t('使用文件')"
								:limit="1"
								@confirm="onFileConfirm"
							/>
						</div>
					</template>
				</cl-upsert>
			</cl-crud>
		</template>
	</cl-view-group>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'dict-list'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useDict } from '../index';
import { useViewGroup } from '/@/plugins/view';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { Plugins } from '/#/crud';
import { DICT_TYPE_KEY_MAX_LENGTH, isValidDictTypeKey } from '../utils/type-key';

const { service } = useCool();
const { dict } = useDict();
const { t } = useI18n();
const filters = reactive({ enabled: '', core: '', tag: '' });
const loadedRows = ref<any[]>([]);
const availableTags = computed(() =>
	[...new Set(loadedRows.value.flatMap(row => (Array.isArray(row.tags) ? row.tags : [])))].sort()
);
const enabledUpdatingIds = reactive(new Set<number>());
const tagDraft = ref('');
const tagValues = ref<string[]>([]);

const { ViewGroup } = useViewGroup({
	label: t('类型'),
	title: t('字典列表'),
	service: service.dict.type,
	onSelect(item) {
		refresh({
			typeId: item.id,
			page: 1,
			prop: 'orderNum',
			order: 'desc'
		});
	},
	onEdit(item) {
		return {
			width: '500px',
			props: {
				labelWidth: '60px'
			},
			items: [
				{
					label: t('名称'),
					prop: 'name',
					component: {
						name: 'el-input',
						props: {
							maxlength: 20
						}
					},
					required: true
				},
				{
					label: 'Key',
					prop: 'key',
					component: {
						name: 'el-input',
						props: {
							maxlength: DICT_TYPE_KEY_MAX_LENGTH,
							showWordLimit: true,
							placeholder: 'brand 或 example-plugin.status',
							disabled: !!item?.ownerModuleId
						}
					},
					rules: {
						validator(_, value, callback) {
							if (!isValidDictTypeKey(value)) {
								callback(
									new Error(
										t('Key 仅允许字母开头，并使用字母、数字、点、横线或下划线')
									)
								);
							} else {
								callback();
							}
						}
					},
					required: true
				}
			]
		};
	},
	onDelete(item, { next }) {
		if (item.ownerModuleId) {
			ElMessage.warning(`该字典类型由 ${item.ownerModuleId} 管理，不能删除`);
			return;
		}
		next(item);
	}
});

// cl-upsert
const Upsert = useUpsert({
	dialog: {
		width: '760px'
	},
	props: {
		labelWidth: '100px'
	},
	items: [
		{
			label: t('上级节点'),
			prop: 'parentId',
			span: 12,
			hidden: ({ scope }) => !!scope.core || !!scope.ownerModuleId,
			component: {
				name: 'cl-select',
				props: {
					labelKey: 'name',
					valueKey: 'id',
					checkStrictly: true,
					tree: true,
					current: true,
					defaultExpandAll: true
				}
			}
		},
		{
			label: t('名称'),
			prop: 'name',
			span: 12,
			required: true,
			component: { name: 'el-input' }
		},
		{
			label: t('值'),
			prop: 'value',
			hidden: ({ scope }) => !!scope.core || !!scope.ownerModuleId,
			component: { name: 'slot-value' }
		},
		{
			label: t('排序'),
			prop: 'orderNum',
			span: 12,
			value: 1,
			hidden: ({ scope }) => !!scope.core,
			component: { name: 'el-input-number', props: { min: 1 } }
		},
		{
			label: '排序（核心保护）',
			prop: 'orderNum',
			span: 12,
			hidden: ({ scope }) => !scope.core,
			component: { name: 'el-input-number', props: { disabled: true } }
		},
		{
			label: '标签',
			prop: 'tags',
			span: 12,
			value: [],
			hidden: ({ scope }) => !!scope.core,
			component: { name: 'slot-tags' }
		},
		{
			label: '标签（核心保护）',
			prop: 'tags',
			span: 12,
			hidden: ({ scope }) => !scope.core,
			component: {
				name: 'el-select',
				props: { multiple: true, disabled: true }
			}
		},
		{
			label: '核心项',
			prop: 'core',
			span: 12,
			value: false,
			component: { name: 'el-switch', props: { disabled: true } }
		},
		{
			label: '所有者',
			prop: 'ownerModuleId',
			span: 12,
			component: {
				name: 'el-input',
				props: { disabled: true, placeholder: '自定义字典' }
			}
		},
		{
			label: t('备注'),
			prop: 'remark',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 3 }
			}
		}
	],
	onOpened(data) {
		tagValues.value = normalizeTags(data.tags);
		tagDraft.value = '';
	},
	onSubmit(data, { next }) {
		if (!commitTagDraft()) return;
		next({
			...data,
			tags: [...tagValues.value],
			typeId: ViewGroup.value?.selected?.id
		});
		tagDraft.value = '';
	},
	plugins: [Plugins.Form.setFocus('name')]
});

// cl-table
const Table = useTable({
	contextMenu: [
		'refresh',
		row => {
			return {
				label: t('新增'),
				hidden: !service.dict.info._permission?.add,
				callback(done) {
					append(row);
					done();
				}
			};
		},
		'edit',
		row => ({
			label: t('删除'),
			hidden: !!row.core || !!row.ownerModuleId || !service.dict.info._permission?.delete,
			callback(done) {
				Crud.value?.rowDelete(row);
				done();
			}
		}),
		'order-asc',
		'order-desc'
	],
	columns: [
		{
			type: 'selection'
		},
		{
			label: t('名称'),
			prop: 'name',
			align: 'left',
			minWidth: 140,
			showOverflowTooltip: true
		},
		{ label: t('ID'), prop: 'id', width: 72 },
		{
			label: t('值'),
			prop: 'value',
			minWidth: 140,
			showOverflowTooltip: true
		},
		{
			label: '状态',
			prop: 'enabled',
			width: 72,
			formatter(row: any) {
				return row.enabled === false ? '停用' : '启用';
			}
		},
		{
			label: '标签',
			prop: 'tags',
			minWidth: 120,
			showOverflowTooltip: true,
			formatter(row: any) {
				return Array.isArray(row.tags) ? row.tags.join(', ') : '';
			}
		},
		{
			label: '治理',
			prop: 'core',
			minWidth: 140,
			showOverflowTooltip: true,
			formatter(row: any) {
				if (row.core) return '核心项';
				return row.ownerModuleId ? `受管 · ${row.ownerModuleId}` : '自定义';
			}
		},
		{
			label: t('备注'),
			prop: 'remark',
			showOverflowTooltip: true,
			minWidth: 130
		},
		{
			label: t('排序'),
			prop: 'orderNum',
			sortable: 'desc',
			width: 72,
			fixed: 'right'
		},
		{
			label: t('创建时间'),
			prop: 'createTime',
			sortable: 'custom',
			minWidth: 150
		},
		{
			label: t('更新时间'),
			prop: 'updateTime',
			sortable: 'custom',
			minWidth: 150
		},
		{
			type: 'op',
			width: 132,
			buttons: ['slot-actions']
		}
	],
	plugins: [Plugins.Table.toTree()]
});

// cl-crud
const Crud = useCrud({
	service: service.dict.info,
	onRefresh(params, { render }) {
		const query = {
			...params,
			...(filters.enabled ? { enabled: filters.enabled === 'enabled' } : {}),
			...(filters.core ? { core: filters.core === 'core' } : {})
		};
		service.dict.info.list(query).then(res => {
			loadedRows.value = res;
			const rows = filters.tag
				? res.filter(
						(row: any) => Array.isArray(row.tags) && row.tags.includes(filters.tag)
					)
				: res;
			render(rows);

			// 刷新字典
			dict.refresh([ViewGroup.value?.selected?.key]);
		});
	}
});

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

async function changeEnabled(row: any, value: boolean | string | number) {
	if (row.core || enabledUpdatingIds.has(row.id)) return;
	const previous = row.enabled !== false;
	const enabled = Boolean(value);
	row.enabled = enabled;
	enabledUpdatingIds.add(row.id);
	try {
		await service.dict.info.update({ id: row.id, enabled });
		ElMessage.success(enabled ? '字典项已启用' : '字典项已停用');
		dict.refresh([ViewGroup.value?.selected?.key]);
	} catch (error: any) {
		row.enabled = previous;
		ElMessage.error(error?.message || '启用状态更新失败');
	} finally {
		enabledUpdatingIds.delete(row.id);
	}
}

function normalizeTags(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return [
		...new Set(value.map(item => String(item).trim().toLowerCase()).filter(Boolean))
	].sort();
}

function commitTagDraft(): boolean {
	const draft = tagDraft.value.trim().toLowerCase();
	if (!draft) return true;
	const candidates = draft
		.split(/[,，]+/)
		.map(item => item.trim())
		.filter(Boolean);
	if (candidates.some(tag => !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(tag))) {
		ElMessage.warning('标签只能包含小写字母、数字、点、下划线和连字符');
		return false;
	}
	const tags = normalizeTags([...tagValues.value, ...candidates]);
	if (tags.length > 32) {
		ElMessage.warning('字典标签不能超过 32 个');
		return false;
	}
	tagValues.value = tags;
	tagDraft.value = '';
	return true;
}

function removeTag(tag: string) {
	tagValues.value = tagValues.value.filter(item => item !== tag);
}

// 追加子集
function append(row: any) {
	Crud.value?.rowAppend({
		parentId: row.id,
		orderNum: 1
	});
}

// 文件选择
function onFileConfirm(selection: any[]) {
	Upsert.value?.setForm('value', selection[0]?.url);
}
</script>

<style lang="scss" scoped>
.dict-row-actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	white-space: nowrap;
}

.dict-row-actions .el-button {
	width: 30px;
	height: 30px;
	margin-left: 0;
	padding: 0;
}

.dict-tags-editor {
	display: flex;
	min-height: 36px;
	align-items: center;
	gap: 6px;
	padding: 3px 6px;
	border: 1px solid var(--el-border-color);
	border-radius: var(--el-border-radius-base);
	flex-wrap: wrap;
}

.dict-tags-editor:focus-within {
	border-color: var(--el-color-primary);
}

.dict-tags-editor :deep(.el-input) {
	min-width: 180px;
	flex: 1;
}

.dict-tags-editor :deep(.el-input__wrapper) {
	padding: 0;
	box-shadow: none;
}

.dict-tags-hint {
	margin-top: 4px;
	color: var(--el-text-color-secondary);
	font-size: 12px;
	line-height: 16px;
}
</style>
