# Phoenix 品牌二元生效点检表

> **状态：计划基线，尚未实施**<br>
> 设计依据见[《Phoenix Admin 品牌二元生效整改计划》](Pah品牌二元生效整改计划.md)。勾选只表示已有可复查证据，不能用“保存成功”代替“当前已应用”。

## 1. 契约一致性

- [ ] 只有完整 Host 与完整插件两个品牌来源。
- [ ] 三仓不再把 `hostBindings`、`effectiveSources` 或按字段混合作为产品契约。
- [ ] “已安装”“已选择”“待重启”“当前生效”在 API 和 UI 中含义不同且可辨认。
- [ ] 品牌插件只提供静态声明和资源；Admin/Pah 拥有选择、校验、快照、revision 与回退。
- [ ] 不存在产品 ID 特例、DOM `MutationObserver` 生产兜底或 localStorage 权威品牌状态。

## 2. 状态与操作矩阵

| 当前公开快照 | Host 编辑 | 保存结果 | 当前品牌变化 | 生效动作 |
| --- | --- | --- | --- | --- |
| `mode=host` | 允许 | 保存 Host 配置 | 立即原子发布新 Host revision | 无需重启；新开、刷新或重登页面生效 |
| `mode=plugin` | 允许，标为备用 | 保存 Host 备用配置 | 插件 revision 不变 | 停用/取消选择插件并重启 |
| 插件待启用/待更新 | 按当前快照处理 | 不越过当前模式 | 当前 revision 不变 | 重启校验后原子发布 |
| 插件待停用 | 允许维护 Host 备用 | 只更新 Host 配置 | 当前插件 revision 不变 | 重启后发布最新 Host |

- [ ] Host 模式保存提示“已保存并应用”，并返回新的 snapshot revision。
- [ ] Host 模式保存后不要求 API/Web 重启。
- [ ] Host 新 revision 由新打开、刷新或重新登录的页面消费。
- [ ] 已打开的其他页面保持启动时 revision，不做 DOM 热替换，刷新后切换。
- [ ] 插件模式保存提示“已保存为备用，尚未应用”，snapshot revision 不变。
- [ ] 切回 Host 只要求停用或取消选择，不要求卸载插件。
- [ ] 插件启用、停用、切换和声明更新均显示待重启状态。

## 3. Host 品牌完整投影

| Host 字段 | 登录页/浏览器 | 登录后工作台 |
| --- | --- | --- |
| 标题 | 左右品牌文案、页面名称 | 左上角主标题、Runtime 就绪日志 |
| 副标题 | 登录说明/辅助文案 | 左上角副标题 |
| 浅色 Logo | 浅色品牌图、默认 favicon 候选 | 浅色主题 Logo |
| 深色 Logo | 深色品牌图 | 深色主题 Logo |

- [ ] 四项来自同一个 Host config revision。
- [ ] favicon 不再固定使用 Phoenix 资源。
- [ ] 登录页、title/favicon 与工作台不读取不同 revision。

## 4. Admin Vue 单元点检

### Host 当前生效

- [ ] 表单、上传、保存和恢复默认可用。
- [ ] 当前预览随编辑变化；保存后显示“已保存并应用”。
- [ ] 保存后提示其他已打开页面刷新后切换，不误报所有在线页面已经换肤。
- [ ] 刷新后从服务端快照恢复，不依赖 localStorage。
- [ ] 登录页左右、标题/favicon 和工作台消费同一 Host revision。

### 插件当前生效

- [ ] 当前生效卡片显示插件名称、moduleId、版本和 snapshot revision。
- [ ] Host 编辑区显示“备用”，仍允许输入、上传、保存和恢复默认。
- [ ] 保存只更新备用配置，页面当前插件预览和 snapshot revision 不变。
- [ ] 页面不显示按字段来源矩阵。

### 运行点检

- [ ] “开始点检”覆盖 DOM 品牌文案、Logo、title、favicon、工作台和 revision。
- [ ] 结论写入 Runtime 日志窗口，例如 `[Runtime] XYL 工作台已就绪`。
- [ ] 失败项显示预期值、实际值和当前生效来源。

## 5. Admin Node/Pah 单元点检

