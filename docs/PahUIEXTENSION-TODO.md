# Phoenix Admin UI 扩展 TODO

## 目标

建立一次性、版本化的 Pah UI 扩展接缝，使可信 Phoenix 插件可以贡献：

- 登录页外观壳；
- 登录后的默认首页；
- 应用名称、Logo SVG、favicon 与页面标题等品牌资源。

扩展安装在 Host 源码目录之外。Phoenix/Cool 框架升级不得覆盖扩展包；安装器只复制
普通目录，不接受 `link`、`workspace`、symlink 或 Junction 挂载。

## 当前限制

Phoenix Admin Vue 当前是 Vite SPA：

- `/login` 直接绑定内置登录 SFC；
- `/` 由当前用户权限菜单中的第一个页面决定；
- 模块和路由在构建期扫描 `src/modules` 与 `src/plugins`；
- favicon 在 `index.html` 中静态声明；
- Phoenix 插件只支持 `activationMode: restart`。

因此 v1 继续采用“安装 → 受控构建 → 重启 → 管理员显式启用”，不宣称上传任意
Vue 源码后立即热加载。

## 安装目录

使用部署持久化、可配置的 `PHOENIX_EXT_ROOT`：

```text
ext/
  installed/<moduleId>/<version>/
    manifest.json
    vue/
    node/
    assets/
  inventory/installed.json
  rollback/
```

约束：

- `moduleId/version` 不得原地覆盖，新旧版本并列直到回滚窗口结束；
- inventory 必须带 manifest 和所有入口、资源 checksum；
- 路径经过 realpath 边界检查，拒绝绝对路径、父目录、大小写碰撞和链接挂载；
- Host 源码目录内不生成插件文件；
- inventory 是制品索引，不替代数据库中的安装、启用和管理员选择状态。

## manifest 候选契约

后续 manifest format 增加白名单 `uiContributions`：

```ts
uiContributions: {
  contractVersion: 1,
  login?: {
    id: string,
    mode: 'host-auth-shell',
    entry: 'vue/ui/login-shell.ts'
  },
  home?: {
    id: string,
    routeId: string
  },
  brand?: {
    id: string,
    appName?: string,
    logo?: 'assets/logo.svg',
    logoDark?: 'assets/logo-dark.svg',
    favicon?: 'assets/favicon.svg',
    titleTemplate?: string
  }
}
```

只接受 `login/home/brand` 三类系统槽位。`home.routeId` 必须引用同一 manifest 的既有
路由；登录扩展不能注册新的匿名路由、替换 OAuth callback 或修改 token ignore 列表。

## Host 接缝

- `PahLoginOutlet`：`/login` 永久只指向该稳定入口；
- `PahLoginAuthPanel`：密码、验证码、外部身份策略、Token 写入与安全跳转继续由 Host 管理；
- `PahHomeResolver`：只从当前用户有权限的菜单路由中解析管理员选择的首页；
- `PahBrandManager`：受控设置 app name、document title、Logo 和 favicon；
- `PahUiExtensionRegistry`：读取构建期生成且带 checksum 的 registry；
- `PahUiExtensionErrorBoundary`：任一扩展加载或渲染失败时逐槽回退 Phoenix 默认。

登录扩展 v1 只负责布局和品牌呈现，必须嵌入 Host 认证面板，不得重新实现凭据提交、
验证码、Token 存储或 OAuth callback。

## 构建与启用

Vite 插件读取受控 ext inventory，生成 `virtual:pah-ui-extensions`，仅为已验证入口生成
静态 import loader。禁止浏览器扫描磁盘、执行上传源码、`eval`、远程脚本或共享
`node_modules`。

在 `/phoenix/plugins` 卡片的“UI 扩展”区域，以每槽位单选管理：

- 使用 Phoenix 默认；
- 使用 `<plugin>@<version>` 登录外观；
- 使用 `<plugin>@<version>` 首页；
- 使用 `<plugin>@<version>` 品牌。

启用插件不得自动替换登录页或首页。停用、卸载或删除版本前，必须先把相关槽位原子
回退到 Phoenix 默认。选择状态由 Node/数据库统一保存并审计，不能只存 localStorage。

## 权限与安全

- 首页选择不授予菜单或 API 权限；用户无目标权限时回退第一个有权限页面；
- 登录扩展只允许可信发布者的已验证包；
- 不接受远程 JS/CSS/iframe、`v-html` 品牌片段或任意外链资源；
- SVG 安装时拒绝 script、foreignObject、事件属性和外部 href；
- favicon 限定格式、MIME、尺寸和体积；
- 提供 `PAH_UI_EXTENSIONS_DISABLED=1` 安全模式；
- UI profile/API/import/render 任一失败都不能阻塞默认管理员登录。

## 插件升级（与 UI 扩展共用的版本化基础）

同一 `moduleId` 选择更高版本时，不得按“不同内容”直接覆盖：

1. 卡片显示“发现升级 `旧版本 → 新版本`”；
2. 校验兼容性、checksum 和普通目录 payload；
3. 要求停用，展示 migration dry-run 与备份选择；
4. 将新版本暂存到并列版本目录；
5. 完整构建并重启点检；
6. 原子切换 active version 并重新启用；
7. 失败时恢复旧 active version；
8. 成功后卡片只显示新版本，回滚窗口结束后才清理旧制品。

当前“移除已选包”只处理 `verified` 且尚未安装的候选，不替代升级流程。

## v1 边界

v1 包含：普通目录 ext 安装、单站点唯一 profile、登录外观壳、权限内首页、品牌槽位、
受控构建重启、显式单选与恢复默认、逐槽 fallback、停用/卸载原子解绑，以及 SPA
history/hash 测试。

v1 不包含：替换认证逻辑、运行时加载未构建 SFC、npm 安装、链接挂载、远程模块、
iframe、Module Federation、多租户品牌、SSR、同槽位多插件或在线无重启升级。

## 验收

- 无扩展时与当前 Phoenix 登录/首页一致；
- 扩展损坏、API 失败或渲染异常时仍可登录；
- 首页无权限时正确回退；
- Logo、favicon、title 可恢复默认；
- 停用/卸载前 active 槽位被清理；
- 新旧版本并存，切换失败可回滚；
- 覆盖 history/hash、桌面/移动端、SVG/XSS、路径逃逸、链接挂载和超大包；
- 通过 `pnpm test`、`pnpm type-check`、`pnpm build` 及框架升级契约测试。
