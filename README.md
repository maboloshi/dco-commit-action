<div align="center"><a name="readme-top"></a>

# 🚀 DCO Commit Action

**English** · [简体中文](./README.zh-CN.md)

**GitHub Action for creating commits with GPG Verified + DCO Signed-off-by signatures**

[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-blue)](https://github.com/features/actions)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
</div>

---

## ✨ Features

- 🔒 **GPG Verified**: Automatically signed with GitHub Web Flow certificate (shows **Verified** badge)
- 📝 **DCO Signed**: Automatically adds `Signed-off-by` line to commit messages
- 🎯 **Zero Configuration**: No GPG keys to manage, no `git config` needed
- 🤖 **CI/CD Ready**: Perfect for automated workflows, bots, and scheduled jobs
- 📦 **Batch Support**: Handles multiple file additions and deletions in one commit

---

## 🆚 Why This Action?

| Feature | This Action | planetscale/ghcommit | Manual `git commit -s` |
|---------|-------------|---------------------|------------------------|
| GPG Verified | ✅ (via GitHub Web Flow) | ✅ (via GitHub Web Flow) | ❌ (requires local GPG setup) |
| DCO Signed (Signed-off-by) | ✅ (auto‑generated) | ❌ | ✅ (requires `-s` flag) |
| Zero Configuration | ✅ | ✅ | ❌ |
| CI/CD Friendly | ✅ | ✅ | ❌ |
| Works with GitHub Apps | ✅ | ✅ | ❌ (needs token) |

---

## 📋 Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `token` | GitHub token (classic or GitHub App installation token) | No | `${{ github.token }}` |
| `repository` | Repository in `owner/repo` format | No | `${{ github.repository }}` |
| `branch` | Target branch name | No | `${{ github.ref_name }}` |
| `parent-sha` | **Expected parent commit SHA** (tip of the branch) | **Yes** | - |
| `files` | Added/modified file paths (comma or space separated) | No | - |
| `deleted` | Deleted file paths (comma or space separated) | No | - |
| `headline` | Commit message headline (subject line) | **Yes** | - |
| `body` | Commit message body (optional, DCO is appended automatically) | No | - |

---

## 📤 Outputs

| Output | Description |
|--------|-------------|
| `commit-url` | URL of the newly created commit (e.g., `https://github.com/owner/repo/commit/abc123`) |
| `commit-sha` | SHA hash of the newly created commit |

---

## 🚀 Usage Examples

**Basic: Commit a Single File**

    - name: Commit updated file
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        parent-sha: ${{ github.sha }}
        files: "src/main.js"
        headline: "fix: update main.js logic"

**Multiple Files with Body**

    - name: Commit multiple files
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        parent-sha: ${{ steps.get_head.outputs.sha }}
        files: "src/main.js, src/utils.js, docs/README.md"
        headline: "feat: add new utility functions"
        body: |
          - Added parseJSON helper
          - Updated documentation
          - Bumped version to 1.2.0

**With File Deletions**

    - name: Replace old files
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        parent-sha: ${{ github.sha }}
        files: "src/new.js, src/new.css"
        deleted: "src/old.js, src/old.css"
        headline: "refactor: replace legacy files with new versions"

**Using a GitHub App Token**

    - name: Commit via GitHub App
      uses: maboloshi/dco-commit-action@v1
      with:
        token: ${{ steps.app_token.outputs.token }}
        parent-sha: ${{ github.sha }}
        files: "generated/report.json"
        headline: "chore: update daily report"

---

## ⚠️ Limitations

The underlying GitHub GraphQL API (`createCommitOnBranch`) has the following practical constraints:

- **File count**: Although not strictly documented, the API can handle up to about **100 files** per commit in practice. Exceeding this may result in a `413 Payload Too Large` or `bad request` error.
- **Total payload size**: The entire GraphQL request body (including Base64‑encoded file contents) must not exceed **10 MB**. If your files are large, reduce the number of files per commit or use binary compression.
- **Rate limiting**: The API is subject to GitHub's GraphQL rate limits (5000 points per hour for authenticated tokens). Each commit consumes points based on complexity.

If you need to commit more files or larger payloads, consider:
- **Batching**: Split your changes into multiple commits (each within the limits) and push sequentially.
- **Pre‑processing**: Exclude generated files, use `.gitignore`, or compress large assets.

We are evaluating built‑in batching for a future release. For now, please manage your commit size accordingly.

---

## 🔐 Signature Details

**GPG Signature (Verified Badge)**

- The commit is created **server-side** via GitHub's GraphQL API (`createCommitOnBranch`).
- GitHub automatically signs these commits with its **Web Flow GPG certificate**.
- On the commit page, you will see a **green "Verified"** badge.
- No private key management is required.

**DCO Signature (Signed-off-by)**

- The Action fetches the authenticated user's login and ID via the REST API.
- It constructs a `Signed-off-by` line:  
  `Signed-off-by: username <userid+username@users.noreply.github.com>`
- This line is **appended to the commit message body** (after any user‑supplied body).
- This satisfies the DCO requirement for projects like Kubernetes, Linux, and CNCF projects.

---

## 🛠️ Development

**Prerequisites**

- Node.js 20+ (or use the pre‑built `dist/` file)
- npm

**Setup**

    git clone https://github.com/maboloshi/dco-commit-action.git
    cd dco-commit-action
    npm install

**Build**

    npm run build   # uses @vercel/ncc to bundle into dist/index.js

**Testing Locally**

Set environment variables and run the built script:

    export GITHUB_TOKEN=your_token
    export GITHUB_REPOSITORY=owner/repo
    export GITHUB_REF_NAME=main
    export GITHUB_SHA=parent_sha_here
    node dist/index.js

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request.

---

## 📄 License

[MIT](LICENSE)

---

## 🌟 Support

- File an [issue](https://github.com/maboloshi/dco-commit-action/issues)
- Star the repository if you find it useful!