- [ ] Host 配置编译为完整公开快照。
- [ ] 旧完整静态插件声明编译为完整插件快照。
- [ ] 插件活动时 Host 备用保存/恢复成功，但公开 snapshot revision 不变。
- [ ] Host 活动时保存原子发布新的 snapshot revision。
- [ ] 并发保存使用 revision/CAS；过期写入不能覆盖 winner。
- [ ] 插件启停、切换与更新在重启前不改变当前公开快照。
- [ ] 重启校验成功后一次性发布完整新 revision。
- [ ] 首次启用失败保持 Host；插件更新失败保持上一插件 last-known-good。
- [ ] Host 备用异常时使用最近有效 Host，最后才回退内置 Phoenix。
- [ ] 损坏 JSON、非法路径、缺失资源、错误 SHA/MIME/size 均不能发布半套品牌。

## 6. Branding 产品点检

- [ ] manifest 提供完整固定标题、副标题、Logo、favicon 和所需资源。
- [ ] manifest 不声明 Host 字段绑定。
- [ ] runtime 不修改登录 DOM、工作台 DOM、品牌 Store 或 document head。
- [ ] runtime 不复制登录认证、选择、持久化、快照或生命周期逻辑。
- [ ] 产品自验证覆盖资源可解析、SHA/MIME/size 和无活动 SVG 内容。

## 7. 生命周期点检

### Host → Acme

- [ ] 选择/启用后显示待重启，当前 Host revision 保持不变。
- [ ] API 重启且校验通过后，首个新 revision 为完整 Acme。
- [ ] 第一个非空可见帧没有 Host/Phoenix → Acme 闪烁。

### Acme 更新

- [ ] manifest 或资源变化但未重启时，当前 Acme revision 保持不变。
- [ ] 重启校验成功后发布新 revision。
- [ ] 重启校验失败时继续使用旧 Acme revision并报告失败。

### Acme → Host

- [ ] 插件活动期间可提前保存 Host 备用配置。
- [ ] 停用/取消选择后显示待重启，当前仍是 Acme。
- [ ] 重启后一次性恢复最新 Host 备用品牌。
- [ ] 不要求先卸载插件，也不需要恢复后再次重启才能编辑。

## 8. 真实浏览器验收

### A. 无活动 Acme

- [ ] 保存 Host 自定义品牌后当前页预览正确。
- [ ] 刷新后持久化正确。
- [ ] `/login` 左右区域、浏览器标题和 favicon 正确。
- [ ] 使用默认开发账号重新登录后，工作台左上角正确。
- [ ] API/Web 重启后仍保持同一 Host 配置。
- [ ] 无 Phoenix → 自定义品牌闪烁，console error 为 0。

### B. 活动 Acme

- [ ] 登录首帧、左右区域、title/favicon 和工作台为完整 Acme。
- [ ] 设置页准确显示当前插件与 Host 备用编辑区。
- [ ] 保存 Host 备用配置后，Acme 当前 revision 和页面不变。
- [ ] 刷新、重新登录和 Web 重载后 Acme 仍保持固化。
- [ ] Runtime 点检逐项通过，console error 为 0。

### C. 恢复 Host

- [ ] 停用/取消选择 Acme 并重启 API 后，最新 Host 备用配置整套生效。
- [ ] 登录首帧无 Acme → Host 替换闪烁。
- [ ] title/favicon 与工作台使用同一 Host revision。

## 9. 提交与运行边界

- [ ] `326eb4b` 命名同步保留。
- [ ] 对 Admin Vue `42872f5`、Admin Node `9c8aa58`、Branding `48ad42f` 形成逐文件保留/替换清单。
- [ ] 保留 bootstrap、统一消费者、revision/CAS、资源校验、last-known-good 和 runtime 去 DOM 化。
- [ ] 替换 v3 按字段来源及 Acme 全量 `host-default` 声明。
- [ ] 不覆盖 Admin 主工作树现有用户 dirty 文件。
- [ ] 不执行插件安装、DDL、数据库重置或其他 Hub 组重启。
- [ ] 只在获准实施后通过 Hub 重载 `admin-api`（8101）与 `admin-web`（9000）。
- [ ] 三仓分别形成可回滚中文本地提交，不 push、不 tag。
