const { Octokit } = require("@octokit/rest");
const fs = require('fs');

const owner = 'apache';
const repo = 'beam';
const stateDir = `./repo-state/${owner}/${repo}`;
const stateFile = `${stateDir}/alreadyCreated.txt`;
const mappingFile = `${stateDir}/mapping.txt`;

export class GhIssue {
    public Title: string;
    public Labels: Set<string>;
    public Description: string;
    public State: string;
    public Milestone: string;
    public Assignee: string;
    public JiraReferenceId: string;
    public Children: GhIssue[];
    constructor() {
        this.Title = '';
        this.Labels = new Set();
        this.Description = "";
        this.State = "open";
        this.Milestone = "";
        this.Assignee = "";
        this.JiraReferenceId = "";
        this.Children = [];
    }
}

function sleep(seconds: number): Promise<null> {
    const ms = seconds * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function commentWithSubtasks(issueNumber: number, client: any, childNumbers: number[], retry: number = 0) {
    try {
        let resp = await client.rest.issues.createComment({
            owner: owner,
            repo: repo,
            issue_number: issueNumber,
            body: `The following subtask(s) are associated with this issue:${childNumbers.map(n => ` #${n}`).join(',')}`,
          });
        if (resp.status == 403) {
            const backoffSeconds= 60*(2**(retry));
            console.log(`Getting rate limited. Sleeping ${backoffSeconds} seconds`);
            await sleep(backoffSeconds);
            console.log("Trying again");
            await commentWithSubtasks(issueNumber, client, childNumbers, retry+1);
        } else if (resp.status > 210) {
            throw new Error(`Failed to comment on issue with status code: ${resp.status}. Full response: ${resp}`);
        }
    } catch (ex) {
        console.log(`Failed to comment on issue with error: ${ex}`);
        const backoffSeconds= 60*(2**(retry));
        console.log(`Sleeping ${backoffSeconds} seconds before retrying`);
        await sleep(backoffSeconds);
        console.log("Trying again");
        await commentWithSubtasks(issueNumber, client, childNumbers, retry+1);
    }
}

async function createIssue(issue: GhIssue, client: any, retry: number = 0, parent: number = -1): Promise<number> {
    let description = issue.Description;
    if (parent != -1) {
        description += `\nSubtask of issue #${parent}`;
    }
    let assignees: string[] = [];
    if (issue.Assignee) {
        assignees.push(issue.Assignee);
    }
    try {
        let resp = await client.rest.issues.create({
            owner: owner,
            repo: repo,
            assignees: assignees,
            title: issue.Title,
            body: description,
            labels: Array.from(issue.Labels)
        });
        if (resp.status == 403) {
            const backoffSeconds= 60*(2**(retry));
            console.log(`Getting rate limited. Sleeping ${backoffSeconds} seconds`);
            await sleep(backoffSeconds);
            console.log("Trying again");
            return await createIssue(issue, client, retry+1, parent);
        } else if (resp.status < 210) {
            console.log(`Issue #${resp.data.number} maps to ${issue.JiraReferenceId}`);
            fs.appendFileSync(mappingFile, `${resp.data.number}: ${issue.JiraReferenceId}`);
            let issueNumbers: number[] = []
            for (const child of issue.Children) {
                issueNumbers.push(await createIssue(child, client, 0, resp.data.number));
            }
            if (issueNumbers.length > 0) {
                await commentWithSubtasks(resp.data.number, client, issueNumbers, 0);
            }
            return resp.data.number;
        } else {
            throw new Error(`Failed to create issue: ${resp.data.title} with status code: ${resp.status}. Full response: ${resp}`);
        }
    } catch (ex) {
        console.log(`Failed to create issue with error: ${ex}`);
        const backoffSeconds= 60*(2**(retry));
        console.log(`Sleeping ${backoffSeconds} seconds before retrying`);
        await sleep(backoffSeconds);
        console.log("Trying again");
        return await createIssue(issue, client, retry+1, parent);
    }
}

export async function createIssues(issues: GhIssue[], githubToken: string) {
    const client = new Octokit({auth: githubToken});
    let alreadyCreated: string[] = [];
    if (fs.existsSync(stateFile)) {
        alreadyCreated = fs.readFileSync(stateFile, {encoding:'utf8'}).split(',');
    } else {
        fs.mkdirSync(stateDir, { recursive: true });
    }
    for (const issue of issues) {
        if (alreadyCreated.indexOf(issue.JiraReferenceId) < 0) {
            await createIssue(issue, client);
            alreadyCreated.push(issue.JiraReferenceId);
            fs.writeFileSync(stateFile, alreadyCreated.join(','));
        }
    }
}