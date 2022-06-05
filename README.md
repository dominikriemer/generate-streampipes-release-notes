# jira-to-issues
Repo for migrating Jiras to GitHub issues. This is specialized to use by the Apache Beam repo, but it can probably be adapted to other use cases relatively painlessly.

To use the tool:

1. Clone this repo: `git clone https://github.com/damccorm/jira-to-issues && cd jira-to-issues`
2. Update the target owner/repo in [shared/github.ts](https://github.com/damccorm/jira-to-issues/blob/cf416753af0982a845a27666e5dd55f0f2c30cf8/shared/github.ts#L4-5) to point to your organization/repo where you want the issues created.
3. Update the jira link in [shared/jira.ts](https://github.com/damccorm/jira-to-issues/blob/cf416753af0982a845a27666e5dd55f0f2c30cf8/shared/jira.ts#L40) to generate a csv containing issues you would like migrated. Right now, it is set to migrate open issues in the Beam Jira.
4. Update the jira link in [shared/github.ts](https://github.com/damccorm/jira-to-issues/blob/0b9eb93f915385e959a30a79e1c6397732d56a2f/shared/github.ts#L68-L70) to point to the Jira board you would like migrated and the GitHub repo you are migrating to. Right now it is set to Beam's Jira and Issues.
5. Create a PAT with repo/issue access to your target repo. This can be done from https://github.com/settings/tokens/new
6. Set your token in an environment variable `GITHUB_TOKEN`: `export GITHUB_TOKEN=<PAT>`
7. Set your JIRA username in an environment variable `JIRA_USERNAME`: `export JIRA_USERNAME=<username>`
8. Set your JIRA password in an environment variable `JIRA_PASSWORD`: `export JIRA_PASSWORD=<password>`
9. Run `npm install`
10. Run `npm run exec`

As long as you use the existing repo that you've cloned, the `exec` operation is resumable. So if you run into any issues during migration (e.g. your computer randomly restarts), you can resume the migration by running `npm run exec` again without risking duplicate issues.
