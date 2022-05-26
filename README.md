# jira-to-issues
Repo for migrating Jiras to GitHub issues. This is specialized to use by the Apache Beam repo, but it can probably be adapted to other use cases relatively painlessly.

To use the tool:

1. Clone this repo: `git clone https://github.com/damccorm/jira-to-issues && cd jira-to-issues`
2. Update the target owner/repo in [shared/github.ts](https://github.com/damccorm/jira-to-issues/blob/cf416753af0982a845a27666e5dd55f0f2c30cf8/shared/github.ts#L4-5) to point to your organization/repo where you want the issues created.
3. Update the jira link in [shared/jira.ts](https://github.com/damccorm/jira-to-issues/blob/cf416753af0982a845a27666e5dd55f0f2c30cf8/shared/jira.ts#L40) to generate a csv containing issues you would like migrated. Right now, it is set to migrate open issues in the Beam Jira.
4. Run `npm install`
5. Run `npm run exec`

As long as you use the existing repo that you've cloned, the `exec` operation is resumable. So if you run into any issues during migration (e.g. your computer randomly restarts), you can resume the migration by running `npm run exec` again without risking duplicate issues.
