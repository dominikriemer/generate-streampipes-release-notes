const { getJiras } = require("./shared/jira");
const { jirasToGitHubIssues } = require("./shared/translate");
const { createIssues } = require('./shared/github');

async function run(githubToken: string) {
    const jiras = await getJiras();
    const issues = jirasToGitHubIssues(jiras);
    await createIssues(issues, githubToken);
}

const githubToken = process.env['GITHUB_TOKEN'];
if (!githubToken) {
    throw new Error('No GitHub Token provided - set the token in a GITHUB_TOKEN env variable before running');
}

run(githubToken);