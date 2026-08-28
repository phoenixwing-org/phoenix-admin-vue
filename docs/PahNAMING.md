# Pah 命名约定

`Pah` 表示 Phoenix Admin Host。新增宿主代码统一使用这一前缀，不再引入 `Pan` 或 `Pav`；`Pnw` 只属于 Phoenix Wing 的公开 API。

## 源码

- Vue 组件、TypeScript 类、类型和可组合函数文件保留相同大小写的 `Pah`，例如 `PahRibbonMenuAdapter.ts`、`PahWorkbenchShell.vue`、`PahShellMode`。
- Host 专属实现集中在 `src/phoenix/`；需要 Cool Admin 模块发现机制的页面和 manifest 放入
  `src/modules/phoenix/`。真实源码目录不得重新创建 `src/pah/` 或 `src/modules/pah/`。
- 标准仓库治理文件仍使用生态约定名称：`README.md`、`LICENSE`、`NOTICE`、`UPSTREAM.md`、`LICENSING.md`，不加 `Pah` 前缀。
- 上游文件和第三方符号不做机械重命名。

## 路径与兼容

- 新页面、API 和内部 import 使用 `/phoenix/*`、`/admin/phoenix/*`、`/@/phoenix/*` 与
  `/$/phoenix/*`；
- `Pah*` 文件名和类型名是允许保留的内部稳定 ABI，不等同于旧物理目录；
- `/@/pah/*` 与 `/$/pah/*` 只作为已发布插件的编译期 alias，不得在新代码中继续新增；
- Identity 与 Navigation 旧深链暂处兼容窗口；字典旧深链不兼容，由系统维护中心和 Host
  schema v4 迁移数据库菜单后删除；
- `/pah/plugins` 与 `/admin/pah/plugin/*` 不提供兼容入口。

## 持久化标识

- 新增数据库表使用 `pah_` 前缀，例如 `pah_shell_preference`。
- 数据库列、索引、迁移标识和配置键不得使用连字符形式 `pnw-`。
- 只有真实存在跨模块持久化、用户定制或独立生命周期需求时才增加 sidecar 表；Ribbon 首期直接适配现有菜单树。

## Ribbon 自动分组

- 一级菜单目录映射为 Ribbon Tab。
- 显式二级目录映射为 Ribbon Group。
- 一级目录下直属叶子菜单按 `order`、`id` 的稳定顺序切分，每组默认最多 5 项。
- 过滤无权限项后删除空 Group 和空 Tab。
