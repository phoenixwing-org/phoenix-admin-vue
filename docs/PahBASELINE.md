# Phoenix Admin Vue H1 基线

日期：2026-07-24

## 固定输入

- Cool Admin Vue：`8.x` / `a2d4ee9bbfd6bfce880382f0bf6f8dd8f3397a2d`
- LICENSE SHA-256：`b4714a1ae13a8f448c4805a027f590ceb34946b1e6b3a381883ca4c720a56d51`
- Node.js：`v23.7.0`（后续 CI 还需覆盖目标 LTS Node 20）
- pnpm：`10.15.1`

## 结果

- `pnpm install --frozen-lockfile`：通过。
- `pnpm run type-check`：通过。
- `pnpm run build`：通过。
- 构建时上游 `cool-eps` 在线数据获取失败，但未阻断产物生成。
- 构建报告包含旧版 Browserslist 数据及第三方 `eval` 使用警告，列入后续依赖治理，不在 H1 品牌/许可提交中升级依赖。

运行 `pnpm run verify` 可重复执行类型检查和生产构建。
