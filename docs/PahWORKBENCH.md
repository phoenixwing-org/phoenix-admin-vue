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
- Wing 0.5.1 的 Group 组件提供结构和无障碍名称，Host 额外呈现可见组名。

首期不新增数据库分组表。只有出现跨模块持久化布局、用户定制或独立生命周期需求时，才评审 `pah_` sidecar 表。

## 面板

- Primary：当前显示 Ribbon Tab 导航，后续接模块 outline contribution。
- Main：原 RouterView/KeepAlive 内容。
- Properties：当前显示活动页面只读信息，后续接页面属性 contribution。
- Log：使用 Wing `PnwShellLogPanel`，当前记录壳导航事件。
- Footer：显示壳模式并控制 Primary、Properties、Log 显隐。

Open Issue 与 Function 尚未接入；本壳只建立 Host 契约和可回退呈现。

## H2 原型验收

2026-07-24 已完成：

- `PahRibbonMenuAdapter` 与 `PahShellMode` 共 5 项单元测试通过。
- `vue-tsc --build --force` 通过。
- Vite 生产构建通过，构建结果包含 Phoenix Wing 0.5.1 的 JS 与 CSS。
- 静态产物包含 `THIRD-PARTY-NOTICES.md`、`licenses/MIT.txt` 与
  `licenses/Apache-2.0.txt`。

当前 `cool-eps` 在无后端接口时会报告拉取失败，Vite 仍可完成构建；该提示属于
联调环境事项，不视为 Host 编译失败。登录后的真实菜单、路由切换和响应式布局仍需在
前后端联调环境做一次人工冒烟验收。
