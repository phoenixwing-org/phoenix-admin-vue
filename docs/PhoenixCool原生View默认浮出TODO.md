# Cool 原生 View 默认浮出 TODO

## 状态与范围

本文件只记录可行性与实施门禁，**本轮不改 Cool 原生 View**。Phoenix 插件 View 的 Host
默认 presentation 与 Cool 原生 View 的全面默认化是两个阶段，不能用前者的局部结果宣称后者
已经完成。

现状：

- Admin 已有全局 View Dialog Host，负责表单/工具对话框；它不是完整路由 View 的浮出管理器。
- Wing 0.7.2 本地候选已有 `PnwViewPresentationPortal`、record/reducer、lease、浮窗栈、
  `PnwPageHeader` presentation context 和恢复/收回动作。
- Phoenix 插件运行入口可在路由装载边界识别；Cool 固定模块、显式 `route.component`、Page、
  iframe 与异常路由需要单独的 eligibility 策略。
- `docs/Phoenix插件脚手架计划.md` 过去把 View Dialog 与完整 View presentation 混写为
  “adapter 已完成”，必须以代码和浏览器门禁为准。

## 推荐架构

采用“路由边界包装 + Host coordinator + Process 单一真源 + detached cache pin”：

1. Cool `base/process` 继续是页签和导航唯一真源；presentation map 只保存 Wing 纯 record、
   owner 匿名 ID、MRU 与边界，不创建第二套 Router/Tab store。
2. Host 给每个适用 Process 项签发不含 `fullPath`、query 或显示文案的匿名
   `viewInstanceId`。`fullPath` 只用于导航，不进入 DOM identity、日志或持久化。
3. 统一包装 `viewPath` loader 与显式 `route.component`；外层仍保留单 element transition
   root，route props/attrs 原样传给真实 View。
4. 浮出提交后 pin 真实业务 View 的 KeepAlive 实例，并按 MRU 选择下一个 embedded View；
   owner Tab 点击只聚焦浮窗，收回完成后再导航回 owner。
5. 关闭 owner、关闭其他/全部、权限撤销、插件停用和登出时，先协调 Portal/对话框，再释放
   cache、lease 与 Process 投影。
6. 标准 `PnwPageHeader` 通过 Wing context 只显示一组动作；没有标准 Header 的旧 View 由 Host
   提供 fallback。已有自管 Portal 的旧页面只允许短期 opt-out，并逐步迁出。
7. 当前全局 `key++` 刷新会重建 KeepAlive；默认化前必须改为 owner 定向刷新，不能销毁其他浮窗。

## 默认排除

- login、OAuth、错误页、AI Code 等 `isPage=true` 页面；
- Home、redirect、catch-all、`meta.process=false` 与无稳定 owner 的路由；
- 外部 URL、iframe、全屏 takeover、Workspace gate 与 mobile 明确不支持浮窗的页面；
- 已自管 Portal 的过渡期页面；
- 没有统一 dirty/busy guard 时正在保存、上传、安装或存在未保存表单的 View。

普通 Cool CRUD 原理上可移动同一个 Vue 实例，但 `cl-dialog append-to-body`、直接
`el-dialog`、Select/DatePicker overlay 的焦点、Escape 与 z-index 必须通过浏览器矩阵后才能
默认开启。

## 分阶段实施

1. 冻结已发布 Wing 契约，区分 View Dialog、Phoenix 插件完整 View 与 Cool 原生完整 View。
2. 实现 eligibility resolver、匿名 identity、record/MRU coordinator 与生命周期单测。
3. 同时覆盖 loader 与显式 component，验证 fragment、route props、参数深链。
4. 完成 detached cache pin、Tab 投影、浮窗菜单、定向刷新、关闭和权限清理。
5. 接入 Cool CRUD/Dialog 的 dirty、busy、焦点、Escape 与 overlay owner 契约。
6. 先标准 Process View，再 Cool CRUD，再 Phoenix Host 内置 View；Page/iframe 持续排除。

## 硬门禁

- 使用正式发布并精确锁定的 Wing，不依赖 dirty sibling 才能 production build。
- detach → 切路由 → reattach 全程业务 View 只 mount 一次，输入、筛选、选择、滚动和草稿不丢。
- 非 keepAlive View 浮出后也不销毁；刷新一个 Tab 不影响其他浮窗。
- 两个以上浮窗的层级、聚焦、单个/全部收回正确。
- query/参数更新、冷深链、前进/后退无 stale owner；原始 query 不进入 presentation identity。
- Escape 只作用活动浮窗；子级 Select/DatePicker/Dialog 优先消费时不得误收回整页。
- 没有统一关闭守卫前不显示真正关闭 View 的 X；“收回”不销毁业务状态。
- Classic、Workbench、Hybrid 行为一致；无 Vue/Router/Pinia/Unhandled/404/500。
- Home/Page/iframe/mobile opt-out 有单测和真实浏览器证据。

达到以上门禁后，才能把“Cool 原生 View 默认可浮出”从 TODO 改为已交付能力。
