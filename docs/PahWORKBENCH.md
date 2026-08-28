# Pah Workbench 壳说明

## 配置

`VITE_PAH_SHELL_MODE` 支持：

- `classic`：原 Cool Admin 侧栏、Topbar、Process 与 Views。
- `workbench`：Phoenix Wing Ribbon 与工作台面板。
- `hybrid`：默认 classic；路由设置 `meta.pahShell = 'workbench'` 时切到工作台。

未知值必须回退到 `classic`。

## 单一状态源

Workbench 不创建第二套路由或页签 store：

- Ribbon 项点击后仍调用 Cool Admin Router。
- `PnwWorkbenchTabBar` 只是 `base/process` store 的呈现适配。
- 关闭、切换和全部关闭操作仍回写同一个 process store。
- 主内容继续使用原 `Views`、RouterView 与 KeepAlive。

## 菜单到 Ribbon

- 一级目录 → Ribbon Tab。
- 二级目录 → Ribbon Group。
- 一级目录直属页面 → `常用` Group，每 5 项稳定切分。
- 更深目录的页面收敛到其二级 Group，每组仍不超过 5 项。
- 权限节点、隐藏菜单、空 Group 与空 Tab 不进入 Ribbon。
- Wing 0.6.0 的 Group 组件提供结构和无障碍名称，Host 额外呈现可见组名。

首期不新增数据库分组表。只有出现跨模块持久化布局、用户定制或独立生命周期需求时，才评审 `pah_` sidecar 表。

## 面板

- Primary / Secondary：只接收活动 View 显式登记的内容，并交给 Wing 容器呈现；没有内容时不显示。
- Main：继续承载原 RouterView、Process 与 KeepAlive。
- Bottom：由 Host 工作台固定贡献，是布局能力，不允许 View 注入或覆盖。
- Footer：按当前能力显示 Primary、Bottom、Secondary 三个布局开关；不可用区域保持禁用。
- `PnwWorkbenchDisplayPreferences` 统一描述导航、Ribbon、标签位置、面板显隐与尺寸，Admin 负责持久化。

产品业务插件保持独立仓库；本壳只建立 Host 契约和可回退呈现。

## H2 原型验收

2026-07-24 已完成：

- `PahRibbonMenuAdapter` 与 `PahShellMode` 共 5 项单元测试通过。
- `vue-tsc --build --force` 通过。
- Vite 生产构建通过，构建结果包含 Phoenix Wing 0.6.0 的 JS 与 CSS。
- 静态产物包含 `THIRD-PARTY-NOTICES.md`、`licenses/MIT.txt` 与
  `licenses/Apache-2.0.txt`。

当前 `cool-eps` 在无后端接口时会报告拉取失败，Vite 仍可完成构建；该提示属于
联调环境事项，不视为 Host 编译失败。登录后的真实菜单、路由切换和响应式布局仍需在
前后端联调环境做一次人工冒烟验收。

## View 浮出边界

Phoenix 插件 View 的 Host 默认浮出能力先在受控插件路由边界实施。Cool 原生 View 还涉及
Process/MRU、KeepAlive pin、CRUD dirty/busy guard、overlay 与定向刷新，不能直接复用局部包装
并宣称完成。完整后续计划见
[《Cool 原生 View 默认浮出 TODO》](PhoenixCool原生View默认浮出TODO.md)。

## 多消费者统一界面契约

Phoenix Admin、业务插件和其他 Wing 消费端遵守同一套“公共组件、Host 生命周期、消费者内容”
分层，避免每个消费者再实现一套浮窗、标题栏和工作台状态。

### Wing 公共层

- `PnwPageLayout`、`PnwPageHeader` 提供统一标题、说明、操作区、正文 inset 与滚动边界；View
  不再手写 hero/header 壳。
- View presentation、View Dialog、浮窗栈、推荐尺寸、焦点、Escape、明暗主题与 ARIA 由 Wing
  维护；消费者不得复制 FloatingPanel、Portal、resolver 或 z-index 栈。
- Primary、Secondary、Bottom、Output 和 Choice Dialog 只由 Wing 提供结构与中性状态，不读取
  Admin 路由、权限、数据库或插件安装记录。

### Admin Host 层

- Host 将 route/process tab 投影为稳定 `viewInstanceId`，并拥有 Router、MRU、KeepAlive pin、权限
  撤销、插件停用、登出与 owner 关闭生命周期。
- 每个路由 View 只能有一个 presentation record 和一个 Portal；Host 在外层 provide context，标准
  `PnwPageHeader` 自动取得“浮出/收回”动作。
- Host 应用根只创建一套 Choice Dialog Host 与 View Dialog Host；renderer 白名单来自已通过健康
  检查的插件贡献，单个贡献失败只隔离该插件。
- dirty/busy/save/discard/cancel 属于 Host/产品关闭守卫；Wing 的收回动作不能被解释成销毁路由
  或丢弃草稿。

### 插件与其他消费者

- 页面只提供业务组件、`PnwPageLayout`/`PnwPageHeader`、Primary/Secondary contribution、命令和
  有限 JSON 对话框 props。
- 不复制 Workbench、Ribbon、Output、Choice Dialog Host、View Portal、窗口堆栈或路由缓存。
- 已有自管 Portal 的消费者先删除重复标题栏动作，再迁入 Host context；迁移期间必须显式
  opt-out，禁止两套控制器同时生效。
- 产品专有的文件事务、Canvas、工作空间、业务 Store 与关闭策略继续留在消费者；只有两个真实
  消费者共享相同 DTO、fixture 和交互语义时，才下沉 Wing。

### 统一门禁

1. 源码测试确认页面显式导入并渲染 Wing 页面壳，不能留下未解析的自定义标签。
2. 同一 View 的标题栏只出现一组“恢复、收回、关闭”动作，图标、tooltip 和 ARIA 各自唯一。
3. 嵌入与浮出复用同一业务实例；收回、路由切换和 owner 关闭不产生第二份 Store 或草稿。
4. 无插件、单插件、插件隔离三种状态下，Host 登录、导航和基础页面都可用。
5. 本地 sibling 联调与 Registry 构建分别记录精确 Wing SHA/版本；不得用 `file:`、`link:`、
   `workspace:` 或手改 `node_modules` 冒充正式消费。
6. 开源仓库的文档、测试名和发布说明只使用通用消费者描述，不记录私有项目、路径或接口。

Phoenix 插件路由已进入该 Host 默认模型；Cool 原生 View 仍按上节 TODO 独立研究，不能把候选
范围扩大成“所有 Cool 页面已经支持浮出”。
