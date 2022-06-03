const { getJiras } = require("./shared/jira");
const { jirasToGitHubIssues } = require("./shared/translate");
const { createIssues } = require('./shared/github');

async function run(githubToken: string) {
    const jiras = await getJiras();
    console.log("Translating jiras to issues");
    const issues = jirasToGitHubIssues(jiras);
    console.log(`Found ${issues.length} issues to be created, with an additional ${issues.reduce((acc, i) => i.Children.length + acc, 0)} subtasks.`);
    await createIssues(issues, githubToken);
}

const githubToken = process.env['GITHUB_TOKEN'];
if (!githubToken) {
    throw new Error('No GitHub Token provided - set the token in a GITHUB_TOKEN env variable before running');
}
const jiraUsername = process.env['JIRA_USERNAME'];
if (!jiraUsername) {
    throw new Error('No Jira Username provided - set the token in a JIRA_USERNAME env variable before running');
}
const jiraPassword = process.env['JIRA_PASSWORD'];
if (!jiraUsername) {
    throw new Error('No Jira Password provided - set the token in a JIRA_PASSWORD env variable before running');
}

run(githubToken);