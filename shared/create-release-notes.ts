const {Octokit} = require("@octokit/rest");

const issueCategories: IssueCategory[] = [
    {category: '### Enhancement 🌟', categoryPrint:"", labels: ['enhancement']},
    {category: '### Bug fixes 🧰',categoryPrint:"",  labels: ['bug']},
    {category: '### Breaking Change 💣',categoryPrint:"",  labels: ['breaking change']},
    {category: '### Deprecation ⚠️',categoryPrint:"",  labels: ['deprecation']},
    {category: '### Documentation & Website 📚',categoryPrint:"",  labels: ['documentation', 'website']},
    {category: '### Dependency Updates 📦',categoryPrint:"",  labels: ['dependencies']},
    {category: 'uncategorized',categoryPrint:"",  labels: ['xyz']}];

export interface Issue {
    issueNumber: string;
    issueTitle: string;
    issueLink: string;
    issueAuthor: string;
}

export interface IssueInfo {
    category: string;
    issues: Issue[];
}

export interface IssueCategory {
    category: string;
    categoryPrint: string,
    labels: string[];
}

export async function printReleaseNotes(githubToken: string, milestoneId: string) {

    const allAuthors: Set<string> = new Set<string>();

    const issueInfos: IssueInfo[] = issueCategories.map(category => {
        return {category: category.category, issues: []};
    })
    const octokit = new Octokit({auth: githubToken});
    const result = await octokit.paginate(
        octokit.issues.listForRepo,
        {
            owner: 'apache',
            repo: 'streampipes',
            milestone: milestoneId,
            state: 'closed',
        }
    );

    result.forEach(issue => {
        processIssue(issueInfos, issue, issueCategories, allAuthors);
    });

    issueInfos.forEach(issueInfo => {
        console.log(`\n\n${issueInfo.category}\n`);
        issueInfo.issues.forEach(issue => {
            console.log(`* [[#${issue.issueNumber}](${issue.issueLink})]: ${issue.issueTitle}\n`)
        });
    });
    return result;
}

export function processIssue(issueInfos: IssueInfo[], issue, issueCategories: IssueCategory[], allAuthors: Set<string>) {
    const labelNames = issue.labels.map(label => label.name);
    const targetIssue = makeIssue(issue);
    let uncategorized = true;
    issueInfos.forEach(issueInfo => {
        // @ts-ignore
        const categoryLabels = issueCategories.find(cat => cat.category === issueInfo.category).labels;
        if (hasLabel(categoryLabels, labelNames)&& !hasLabel(["no release note"], labelNames)) {
            issueInfo.issues.push(targetIssue);
            uncategorized = false;
        }
    });

    if (uncategorized && !hasLabel(["no release note"], labelNames)) {
        // @ts-ignore
        issueInfos.find(info => info.category === 'uncategorized').issues.push(targetIssue);
    }

    allAuthors.add(targetIssue.issueAuthor);
}

export function hasLabel(labels: string[], issueLabels: string[]) {
    return issueLabels.some(label => labels.includes(label));
}

export function makeIssue(issue): Issue {
    return {
        issueAuthor: issue.user.login,
        issueLink: issue.html_url,
        issueTitle: issue.title,
        issueNumber: issue.number
    }
}
