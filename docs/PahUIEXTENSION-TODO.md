# Phoenix Admin UI 扩展 TODO

站点级扩展的正式名称、类型键、管理员规则与干净环境验收见
[《Phoenix 品牌与启动页扩展》](Phoenix品牌与启动页扩展.md)。

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
    entry?: 'vue/ui/login-shell.ts',
    title?: string,
    subtitle?: string,
    background?: 'assets/login-background.webp'
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
    compactLogo?: 'assets/logo-compact.svg',
    compactLogoDark?: 'assets/logo-compact-dark.svg',
    favicon?: 'assets/favicon.svg',
    titleTemplate?: string,
    showFrameworkBranding?: boolean
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

### 白标呈现规则

管理员启用品牌贡献后，以下用户可见位置必须使用同一个已解析的站点 profile：

- `/login` 的 Logo、站点名称、标题、副标题和背景；
- Pah Workbench 左上角品牌按钮及折叠态 compact Logo；
- Cool 兼容布局左侧栏顶部 Logo 和应用名称；
- 浏览器 title 和 favicon；
- 登录成功后的默认首页。

`showFrameworkBranding=false` 时，上述业务界面不得再显示 Phoenix Admin、PhoenixWing 或
默认凤凰图标。框架版本、许可证、制品发布者和诊断元数据仍保留真实值，不能伪装为用户
自研框架。未选择 profile、profile 损坏或安全模式开启时，整组槽位回退 Phoenix 默认，
禁止出现一半用户品牌、一半框架品牌的混合状态。

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

## 2026-08-10 下午实施计划（0.2.3 候选）

本阶段解决“管理员可定义登录页、登录后的启动页和进入主页后的左上角品牌 Logo”。三者
共享一个版本化站点 profile，但登录认证表单、验证码、OAuth callback 和 Token 流程仍由
Host 持有，插件只能包裹和呈现 Host 认证面板。

### A. 冻结最小契约与回退规则

1. 在 manifest fixture 中增加 `uiContributions.contractVersion = 1`，首批启用
   `login`、`home.routeId` 和 `brand`；登录贡献先支持结构化文案/背景，确有布局需求时才加载
   受控 `host-auth-shell` 入口。
2. `home.routeId` 必须引用同一插件已声明的路由；选择首页不授予新权限。
3. 统一回退顺序：管理员选择 → 当前用户有权限 → Phoenix 默认首页 → 第一个有权限页面。
4. Logo 只接受包内 SVG；安装时清理 script、事件属性、`foreignObject` 和外部引用，运行时
   只使用 Host 生成的本地资源 URL。
5. API、registry 或资源失败时逐槽回退默认，不得阻断 admin 密码登录或把 `/` 导向 404。
6. `showFrameworkBranding=false` 只影响用户界面，不删除许可证、诊断版本或插件发布者信息。

### B. Host 端接缝

1. 实现 `PahUiExtensionRegistry`，只读取受控构建生成的静态 registry，不在浏览器扫描目录。
2. 实现 `PahLoginOutlet`，稳定承载 Host 认证面板，并把结构化登录文案、背景和 Logo 投影到
   profile；插件异常时原地回退默认登录页。
3. 实现 `PahHomeResolver`，接管登录成功、访问 `/`、点击工作台品牌按钮三条旅程。
4. 实现 `PahBrandManager`，同时驱动 Pah Workbench 品牌位和 Cool 兼容布局左上角 Logo；
   Logo、应用名、title、favicon 均有 Phoenix 默认值。
5. 先补纯函数和路由回归，再接组件；覆盖无权限、插件停用、制品损坏和刷新冷启动。

### C. 管理员配置界面

1. 在 `/phoenix/plugins` 的通用 Primary 增加“界面扩展”区，不写 Open Issue 等产品映射。
2. 登录外观、首页和品牌分别单选：Phoenix 默认，或某个已安装、已验证、已启用插件的
   贡献；提供“隐藏框架标识”预览项。
3. 保存前展示目标路由、Logo 预览、版本和 checksum；切换需确认，操作写入审计。
4. 停用、卸载或切换版本前先原子解绑相关槽位，再撤销插件贡献。

### D. 安装载体决策

- 首选：把自定义首页和品牌做成可信的 `.phoenix.cool` “站点外观插件”，仍由 Phoenix
  安装器校验、构建、重启和启用；它不直接修改 Phoenix/Cool 源码，框架升级不会覆盖。
- `/helper/plugins` 只保留 Primary 切换入口。Cool 原生 `.cool` 安装器当前不理解 Phoenix
  manifest、checksum、权限路由和回滚契约，因此不能直接承担这类跨前后端扩展安装。
- 后续如需在 Cool 商店展示，可做一个只负责发现/跳转的桥接卡片，最终安装仍交给
  `/phoenix/plugins`；不得由桥接卡片执行 npm 命令或写 Host 源码。

### E. 下午验收顺序

1. 契约 fixture、SVG 安全和首页解析单测；
2. 无扩展基线：admin 登录后 `/` 正常、默认登录页和 Logo 不变；
3. 安装示例站点外观插件，选择自定义登录外观、首页和明暗 Logo，重启后保持；
4. `showFrameworkBranding=false` 下登录页、两种左上角品牌位、title/favicon 不出现默认标识；
5. 无权限用户回退、插件停用/卸载自动恢复默认；
6. 1440/720、light/dark、刷新/返回/冷深链、console 以及 `pnpm type-check/build`。

0.2.3 可以先交付结构化白标登录页；不能因时间不足把认证面板复制进插件、允许任意
HTML/CSS，或用 localStorage 代替 Host 配置。只有第二个真实布局消费者证明结构化 profile
不足时，才启用 manifest 中可选的 `host-auth-shell` 组件入口。
