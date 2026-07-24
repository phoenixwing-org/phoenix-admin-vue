# 许可说明

## 仓库许可证

`phoenix-admin-vue` 及仓内 Phoenix 新增的 `Pah*` 宿主代码统一采用 MIT License。

根目录 [LICENSE](LICENSE) 是 Cool Admin Vue 固定基线随附的原始 MIT 文本和版权声明，必须原样保留。Phoenix 对上游文件的修改和全新文件也按同一 MIT 条款发布；不得把 Admin 仓内新增文件标为 Apache-2.0。

## 上游与维护关系

本仓库是 PhoenixWing 维护的 Cool Admin Vue 分叉，不是 Cool Admin 官方发行物。固定上游、提交和同步规则见 [UPSTREAM.md](UPSTREAM.md)。Git 历史用于保留原作者及后续贡献记录。

## 依赖与组合发行物

第三方依赖继续适用其各自许可证。Phoenix Wing 以 Apache-2.0 依赖使用；未来独立的 Open Issue、Function 模块继续保持各自许可证。

当发行物组合本仓库、Phoenix Wing 或独立业务模块时，发行物必须同时携带适用于实际依赖的 MIT、Apache-2.0、NOTICE 和第三方声明。这不会把本仓库源码的许可证从 MIT 改成 Apache-2.0。

当前前端构建直接包含 Phoenix Wing 0.5.1。静态产物通过 `public/licenses/` 和 `public/THIRD-PARTY-NOTICES.md` 携带 MIT、Apache-2.0 与 Wing 归属说明。公开发行前仍应根据锁文件和实际构建物生成并复核完整第三方许可清单。
