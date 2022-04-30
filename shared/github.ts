const { Octokit } = require("@octokit/rest");

export class GhIssue {
    public Title: string;
    public Labels: Set<string>;
    public Description: string;
    public State: string;
    public Milestone: string;
    public Assignee: string;
    constructor() {
        this.Title = '';
        this.Labels = new Set();
        this.Description = "";
        this.State = "open";
        this.Milestone = "";
        this.Assignee = "";
    }
}

function sleep(seconds: number): Promise<null> {
    const ms = seconds * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createIssue(issue: GhIssue, client: any, retry: number = 0) {
    let assignees: string[] = [];
    if (issue.Assignee) {
        assignees.push(issue.Assignee);
    }
    try {
        let resp = await client.rest.issues.create({
            owner: 'damccorm',
            repo: 'test-migration-target',
            assignees: assignees,
            title: issue.Title,
            body: issue.Description,
            labels: Array.from(issue.Labels)
        });
        if (resp.status == 403) {
            const backoffSeconds= 60*(2**(retry));
            console.log(`Getting rate limited. Sleeping ${backoffSeconds} seconds`);
            await sleep(backoffSeconds);
            console.log("Trying again");
            await createIssue(issue, client, retry+1);
        } else if (resp.status < 210) {
            console.log(`Created issue: ${resp.data.title}`);
        } else {
            throw new Error(`Failed to create issue: ${resp.data.title} with status code: ${resp.status}. Full response: ${resp}`);
        }
    } catch (ex) {
        console.log(`Failed to create issue with error: ${ex}`);
        const backoffSeconds= 60*(2**(retry));
        console.log(`Sleeping ${backoffSeconds} seconds before retrying`);
        await sleep(backoffSeconds);
        console.log("Trying again");
        await createIssue(issue, client, retry+1);
    }
}

export async function createIssues(issues: GhIssue[], githubToken: string) {
    const client = new Octokit({auth: githubToken});
    for (const issue of issues) {
        await createIssue(issue, client);
    }
}