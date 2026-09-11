# Phoenix 品牌与启动页扩展

## 名称与类型

面向管理员的中文名称统一为 **品牌与启动页扩展**，manifest 类型键为：

```json
{
	"pluginType": "phoenix.admin.branding"
}
```

该类型是 Phoenix Admin Host 的站点级扩展，不是普通业务插件，也不替换
Cool/Phoenix 的认证、权限或路由安全逻辑。本轮 Host 公共契约只处理登录前公开品牌壳：
HTML 解析、初始加载层、登录页、登录 Logo/背景/公开文案、应用名称、浏览器标题与
favicon。v2 另包含登录后工作台左上品牌区所需的公开 Logo、主标题和副标题；登录后的首页、
导航、权限与业务视图仍是普通插件 route/runtime 贡献，不进入品牌快照。

## 管理规则

- 只有管理员可以安装、验证、启用、切换、停用或卸载。
- 可以登记多个 `phoenix.admin.branding` 扩展，但同一时刻只有一个公开登录品牌快照处于活动
  状态。
- 安装或挂载插件本身不得自动替换登录外观。管理员选择或启用品牌插件后先进入“待重启”，
  由下一次受控 API 重启完成校验并原子发布。
- 登录后的首页仍由同一插件的普通 route contribution 与用户权限决定，不由公开快照选择。
- 活动插件停用、取消选择、卸载或进入安全模式后先保持 last-known-good；受控 API 重启成功后
  发布最近一次已验证的 Host 默认品牌。
- 新候选资源损坏或快照生成失败时保持上一份有效快照，不发布半套品牌。
- 回退必须保留可用的 admin 密码登录和合法首页，不能进入 404，也不能形成半套用户品牌。

## 能力边界

Public Login Branding Snapshot v1 允许贡献：

- 严格白名单的 eyebrow、标题、副标题、登录提示与 Host 布局枚举；
- 包内、同源、带 SHA-256/MIME/size 的 Logo、紧凑 Logo、favicon 和可选背景；
- 应用名称和精确含一个 `%s` 的 title 模板。

v2 在 v1 基础上增加严格白名单的 `workbench` 字段，并作为完整静态插件品牌契约。Host 在 Vue
mount 前读取已经解析完成的同一份静态快照；登录页与工作台路由切换期间都不查询数据库。
插件贡献的标题、副标题、明暗 Logo 和 favicon 必须作为一个整体生效，不支持逐项继承 Host。

禁止贡献：

- 用户名、密码、验证码、OAuth callback、Token 存储或权限判断；
- `home.routeId`、用户 capability、登录后首页/工作台/导航或业务数据；
- 任意 HTML/JavaScript/CSS、外部 URL、iframe、`v-html` 或浏览器动态扫描磁盘；
- `file:`、`link:`、`workspace:`、symlink 或 Junction 形式的运行挂载；
- 修改 Phoenix/Cool 源码、伪装框架版本、许可证或制品发布者。

## 参考实现

