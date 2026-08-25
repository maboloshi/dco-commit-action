const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs').promises;

/**
 * Parse comma or space separated list into array
 */
function parseFileList(input) {
  if (!input) return [];
  return input.split(',').map(s => s.trim()).filter(s => s);
}

/**
 * Generate DCO Signed-off-by line from authenticated user
 */
async function getDCOSignature(octokit, appSlug) {
  let userInfo = null;

  // 1. 优先使用 app-slug 获取 bot 信息
  if (appSlug) {
    try {
      const botUsername = `${appSlug}[bot]`;
      const { data: user } = await octokit.rest.users.getByUsername({ username: botUsername });
      userInfo = user;
    } catch (error) {
      core.warning(`Could not fetch bot info for "${appSlug}[bot]", falling back to default user`);
    }
  }

  // 2. 尝试获取当前认证用户（个人 token）
  if (!userInfo) {
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      userInfo = user;
    } catch (error) {
      core.warning('Could not fetch current user info, falling back to default');
    }
  }

  // 3. 最终 fallback（确保签名总是有效）
  if (userInfo) {
    return `Signed-off-by: ${userInfo.login} <${userInfo.id}+${userInfo.login}@users.noreply.github.com>`;
  } else {
    return 'Signed-off-by: github-actions[bot] <github-actions@users.noreply.github.com>';
  }
}

/**
 * Main action
 */
async function run() {
  try {
    // ---------- Read inputs ----------
    const token = core.getInput('token', { required: true });
    const appSlug = core.getInput('app-slug');
    const repository = core.getInput('repository') || `${github.context.repo.owner}/${github.context.repo.repo}`;
    const branch = core.getInput('branch') || github.context.refName;
    const parentSha = core.getInput('parent-sha') || github.context.sha;
    const filesInput = core.getInput('files');
    const deletedInput = core.getInput('deleted');
    const headline = core.getInput('headline', { required: true });
    const body = core.getInput('body');

    // ---------- Parse files ----------
    const addedFiles = parseFileList(filesInput);
    const deletedFiles = parseFileList(deletedInput);

    // ---------- Authenticate ----------
    const octokit = github.getOctokit(token);

    // ---------- Generate DCO ----------
    const dcoSignature = await getDCOSignature(octokit, appSlug);
    const fullBody = body ? `${body}\n\n${dcoSignature}` : dcoSignature;

    // ---------- Process additions ----------
    const additions = [];
    for (const filePath of addedFiles) {
      try {
        const contentBuffer = await fs.readFile(filePath);
        const contentBase64 = contentBuffer.toString('base64');
        additions.push({ path: filePath, contents: contentBase64 });
      } catch (err) {
        core.warning(`File "${filePath}" not found or unreadable, skipping`);
      }
    }

    const deletions = deletedFiles.map(f => ({ path: f }));

    // ---------- GraphQL query ----------
    // This API automatically signs commits with GitHub Web Flow GPG certificate
    const query = `
      mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            url
            oid
          }
        }
      }
    `;

    const variables = {
      input: {
        branch: {
          repositoryNameWithOwner: repository,
          branchName: branch,
        },
        message: {
          headline: headline,
          body: fullBody,
        },
        fileChanges: {
          additions: additions,
          deletions: deletions,
        },
        expectedHeadOid: parentSha,
      },
    };

    // ---------- Execute ----------
    const result = await octokit.graphql(query, variables);
    const commitUrl = result.createCommitOnBranch.commit.url;
    const commitOid = result.createCommitOnBranch.commit.oid;

    // ---------- Output ----------
    core.setOutput('commit-url', commitUrl);
    core.setOutput('commit-sha', commitOid);

    console.log(`✅ Commit created successfully!`);
    console.log(`🔗 URL: ${commitUrl}`);
    console.log(`🔑 SHA: ${commitOid}`);
    console.log(`🔒 GPG Signature: Verified (GitHub Web Flow)`);
    console.log(`📝 DCO Signature: ${dcoSignature}`);

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
    if (error.errors) {
      console.error('GraphQL errors:', JSON.stringify(error.errors, null, 2));
    }
  }
}

run();
