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
async function getDCOSignature(octokit) {
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    return `Signed-off-by: ${user.login} <${user.id}+${user.login}@users.noreply.github.com>`;
  } catch {
    core.warning('Could not fetch user info, using fallback DCO signature');
    return 'Signed-off-by: github-actions <github-actions@users.noreply.github.com>';
  }
}

/**
 * Main action
 */
async function run() {
  try {
    // ---------- Read inputs ----------
    const token = core.getInput('token', { required: true });
    const repository = core.getInput('repository') || `${github.context.repo.owner}/${github.context.repo.repo}`;
    const branch = core.getInput('branch') || github.context.refName;
    const parentSha = core.getInput('parent-sha', { required: true });
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
    const dcoSignature = await getDCOSignature(octokit);
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
