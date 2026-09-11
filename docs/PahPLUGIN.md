# Phoenix Admin Host 业务插件界面

## 页面

本地地址：<http://localhost:9000/phoenix/plugins>。

页面独立于上游 Cool `.cool` 插件商店，用于安装 Phoenix 跨前后端业务插件。
`/helper/plugins` 与 `/phoenix/plugins` 共用工作台 Primary“扩展中心”入口，管理员可以在
Cool 原生插件和 Phoenix 业务插件之间切换；该入口不包含任何具体业务插件映射。
Host 仓库不内置任何产品候选 manifest；管理员应从独立业务插件取得
`.phoenix.cool` 制品，由 Host 校验制品内的 manifest、运行时闭包与迁移声明。

“扩展中心”按职责拆分为两个可折叠 Block：

- “插件”：Cool 插件、Phoenix 插件；
- “Host 管理”：导航分组、字典治理、系统维护。

`/helper/plugins` 的菜单显示名统一为“扩展中心”，路由保持不变。旧数据库通过
`/phoenix/maintenance` 中的固定等幂 operation 修正菜单名称；前端不得用临时文案覆盖数据库，
消费者也不得复制 Host 管理页面。

## 可验证流程

```text
添加 .phoenix.cool → 校验并装配 → 必要时重启 API → 安装并启用
                                                ├─ dry-run
                                                ├─ 有待执行 DDL 时自动备份并恢复点检
                                                ├─ 事务安装
                                                └─ 字典确认与入口启用

已启用插件：停用（独立操作）
已停用插件：启用 / 卸载并保留数据（独立操作）
```

卸载对话框明确提示只注销代码、路由和任务贡献；成功后页面展示保留表数量和备份标识。
所有操作都以清单自己的 `moduleId` 为目标，不依赖任何特定产品名称、路由或表前缀。

## Host 边界

- 页面只接受 `.phoenix.cool`，不兼容旧测试后缀；制品由 Node Host 校验并装配到受控 Host，浏览器不执行任意源码或命令。
- 当前只接受 `restart` 激活方式；实际入口加载必须进入受控构建或重启流程。
- 页面以卡片展示多个插件；安装复杂度收进“运行点检、受控安装、启用入口”三段向导。
- dry-run、必要的可信备份/恢复点检、事务安装与字典确认由一次“安装并启用”串联；
  API 尚未加载新 payload 时只停在运行点检并明确提示重启。
- 停用与卸载是插件卡片上的独立管理操作，不伪装成安装步骤。
- Phoenix 制品必须自包含运行闭包；Host 不根据插件输入执行任意 `pnpm install`。
- Web/Node 入口、路由、API、能力码和迁移 ID 必须留在插件自己的命名空间。
- 卸载固定保留业务数据并要求可恢复的备份标识。
- 已安装清单只驱动通用生命周期与导航贡献，不成为产品配置的第二事实源。

## 导航运行时注册与分组保留

- Host 启动时扫描已通过健康检查的开发 Ribbon，生成只存在于当前进程的
  `development-mounted` 模块注册；Workbench 与“导航分组管理”共用这一份投影结果。
- 开发挂载不会被伪造为正式安装记录，也不要求批处理初始化业务数据库；管理员调整分组时，
  仍只按稳定 `targetKey` 保存 `targetKey → groupId`。
- 正式菜单物化后按相同 `targetKey` 或 route 覆盖开发投影，页面不得出现重复入口。
- 下一阶段由 Node 导航响应统一给出 `installed`、`development-mounted`、`quarantined`、
  `missing` 生命周期状态。数据库只长期保留分组映射及最后一次看到的公开名称/来源，不把
  瞬时健康状态写成事实。
- 插件卸载或暂时缺失时保留分组映射，并在管理页显示“已卸载 · 保留分组”；管理员可显式
  清理记录。同一 `targetKey` 再次出现时自动恢复原分组。

## 后续设计

- 插件 payload 的受控构建、外部 supervisor 重启、回滚及未来热插拔边界见
  [PahPLUGIN-RUNTIME-TODO.md](./PahPLUGIN-RUNTIME-TODO.md)。
- 独立插件仓、开发 Ribbon、Wing View 展示/对话框与未来一键生成器的实施顺序见
  [Phoenix 插件脚手架计划](./Phoenix插件脚手架计划.md)。
- 可插拔登录外观、首页和品牌资源的 Host 接缝见
  [PahUIEXTENSION-TODO.md](./PahUIEXTENSION-TODO.md)。
- 同一插件的新版本不得覆盖运行中的旧 payload；版本化升级卡片、原子切换与回滚流程也在
  上述 TODO 中统一规划。