- 示例产品仓：[Phoenix Branding](https://gitee.com/phoenixwing/phoenix-branding.git)
- 仓库用途：提供 `phoenix.admin.branding` manifest、登录品牌配置、包内 Logo/favicon/
  背景资源、登录后普通插件路由以及产品侧安全契约测试，供插件开发者参考。
- Host 不复制该仓源码，也不把它作为 submodule、npm 依赖或运行时真源；安装后的
  manifest 与已校验制品才是插件输入。
- “Public Login Branding Snapshot”只投影公开品牌壳和工作台身份区。示例仓中的登录后首页、
  导航与业务 UI 仍按普通插件 route/runtime 装配，不进入静态快照。

## 干净环境验证

Hub 的 “Phoenix Admin 干净验证”应覆盖：

1. 未安装扩展时，默认 admin 可以登录且 `/` 解析为有权限首页，不跳 404。
2. 安装、挂载但未选择扩展时仍直接显示 Host 默认；管理员显式选择后先显示待重启，受控 API
   重启成功后，新登录页首个非空可见帧直接显示插件品牌。
3. 登录表单、验证码、OAuth、Token、submit 和路由守卫保持 Host-owned；普通用户不能看到
   品牌管理动作。
4. 停用/卸载活动品牌或安全模式在受控 API 重启后显示最近已验证 Host 默认；损坏的新候选不得
   覆盖 last-known-good。
5. 冷/热缓存、CPU/网络降速、light/dark、宽窄屏下，视频与 DOM mutation 记录都不得出现
   Phoenix → 插件品牌的替换帧。

## 登录入口恢复

- 普通已登录用户访问 `/login` 时仍按既有路由守卫跳转到 `/`，不改变正常会话。
- 管理员需要主动回到密码登录表单时，可访问一次性入口 `/login?reauth=1`。HTML 会在
  `/src/main.ts` 与模块 `eventLoop` 之前，仅从 localStorage/sessionStorage 移除 `token`、
  `refreshToken`、对应过期时间与 `userInfo`，保留记住的用户名和其他偏好。
- 清理后立即从地址栏移除 `reauth` 参数，再按无登录态的标准 `/login` 流程启动；该入口不调用
  API、不改变服务端会话，也不放宽任何路由或认证规则。

## 浏览器标题同步契约

2026-08-13 点检发现：登录成功进入首页后，浏览器标签仍停留在“登录 · Phoenix Admin”。
根因是公开品牌快照和 base 模块安装阶段只在登录前写入一次 `document.title`，路由导航完成后
没有 Host-owned 标题同步。

修复契约：

- `/login` 显示“登录 · `<appName>`”，首页显示“首页 · `<appName>`”；
- 其他路由使用经过长度、控制字符和标记字符检查的 `route.meta.label`；缺失或异常时只显示
  `<appName>`，不采用 URL、查询参数或产品代码推导标题；
- 活动品牌可提供严格校验的 `titleTemplate`，例如 `%s · Acme Workspace`，但登录后的页面名仍由
  Host 路由决定；Public Login Branding Snapshot 不因此扩张到首页、权限或业务视图；
- 标题仅在路由确认成功后更新；取消、失败或登录重定向不能留下错误标题。

验收覆盖 Host 默认与 Acme 模板的登录→首页、普通页面切换，以及缺失/异常 label 回退。

## 二元品牌快照与 Host 备用配置

后台 `/phoenix/branding` 提供四项 Host 输入：明暗 Logo、主标题和副标题。数据库分别保存 Host
默认配置、品牌插件选择和并发 revision；Node 原子发布静态派生快照。Vue 在 mount 前读取品牌
Store，登录页、浏览器标题/favicon 与工作台直接消费同一 revision，不再逐页查库。

公开快照只允许完整的 `host` 或 `plugin` 模式：

```ts
workbench: {
  title: string;
  subtitle: { mode: 'web-origin' | 'text'; text?: string };
  logo: AssetDescriptor;
  logoDark: AssetDescriptor;
}
source: {
  mode: 'host' | 'plugin';
  moduleId?: string;
  version?: string;
}
```

插件 manifest 的 v2 贡献使用 `logoVariant: 'compact'`，由 Host 从已验证的 compact
Logo 收据编译为上述两个静态资源描述符。

- 默认 Logo 复用 Host Phoenix compact SVG；主标题为 `Phoenix Admin`。
- 副标题默认 `web-origin`，浏览器显示当前 `window.location.origin`；也可选择 `text` 并输入
  严格长度/控制字符校验后的文字。不得把固定开发端口、内部 API 地址或密钥写进公开快照。
- `mode=host` 时，四项 Host 输入同时投影到登录左右品牌区、浏览器标题/favicon 和工作台左上角；
  亮色 Logo 默认复用为 favicon。保存并校验成功后立即原子发布新 revision，不要求 API/Web
  重启；当前预览立即更新，新开、刷新或重新登录的页面生效，其他已打开页面刷新后切换。
- `mode=plugin` 时，标题、副标题、明暗 Logo 和 favicon 全部使用同一插件的已验证 manifest 与
  包内资源，不与 Host 按字段混合。页面仍允许编辑 Host 默认品牌，但明确标为“备用”；保存只
  更新 Host 配置 revision，不改变当前插件 snapshot revision。
- v1/v2 插件均按完整固定品牌解释；新制品继续显式声明 `contractVersion: 2` 和完整
  `uiContributions.workbench`，不声明 `hostBindings/effectiveSources`。
- Logo 仍使用包内或 Host 内容寻址资源描述符（SHA-256/MIME/size），禁止数据库 SVG 原文、
  任意 HTML/CSS/JS、外链 URL 与 MutationObserver 生产投影。
- 品牌插件选择、启停、切换及 manifest/资源更新先进入待重启状态；只有受控 API 重启完成校验后
  才发布新插件 revision。首次启用失败保持 Host，活动插件更新失败保持上一 last-known-good。
- 停用或取消选择插件不要求卸载；受控 API 重启后发布最近一次已验证的 Host 备用配置。
- Host 默认配置保存在 `base_sys_param`，SVG 仅以内容寻址静态资源落盘，数据库不保存 SVG
  原文。保存接口使用 revision CAS；配置冲突会要求刷新，不覆盖其他管理员的新值。
- 后台接口固定为 `/admin/phoenix/plugin/workbench-branding/{status,save,reset}`；只有 Host
  管理员可调用。上传只接受 1B～256KiB 的无脚本、无事件处理器、无外链 SVG。

## Host 传输与落盘

- HTML 在 `/src/main.ts` 前同步加载
  `%VITE_PAH_PUBLIC_API_BASE%/admin/base/open/public-login-branding`。该内部同步脚本路由不带
  文件扩展名，避免被 EPS 当作 TypeScript 方法名的一部分写入声明文件。
- Vite 在 `cool()` 初始化前只检查 `build/cool/eps.json` 中
  `/admin/base/open` 下的 `GET /public-login-branding.js` 遗留项，并原子迁移为无扩展路径；
  不删除缓存、不改写其他 `.js` 路由，缓存损坏或 I/O 失败会直接报错。`pnpm diagnose:cool-eps`
  会报告仍残留的精确旧路由数量。
- development 使用已经存在的 `/dev` Vite 代理；production 使用 Admin 现有 `/api` 反代；
  static 模式使用同源根路径。不新增未经部署证实的 `/runtime` Web 映射。
- Node 只返回固定 Host wrapper 与严格校验的 JSON；资源通过内容哈希 URL 匿名读取。
- 当前快照、不可变 revision 与包收据放在 Node Host-owned
  `.runtime/pah-public-login-branding`，使用临时文件、`fsync` 与原子替换；该目录不是产品源码。
- 快照选择只存入现有 `base_sys_param`，不新增品牌产品表或 DDL。

## 启动发现与隔离

- Hub 只创建/移除 `src/modules/<moduleId>` 开发 symlink 和本机 Git exclude；不生成插件
  marker、不初始化插件，也不决定健康状态。
- Web 启动时由 Host 直接扫描实际模块目录。开发 symlink 必须能反查同一 clean Git 产品仓、
  精确 HEAD、manifest、Node/Vue 双端入口；普通正式目录在没有启动前可信激活收据时默认隔离。
- 业务插件 runtime 使用逐插件动态导入；config、install、component 或 onLoad 失败只隔离该插件，
  纯 Host 继续启动，并向 Web Terminal 和浏览器 console 输出同一 moduleId/state/detail。
- 品牌插件不执行其全局 `config.ts` runtime；登录前只消费 Node 生成的声明式安全快照，登录后的
  route view 作为独立动态入口加载。这避免品牌产品用 DOM observer 或任意启动脚本接管认证页。
- `.runtime/pah-dev-plugins.json` 不是身份真源；若现场遗留，只能视为旧实验文件。

当前实现状态、Host 接缝和分阶段计划见
[《Phoenix Admin UI 扩展 TODO》](PahUIEXTENSION-TODO.md)。真实品牌插件的 manifest、
运行入口、静态资源、打包与产品验证由插件产品仓维护，Host 仓不保存可复制的产品样例。
