# Phoenix 业务插件脚手架计划

## 状态

**Host 能力正在形成候选，脚手架仍待实施。** Phoenix Admin 已接入 Wing View Dialog Host，
并在隔离分支实现 Phoenix 插件路由 View 的 Host 默认 presentation coordinator；当前仍等待
`phoenix-wing@0.7.2` 正式发布、开发挂载浏览器矩阵与首个业务消费者验收。本轮仍不生成
脚手架代码、不新增独立插件仓库。

## 目标

让开发者通过一条明确命令创建一个独立的 Phoenix 业务插件 Git 仓库。新仓库默认具备：

- 双端插件边界：Vue View 与 Midway Controller 都在插件自身目录；
- `manifest.json`、能力码、路由、健康检查与卸载数据策略的最小一致声明；
- Host 顶部 Ribbon 的**开发态只读贡献**；正式菜单仍由 Host 按 manifest 物化；
- 一张默认业务 View：Header、Main、Primary/Secondary contribution、输出消息；
- 一张可“嵌入 Editor ↔ 非模态浮出”的完整 View 示例；
- 一张受 Host 统一管理的 View 对话框示例；
- 本地验证、受控打包 `.phoenix.cool`、开发挂载、卸载恢复的命令与测试。

脚手架不是第二个 Host。它只能声明业务身份、页面和业务内容；认证、路由守卫、菜单权限、
插件生命周期、底部 Output、全局 overlay 与窗口层级始终归 Phoenix Admin Host。

## 推荐命令

下一阶段在 Admin Vue 增加仓内命令，暂定：

```bash
pnpm create:phoenix-plugin -- ../my-business-plugin \
  --module-id my-business-plugin \
  --name "我的业务插件" \
  --publisher "Example Team"
```

该命令必须：

1. 拒绝已存在且非空的目标目录，避免覆盖任何仓库；
2. 校验 `moduleId` 为小写连字符命名，并由它派生路由、API、能力码和目录；
3. 复制 Host 内维护的无业务数据模板；
4. 初始化独立 Git 仓库，但不自动提交、不添加 remote、不联网、不安装未知依赖；
5. 输出后续三条明确命令：安装依赖、运行轻量 verify、通过 Hub 开发挂载；
6. 生成的文件不引用 Admin 内部实现路径，只引用公开的 Host/Wing 契约。

`--no-git` 可作为可选开关；默认初始化独立 Git 的原因是插件应有自己的版本、测试、发布
和审计历史，不能与 Host 工作树混在一起。

## 模板目录

```text
my-business-plugin/
  README.md
  package.json
  manifest.json
  scripts/
    verify-plugin.mjs
    pack-phoenix-plugin.mjs
  packages/admin-plugin/
    package.json
    vue/my-business-plugin/
      config.ts
      model/myBusinessPluginDevelopmentRibbon.ts
      layout/useMyBusinessPluginViewContributions.ts
      components/MyBusinessPluginPage.vue
      components/MyBusinessPluginPresentationView.vue
      components/MyBusinessPluginViewDialog.vue
      views/MyBusinessPluginHomeView.vue
    midway/my-business-plugin/
      config.ts
      controller/admin/myBusinessPluginController.ts
      service/myBusinessPluginService.ts
      pah-plugin.artifacts.json
  tests/
    manifest.test.mjs
    presentation-contract.test.mjs
```

目录与所有命名只使用生成时的通用占位符；模板不得包含其他产品的名称、路由、接口、
数据字典或业务数据。

## 默认界面契约

### 1. Ribbon 与路由

- `config.ts` 只在开发挂载时声明 `pahDevelopmentRibbon`；该声明必须有
  `schemaVersion=1`、`developmentOnly=true`，并且 `moduleId` 与模块目录完全一致。
- Ribbon 仅放稳定页面入口。业务 View 内不得再渲染一条第二 Ribbon。
- 正式安装后，菜单、权限和 Ribbon 以 manifest/Host 物化结果为准；同一 stable target 或
  route 已物化时，开发态 Ribbon 自动退场。

### 2. 普通业务 View

- 页面使用 Wing 的 `PnwPageHeader`、布局和主题 token；不复制 Host 的 Workbench Shell。
- 需要 Primary/Secondary 时，通过 Host 已公开的 View contribution composable 声明；业务 View
  不直接控制全局 Primary、Bottom 的可见性或尺寸。
- 过程信息写入 Host Output publisher；不得在页面内另建“日志/输出”面板。

### 3. 嵌入与浮出完整 View

- Phoenix 插件的普通路由 View 默认由 Host 在装载边界接入 Wing presentation；业务插件不得
  再复制 `PnwViewPresentationPortal`、record、Router/MRU 或 KeepAlive 管理。
- 页面只需使用 Wing `PnwPageHeader`；Host context 会提供唯一的“浮出/收回”动作。没有标准
  Header 的遗留 View 由 Host fallback 提供动作。
- `rendererId`、匿名 `viewInstanceId`、`ownerTabId`、cache pin 与 Process 生命周期由 Host 签发；
  插件不得用 route query、随机显示文案或用户输入构造身份。
- 默认 `embedded`；浮窗关闭动作默认 reattach，不能静默销毁用户上下文。
- 已自管 Portal 的旧插件只能用 `self-managed` 做短期兼容，验收后必须迁回 Host 默认能力，
  避免双层浮窗和重复按钮。

### 4. View 对话框

- 普通确认使用 Host 的全局 Choice Dialog；插件不得单独挂载第二个 Choice Dialog Host。
- 需要编辑器/工具窗的非模态对话框时，插件在 `config.ts` 的
  `phoenix.viewDialogRenderers` 声明稳定 `rendererId` 和异步组件 loader；页面只调用
  `usePhoenixViewDialog().open({ rendererId, instanceKey, title, props, size })`。
