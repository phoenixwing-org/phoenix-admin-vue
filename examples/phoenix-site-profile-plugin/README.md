# Phoenix 站点外观插件示例

本示例对应正式类型 **品牌与启动页扩展**（`phoenix.admin.branding`）。完整命名、
管理员权限和回退规则见
[《Phoenix 品牌与启动页扩展》](../../docs/Phoenix品牌与启动页扩展.md)。

本目录演示 0.2.3 候选的 UI 扩展结构：由一个可信 Phoenix 插件贡献自定义登录外观、
登录后的默认首页、工作台左上角 Logo、应用名称、favicon 和页面标题。

> 当前 Host 尚未实现 `uiContributions`，因此本目录是契约样例，不能直接选择、安装或打包
> 成 `.phoenix.cool`。实现完成前不得把“路由可见”当作扩展安装成功。

## 目录

```text
phoenix-site-profile-plugin/
├── manifest.proposed.json
├── assets/
│   ├── favicon.svg
│   ├── logo.svg
│   ├── logo-dark.svg
│   ├── logo-compact.svg
│   └── logo-compact-dark.svg
└── vue/modules/sample-site-profile/views/home.vue
```

## 贡献内容

- `login`：只提供登录页标题、副标题和背景资源；用户名、密码、验证码、OAuth、Token 和
  登录跳转仍由 Host 认证面板处理。
- `home`：引用同一 manifest 已声明的 `sample-site-profile-home` 路由；管理员选择不授予
  权限，无权访问时 Host 必须回退到第一个有权限页面。
- `brand`：提供完整 Logo、折叠态 Logo、favicon、应用名和标题模板；
  `showFrameworkBranding=false` 只隐藏业务界面的默认框架标识，不删除许可证或诊断版本。

## 复制为真实插件时

1. 替换 `sample-site-profile`、名称、发布方和所有示例资源。
2. 首页 route、module 和 capability 必须保持同一插件命名空间。
3. Logo 只使用包内 SVG；禁止 script、`foreignObject`、事件属性和外部 href。
4. 构建产生真实 Vue/Node entrypoint，并由产品打包器写入 checksum；不要在 Host 中创建
   symlink、Junction、`file:`、`link:` 或 `workspace:` 依赖。
5. 由 `/phoenix/plugins` 安装并由管理员显式选择登录、首页和品牌槽位；插件启用本身不得
   自动替换站点外观。

## 安全边界

本示例不实现安装验证码。后续若评估一分钟有效的一次性确认码，必须由 Host 绑定
`管理员 + 会话 + moduleId + version + packageSha256 + action` 生成，单次消费、限速、审计、
失败关闭，且不能通过插件响应、浏览器日志或普通文件暴露。该方案需独立威胁建模后决定，
不能作为当前安装流程的隐式依赖。
