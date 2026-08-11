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
favicon。登录后的首页、工作台 Logo 与业务视图仍是普通插件 route/runtime 贡献，不进入
公开登录快照。

## 管理规则

- 只有管理员可以安装、验证、启用、切换、停用或卸载。
- 可以登记多个 `phoenix.admin.branding` 扩展，但同一时刻只有一个公开登录品牌快照处于活动
  状态。
- 安装或启用插件本身不得自动替换登录外观。只有管理员点击“设为登录品牌”才会原子切换。
- 登录后的首页仍由同一插件的普通 route contribution 与用户权限决定，不由公开快照选择。
- 活动插件停用/卸载、安全模式开启或当前选择不可用时，公开登录壳回退 Phoenix Admin 默认。
- 新候选资源损坏或快照生成失败时保持上一份有效快照，不发布半套品牌。
- 回退必须保留可用的 admin 密码登录和合法首页，不能进入 404，也不能形成半套用户品牌。

## 能力边界

Public Login Branding Snapshot v1 允许贡献：

- 严格白名单的 eyebrow、标题、副标题、登录提示与 Host 布局枚举；
- 包内、同源、带 SHA-256/MIME/size 的 Logo、紧凑 Logo、favicon 和可选背景；
- 应用名称和精确含一个 `%s` 的 title 模板。

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
- “Public Login Branding Snapshot”只投影登录前公开品牌壳。示例仓中的登录后首页和
  工作台贡献仍按普通插件 route/runtime 装配，不进入登录快照。

## 干净环境验证

Hub 的 “Phoenix Admin 干净验证”应覆盖：

1. 未安装扩展时，默认 admin 可以登录且 `/` 解析为有权限首页，不跳 404。
2. 安装、启用但未选择扩展时仍直接显示 Host 默认；管理员显式选择后，新登录页首个非空
   可见帧直接显示插件品牌。
3. 登录表单、验证码、OAuth、Token、submit 和路由守卫保持 Host-owned；普通用户不能看到
   品牌管理动作。
4. 停用/卸载活动品牌或安全模式直接显示 Host 默认；损坏的新候选不得覆盖 last-known-good。
5. 冷/热缓存、CPU/网络降速、light/dark、宽窄屏下，视频与 DOM mutation 记录都不得出现
   Phoenix → 插件品牌的替换帧。

## 登录入口恢复

- 普通已登录用户访问 `/login` 时仍按既有路由守卫跳转到 `/`，不改变正常会话。
- 管理员需要主动回到密码登录表单时，可访问一次性入口 `/login?reauth=1`。HTML 会在
  `/src/main.ts` 与模块 `eventLoop` 之前，仅从 localStorage/sessionStorage 移除 `token`、
  `refreshToken`、对应过期时间与 `userInfo`，保留记住的用户名和其他偏好。
- 清理后立即从地址栏移除 `reauth` 参数，再按无登录态的标准 `/login` 流程启动；该入口不调用
  API、不改变服务端会话，也不放宽任何路由或认证规则。

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

当前实现状态、Host 接缝和分阶段计划见
[《Phoenix Admin UI 扩展 TODO》](PahUIEXTENSION-TODO.md)。真实品牌插件的 manifest、
运行入口、静态资源、打包与产品验证由插件产品仓维护，Host 仓不保存可复制的产品样例。
