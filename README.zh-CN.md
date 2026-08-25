<div align="center"><a name="readme-top"></a>

# 🚀 DCO 提交 Action

[English](./README.md) · **简体中文**

**自动创建带有 GPG 认证 + DCO 签名的 GitHub Action**

[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-blue)](https://github.com/features/actions)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
</div>

---

## ✨ 特性

- 🔒 **GPG 认证**：自动使用 GitHub Web Flow 证书签名，显示绿色的 **Verified** 徽章
- 📝 **DCO 签名**：自动在提交消息中添加 `Signed-off-by` 行，符合开源贡献协议
- 🎯 **零配置**：无需管理 GPG 私钥，无需配置 `git`
- 🤖 **CI/CD 友好**：完美适配自动化流程、机器人提交和定时任务
- 📦 **批量支持**：单次提交可同时处理多个文件的增删

---

## 🆚 为什么选择本 Action？

| 功能 | 本 Action | planetscale/ghcommit | 手动 `git commit -s` |
|------|----------|---------------------|----------------------|
| GPG 认证 (Verified) | ✅ (通过 GitHub Web Flow) | ✅ (通过 GitHub Web Flow) | ❌ (需本地配置 GPG) |
| DCO 签名 (Signed-off-by) | ✅ (自动生成) | ❌ | ✅ (需加 `-s` 参数) |
| 零配置 | ✅ | ✅ | ❌ |
| CI/CD 友好 | ✅ | ✅ | ❌ |
| 支持 GitHub App | ✅ | ✅ | ❌ (需要令牌) |

---

## 📋 输入参数

| 参数 | 描述 | 必填 | 默认值 |
|------|------|------|--------|
| `token` | GitHub 令牌（personal token 或 GitHub App 安装令牌） | 否 | `${{ github.token }}` |
| `repository` | 仓库全名，格式 `owner/repo` | 否 | `${{ github.repository }}` |
| `branch` | 目标分支名称 | 否 | `${{ github.ref_name }}` |
| `parent-sha` | **父提交 SHA**（分支的最新提交） | **是** | - |
| `files` | 新增或修改的文件路径（逗号或空格分隔） | 否 | - |
| `deleted` | 删除的文件路径（逗号或空格分隔） | 否 | - |
| `headline` | 提交消息标题（首行） | **是** | - |
| `body` | 提交消息正文（可选，DCO 签名会自动追加） | 否 | - |

---

## 📤 输出参数

| 输出 | 描述 |
|------|------|
| `commit-url` | 新创建提交的 URL（例如 `https://github.com/owner/repo/commit/abc123`） |
| `commit-sha` | 新创建提交的 SHA 哈希值 |

---

## 🚀 使用示例

**基础：提交单个文件**

    - name: 提交更新后的文件
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        parent-sha: ${{ github.sha }}
        files: "src/main.js"
        headline: "fix: 更新 main.js 逻辑"

**多个文件并包含提交正文**

    - name: 提交多个文件
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        parent-sha: ${{ steps.get_head.outputs.sha }}
        files: "src/main.js, src/utils.js, docs/README.md"
        headline: "feat: 添加新的工具函数"
        body: |
          - 增加了 parseJSON 辅助函数
          - 更新了文档
          - 版本升级至 1.2.0

**包含文件删除**

    - name: 替换旧文件
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        parent-sha: ${{ github.sha }}
        files: "src/new.js, src/new.css"
        deleted: "src/old.js, src/old.css"
        headline: "refactor: 用新版文件替换旧版"

**使用 GitHub App 令牌**

    - name: 通过 GitHub App 提交
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ steps.app_token.outputs.token }}
        parent-sha: ${{ github.sha }}
        files: "generated/report.json"
        headline: "chore: 更新每日报告"

---

## ⚠️ 限制说明

底层 GitHub GraphQL API（`createCommitOnBranch`）存在以下实际限制：

- **文件数量**：虽然官方未明确限制，但实践中建议单次提交不超过 **100 个文件**。超过此数量可能导致 `413 Payload Too Large` 或 `bad request` 错误。
- **总请求体大小**：整个 GraphQL 请求体（包括 Base64 编码后的文件内容）不能超过 **10 MB**。如果文件较大，请减少单次提交的文件数，或对二进制文件进行压缩。
- **速率限制**：该 API 受 GitHub GraphQL 速率限制（认证令牌每小时 5000 积分），每次提交消耗的积分数取决于复杂度。

如需提交更多文件或更大负载，建议：
- **分批提交**：将变更拆分为多个提交（每个均在限制范围内）并依次推送。
- **预处理**：排除生成文件、使用 `.gitignore`，或压缩大文件。

我们正在评估在后续版本中内置自动分批功能。目前，请根据限制合理控制提交大小。

---

## 🔐 签名详情

**GPG 签名 (Verified 徽章)**

- 提交通过 GitHub 的 GraphQL API（`createCommitOnBranch`）**在服务端创建**。
- GitHub 会自动使用 **Web Flow GPG 证书**为这些提交签名。
- 在提交页面会显示绿色的 **"Verified"** 徽章。
- **无需管理任何私钥**。

**DCO 签名 (Signed-off-by)**

- Action 通过 REST API 获取认证用户的登录名和 ID。
- 构造 `Signed-off-by` 行：  
  `Signed-off-by: username <userid+username@users.noreply.github.com>`
- 这一行会**追加到提交消息的正文末尾**（用户提供的正文之后）。
- 满足 Kubernetes、Linux、CNCF 等项目的 DCO 要求。

---

## 🛠️ 开发指南

**前置条件**

- Node.js 20+（或直接使用预构建的 `dist/` 文件）
- npm

**设置**

    git clone https://github.com/maboloshi/dco-commit-action.git
    cd dco-commit-action
    npm install

**构建**

    npm run build   # 使用 @vercel/ncc 打包成 dist/index.js

**本地测试**

设置环境变量并运行构建后的脚本：

    export GITHUB_TOKEN=your_token
    export GITHUB_REPOSITORY=owner/repo
    export GITHUB_REF_NAME=main
    export GITHUB_SHA=parent_sha_here
    node dist/index.js

---

## 🤝 贡献

欢迎贡献！请提出 Issue 或 Pull Request。

---

## 📄 许可证

[MIT](LICENSE)

---

## 🌟 支持

- 提交 [Issue](https://github.com/maboloshi/dco-commit-action/issues)
- 如果觉得有用，请给仓库点个 Star！
