# Phoenix 品牌与启动页扩展

## 名称与类型

面向管理员的中文名称统一为 **品牌与启动页扩展**，manifest 类型键为：

```json
{
	"pluginType": "phoenix.admin.branding"
}
```

该类型用于自定义登录页呈现、登录后的默认首页、工作台左上角 Logo、应用名称、
浏览器标题与 favicon。它属于 Phoenix Admin Host 的站点级扩展，不是普通业务插件，
也不替换 Cool/Phoenix 的认证、权限或路由安全逻辑。

## 管理规则

- 只有管理员可以安装、验证、启用、切换、停用或卸载。
- 同一站点最多启用一个 `phoenix.admin.branding` 扩展；新版本采用受控升级，不并行生效。
- 安装插件本身不得自动替换站点外观。管理员需要分别确认品牌、登录外观和默认首页。
- 默认首页必须引用同一 manifest 已声明的路由，并且当前用户必须拥有该路由权限。
- 无权限、插件停用、资源损坏、构建失败或安全模式开启时，整组回退 Phoenix Admin 默认。
- 回退必须保留可用的 admin 密码登录和合法首页，不能进入 404，也不能形成半套用户品牌。

## 能力边界

允许贡献：

- 结构化登录页标题、副标题、背景和包内静态资源；
- 权限范围内的默认首页 routeId；
- 明暗 Logo、紧凑 Logo、应用名称、title 模板和 favicon。

禁止贡献：

- 用户名、密码、验证码、OAuth callback、Token 存储或权限判断；
- 任意匿名路由、远程脚本/CSS、iframe、`v-html` 或浏览器动态扫描磁盘；
- `file:`、`link:`、`workspace:`、symlink 或 Junction 形式的运行挂载；
- 修改 Phoenix/Cool 源码、伪装框架版本、许可证或制品发布者。

## 干净环境验证

Hub 的 “Phoenix Admin 干净验证”应覆盖：

1. 未安装扩展时，默认 admin 可以登录且 `/` 解析为有权限首页，不跳 404。
2. 管理员安装并显式启用扩展后，登录页、默认首页、两种左上角 Logo、title/favicon 一致。
3. 普通用户不能看到管理动作；首页选择不授予新权限。
4. 停用、卸载、资源损坏和安全模式均原子回退 Phoenix 默认。
5. 刷新、冷启动、light/dark、宽窄屏和浏览器前进/后退保持一致。

当前实现状态和分阶段计划见[《Phoenix Admin UI 扩展 TODO》](PahUIEXTENSION-TODO.md)，
可复制的 manifest 与静态资源结构见
[示例插件](../examples/phoenix-site-profile-plugin/README.md)。