- `viewId`（owner Tab）和 `requestId` 只由 Host 签发，不进入插件 API；组件对象也不进入
  request 或持久化数据。`props` 必须是有限、可序列化的业务输入。
- Admin 应用根只创建并 provide 一个 Wing `PnwViewDialogHostController`，模块加载与健康检查
  完成后才把 renderer 白名单登记到 Wing；单个 renderer 无效时隔离该贡献，不拖垮纯 Host。
- 模板不得复制 `PnwFloatingPanel`、Promise resolver、overlay stack 或注册表。实现统一使用
  Wing 的 `PnwViewDialogHost` 与 `pnwCreateViewDialogHost`。
- Web 回退必须是无蒙层浮窗，保持原 View、Primary 和工作台可操作；桌面平台能力完整时才由
  Host 选择原生非模态窗口。
- 同一 `ownerTabId + rendererId + instanceKey` 的重复打开只聚焦既有实例，并复用同一结果
  Promise；owner Tab 销毁时 Host 调用 `closeByView`，一次性结算其全部对话框。

## Host 先行工作

脚手架实施前，Admin Vue 必须先完成并测试以下通用能力：

1. 在应用根只挂一次 Wing 全局 Host（Choice Dialog 与 View Dialog 各一个）；
2. 导出稳定的 Phoenix 插件 View presentation / View dialog adapter，不暴露 Router、Pinia、
   任意 Component 或 Host 内部 overlay stack；
3. 对每个 Presentation record 做 owner 生命周期对账：owner 关闭时回收或 reattach，陈旧
   revision 不得覆盖最新状态；
4. 把 Host 的 color scheme、Overlay layer 和焦点恢复交给 Wing，而不是模板手写 z-index；
5. 为无插件、单插件、插件异常三种情况测试 Host 仍可登录、导航和输出。

当前 Host 候选已经完成 View Dialog 以及 Phoenix 插件 View coordinator 的聚焦测试和类型检查；
生产构建、Process/KeepAlive 浏览器矩阵与 Wing 正式版本仍是发布门禁。模板在此之前**不得**锁
未发布 Wing 或伪造“所有 Admin/Cool View 已默认可浮出”。Cool 原生 View 的后续范围见
[《Cool 原生 View 默认浮出 TODO》](PhoenixCool原生View默认浮出TODO.md)。

## 开发技能与文档位置

脚手架完成后采用两层文档，不把规则散落进各业务仓库：

| 位置                                                   | 用途                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `docs/Phoenix插件开发指南.md`                          | 面向开发者的稳定契约、命令、目录、发布与验收清单。                     |
| `.codex/skills/phoenix-admin-business-plugin/SKILL.md` | 面向 Codex 的项目内技能：创建、迁移、审查 Phoenix 业务插件时强制读取。 |
| `templates/phoenix-admin-business-plugin/`             | 仅放可生成的通用源码模板。                                             |
| `scripts/create-phoenix-plugin.mjs`                    | 只负责校验输入、复制模板和初始化独立 Git。                             |

技能不复制完整 API 手册；它只路由到开发指南、manifest schema 与 Wing 的已发布类型。任何
新能力先进入 Host 和 Wing 的测试，再进入模板与技能。

## 分阶段实施

1. **Host 能力阶段**：实现全局 View Dialog Host adapter，并补全 presentation 的 Host 生命周期
   与浏览器测试。代码候选已完成；发布与首个消费者验收进行中。
2. **模板阶段**：建立最小双端模板、manifest fixture、开发 Ribbon 和一页普通 View；先不含
   DDL、字典或登录扩展。
3. **生成器阶段**：实现 `create:phoenix-plugin`，覆盖新目录、非空目录、非法 moduleId、
   Git 初始化与 `--no-git`。
4. **打包阶段**：生成 `.phoenix.cool`，验证运行制品闭包、manifest、普通目录结构与
   checksum；不在 Host 根据插件输入执行 `pnpm install`。
5. **开发挂载阶段**：在干净 Host 验证 Ribbon、路由、普通 View、嵌入/浮出、对话框、
   卸载恢复和控制台。
6. **文档/技能阶段**：完成开发指南与项目内 Codex 技能，使用新生成的通用插件做一次独立
   回归，而不把真实业务插件当模板。

## 硬门禁

- 生成结果没有其他业务插件名称、业务 API、业务表或真实数据；
- `manifest.moduleId`、route prefix、API prefix、capability 前缀、双端目录完全一致；
- Ribbon 仅在开发挂载显示，正式菜单物化后不重复；
- 业务 View 不复制 Workbench、Ribbon、Output、Choice Dialog 或 FloatingPanel 实现；
- 浮出/收回不丢失同一 View 状态，Escape/关闭路径可预测，明暗/宽窄屏可用；
- 包验证不接受链接挂载、外链运行时、任意 npm 安装或 Host 源码写入；
- 无插件、插件加载失败、插件卸载后三种情况下 Host 登录和基础导航均正常；
- 运行轻量 unit/contract 测试、类型检查、production build，再进行独立 Git 生成冒烟。

## 非目标

- 本计划不提供运行时热插拔、任意远程模块、Module Federation 或插件执行任意命令；
- 不替换 Host 登录、认证、权限、菜单管理或数据库迁移编排；
- 不把业务插件的屏幕设计、数据模型或第三方项目源码放进 Admin Vue；
- 不以脚手架替代正式插件包审计与安装验收。
