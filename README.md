# Generating Release Notes for StreamPipes

This repo contains a script that is used for generating the release notes for Apache StreamPipes.

To use the tool:

1. Clone this repo: `git clone https://github.com/dominikriemer/jira-to-issues && cd jira-to-issues`
2. Create a PAT with repo/issue access to your target repo. This can be done from https://github.com/settings/tokens/new. Using a PAT increases the rate limit for the GitHub API.
3. Set your token in an environment variable `GITHUB_TOKEN`: `export GITHUB_TOKEN=<PAT>`
4. Set the id of the GitHub milestone that should be used for generating the release note as environment variable `MILESTONE_ID`: `export MILESTONE_ID=<ID>`. This id can be extracted from the URL when viewing the milestone in GitHub.
5. Run `npm install`
6. Run `npm run exec`
