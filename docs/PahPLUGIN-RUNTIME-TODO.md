# Phoenix 插件运行时激活 TODO

## 当前结论

`.phoenix.cool` 可以由管理员在页面完成校验、装配、迁移计划、安装与启用，但新包包含的
Node Controller、Service、Entity、任务或 Vue SFC 不会自动进入已经运行的 Midway/Vite
模块图。当前 `restart` 激活方式因此必须保留，页面也必须明确显示“API 需要重启”。

这不是插件包错误，也不应通过浏览器执行任意 shell 或让管理员复制一段不透明的
`pnpm` 命令来绕过。Node 模块缓存、装饰器注册、路由表、Entity 列表和前端 import 图都
缺少可靠的进程内卸载语义；仅复制文件或 HMR 不能形成可审计的热插拔。

## v1 安全方案：Host 受控构建与重启

v1 由 Phoenix Admin Host/Hub 编排固定动作，管理员只确认动作和查看日志：

1. 校验包格式、签名/checksum、Host/Wing 兼容范围和普通目录边界；
2. 解包到版本化 staging 目录，不覆盖当前 active payload；
3. 生成 migration dry-run；有待执行 DDL 时让管理员选择：
   - 已完成可信备份；
   - 明确放弃备份并承担风险；
   - 取消安装；
4. 使用 Host 固定的构建脚本生成候选 Node/Vue 运行闭包；
5. 构建失败时删除 staging，当前进程与 active 版本保持不变；
6. 构建成功后显示“需要重启 API”，由管理员确认调用受控重启能力；
7. 新进程先完成健康检查、插件 runtime check、数据库连接和版本指纹核对；
8. 通过后原子切换 active 版本并启用贡献；失败则恢复旧版本并重启；
9. 回滚窗口结束后才允许清理旧版本 payload。

页面必须把状态显示为确定的阶段，而不是只给一次气泡提示：

```text
已选包 → 已验证 → 待构建 → 待重启 → 运行点检通过 → 待安装 → 已启用
```

每个不可点击按钮旁必须给出阻断原因，例如“新 Node payload 尚未加载，请重启 API”。

## pnpm 边界

- 管理员不运行插件提供的 `preinstall`、`postinstall`、任意 package script 或任意命令；
- 业务插件原则上提供自包含的浏览器/Node 运行制品，Host 不为单个插件临时安装依赖；
- 若未来必须安装第三方依赖，只允许 Host assembler 根据已校验的精确 lockfile、允许的
  Registry 和完整性摘要，在隔离候选目录执行固定命令；
- 禁止 `file:`、`link:`、`workspace:`、override、产品仓 `node_modules` 借用和 Junction/
  symlink payload；
- 依赖安装输出、构建输出、健康检查与回滚结果统一写入 Host Output/审计记录，但不得
  输出凭据、请求体或数据库秘密。

因此，生产 UI 不应展示“复制 pnpm 命令”。开发环境可以显示 Host 自己的固定启动命令，
但它只用于启动 Phoenix Admin 安装器 Profile，不接受插件输入拼接命令参数。

## 受控重启能力 TODO

- [ ] 定义 `restart-request` API：只接受 installation ID 与一次性 nonce，不接受命令文本、
  cwd、端口或环境变量；
- [ ] 仅 Hub/systemd/Docker/Kubernetes 等受信进程管理器持有实际重启权限；
- [ ] API 进程不能杀死并重新拉起自己；请求落盘/入队后由外部 supervisor 执行；
- [ ] 重启前记录 active/staging 版本、构建摘要、数据库计划和回滚指针；
- [ ] 新进程通过 readiness 后才把安装向导推进到“运行点检通过”；
- [ ] 超时、端口占用、进程崩溃或指纹不符时自动回滚，并在旧进程/恢复进程中可见；
- [ ] 重启操作要求管理员权限、CSRF/重放保护、审计 actor 与速率限制；
- [ ] 页面在刷新或换标签后从服务端恢复安装阶段，不依赖内存或 localStorage；
- [ ] 提供 CLI 等价入口供无 Hub 的生产部署使用，但仍调用同一状态机，不绕过校验；
- [ ] 覆盖构建失败、重启失败、readiness 失败、数据库安装失败、启用失败和回滚失败测试。

## 热插拔研究 TODO

只有满足以下条件后，才考虑把某类插件标记为 `activationMode: hot`：

- 插件运行在可销毁的独立 worker/进程或隔离 runtime 中；
- 路由、任务、事件订阅和依赖注入容器都有注册句柄及确定的 dispose；
- 不向主进程 TypeORM Entity 集合追加模型，不改变主进程装饰器元数据；
- 前端使用经过签名和 CSP 限制的版本化远程模块，并能原子卸载路由、Store、样式和事件；
- 热启用/停用、并发请求排空、异常回滚和内存泄漏测试全部通过。

在这些条件完成前，Phoenix 插件“停用”只撤销贡献和访问入口，“安装/升级/卸载代码”仍
采用受控构建与进程重启；不得宣称与 Cool 插件相同的进程内热插拔能力。

## 验收标准

- 不执行插件提供的任意命令；
- 新旧版本 payload 不互相覆盖，失败可恢复旧版本；
- 重启前后 installation 状态、运行指纹与 UI 阶段一致；
- 页面刷新后阶段不丢失，不出现已成功但卡片消失的临时状态；
- 无 Hub 时有同状态机的 CLI/supervisor 部署说明；
- 安装、升级、取消候选、停用、保留数据卸载各自是独立且可恢复的动作。
