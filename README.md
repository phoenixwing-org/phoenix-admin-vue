# Phoenix Admin Vue

Phoenix Admin Host 的前端宿主。仓库以 Cool Admin Vue `8.x` 为固定基线，保留经典管理界面，并逐步接入 Phoenix Wing 的 Ribbon 工作台能力。

> 本仓库是 PhoenixWing 维护的 MIT 分叉，不是 Cool Admin 官方发行物。原 Cool Admin 版权、MIT 许可和 Git 历史完整保留。

## 当前阶段

- `classic`：保留上游侧栏、顶栏、路由、页签与 KeepAlive，作为兼容和回退基线。
- `workbench`：已使用 Registry `phoenix-wing@0.6.2` 组合 Ribbon、共享页签状态、Primary、Secondary、Bottom 与 Footer。
- `hybrid`：系统管理页使用经典壳，带 `route.meta.pahShell = 'workbench'` 的业务路由使用工作台壳。
- 已增加通用 Phoenix 业务插件安装向导，可校验 `.phoenix.cool` 制品，并按受控重启、dry-run、可信备份、安装、启停和保留数据卸载的顺序完成生命周期操作。
- 业务插件与 Host 分 Git 开发；本仓库不归档产品源码或候选 manifest。当前激活方式仍为受控构建与重启，不承诺运行时热加载。

Ribbon 菜单映射优先复用现有菜单树：Cool 一级菜单作为“模块”，模块内部目录映射 Ribbon Group，直属叶子菜单按稳定顺序自动分组，每组默认不超过 5 项。Phoenix 宿主再通过编译期适配层把模块组合为 2–3 个“大组”；当前默认是“系统与用户”“数据与扩展”“开发与示例”。未配置的新模块安全归入“其他模块”，首期不新增菜单分组表。

通过 `.env` 的 `VITE_PAH_SHELL_MODE` 选择 `classic`、`workbench` 或 `hybrid`；当前开发基线默认展示 `workbench`。

工作台头部的“宿主设置”可在 `Ribbon 工作台` 与 `大分组侧栏` 之间即时切换。两种样式共享同一份权限过滤后的菜单树，选择保存在浏览器本地；`.env` 的 `VITE_PAH_NAVIGATION_STYLE` 只负责首次默认值，支持 `ribbon` 或 `grouped-sidebar`，未知值安全回退为 Ribbon。

大分组侧栏使用单一 TreeView，层级为“大组 → 模块 → 功能页面”，不保留额外图标轨道。大组和模块首次默认展开；各节点展开状态由 Pinia 保存到 `pah.groupedNavigation.v1`，刷新后继续沿用。当前路由面包屑统一显示在 Footer。独立业务插件既可声明建议大组，也可由管理员配置到已有大组；运行时动态插件不在本阶段范围内。

导航呈现、Primary/Secondary/Bottom、Footer 与 Ribbon 外观使用带版本号的 `pah.workbenchPreferences.v3` 本地偏好。损坏或缺失字段逐项回退，宿主设置可一键恢复 `.env` 导航默认值和安全面板布局；这些偏好只控制呈现，不扩大菜单或 API 权限。

Bottom 是工作台实例级的全局“输出”窗口，使用 Wing 的 `PnwOutputBlock` 原样显示自由文本；切换 View 不会清空，View 也不能自行贡献或覆盖 Bottom。Host 与插件可通过 `usePahWorkbenchOutput()` 发送 append、appendLine、replace、clear 信号；服务端分页日志、结构化诊断、审计记录、请求体和秘密信息仍属于各自业务能力，不进入该窗口。

## 仓库关系

| 项目              | 地址/版本                                             |
| ----------------- | ----------------------------------------------------- |
| Phoenix 发行版    | `0.2.1`                                               |
| Phoenix Wing      | Registry `phoenix-wing@0.6.2`                         |
| Phoenix 仓库      | <https://gitee.com/phoenixwing/phoenix-admin-vue>     |
| Cool Admin 上游   | <https://gitee.com/cool-team-official/cool-admin-vue> |
| Cool 兼容固定基线 | `8.x` / `a2d4ee9bbfd6bfce880382f0bf6f8dd8f3397a2d`    |
| 配套后端          | <https://gitee.com/phoenixwing/phoenix-admin-node>    |

详细同步规则见 [UPSTREAM.md](UPSTREAM.md)。

Phoenix Admin 使用独立 SemVer，不跟随 Cool Admin 的产品版本号。Cool Admin 仅作为兼容与上游同步基线记录；Phoenix 的后续版本按自身 Host API、Pah 插件契约和用户可见能力演进。

## 分支

- `master`：稳定发行线和默认克隆分支。
- `develop`：日常集成分支。
- `upstream-sync/*`：固定 SHA 的上游同步分支。

## 本地开发

```shell
pnpm install
pnpm dev
```

默认开发地址为 <http://localhost:9000>，开发代理连接 Phoenix Admin Node
<http://localhost:8101>。构建与检查：

Phoenix 业务插件管理页为 <http://localhost:9000/phoenix/plugins>，操作边界见
[PahPLUGIN.md](docs/PahPLUGIN.md)。

```shell
pnpm type-check
pnpm test
pnpm build
```

标准 `pnpm dev` 启动时，Cool EPS 会先读取 `build/cool/eps.json`，再访问 Node Host
刷新接口描述。后端尚未启动时，上游插件会打印红色 `[cool-eps]` 信息，但存在本地缓存时
Vite 仍可正常启动；可先运行以下诊断区分“缓存降级”和真正缺少 API/缓存：

```shell
pnpm diagnose:cool-eps
```

`classification=non-blocking-cache-fallback` 表示前端可使用本地缓存继续启动；
`incomplete-without-api-or-cache` 表示应先启动 Node Host，再重新启动前端以生成 EPS。

## 命名与许可

Phoenix Admin Host 新增的源码、组件和类型统一使用 `Pah*` 前缀；Phoenix Wing 的公开符号继续使用其自身 `Pnw*` 前缀。数据库标识使用 SQL 安全的 `pah_` 前缀，不使用连字符。

本仓库及仓内新增 `Pah*` 代码统一采用 MIT。根 [LICENSE](LICENSE) 保留上游原始版权和许可文本，Phoenix 分叉关系及第三方依赖边界见 [LICENSING.md](LICENSING.md) 与 [NOTICE](NOTICE)。
