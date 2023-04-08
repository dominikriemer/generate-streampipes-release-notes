const {Octokit} = require("@octokit/rest");


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
  labels: string[];
}

export async function downloadIssues(githubToken: string) {

  const allAuthors: Set<string> = new Set<string>();
  const issueCategories: IssueCategory[] = [
    {category: 'enhancement', labels: ['enhancement']},
    {category: 'bug', labels: ['bug']},
    {category: 'breakingchange', labels: ['breaking change']},
    {category: 'deprecation', labels: ['deprecation']},
    {category: 'docs', labels: ['documentation', 'website']},
    {category: 'dependencies', labels: ['dependencies']},
    {category: 'uncategorized', labels: ['xyz']}];

  const issueInfos: IssueInfo[] = issueCategories.map(category => {
    return {category: category.category, issues: []};
  })
  const octokit = new Octokit({auth: githubToken});
  const result = await octokit.paginate(
    octokit.issues.listForRepo,
    {
      owner: 'apache',
      repo: 'streampipes',
      milestone: '2',
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

  //console.log('\n\nAuthors\n');
  //allAuthors.forEach(author => console.log(`@${author}\n`))
  return result;
}

export function processIssue(issueInfos: IssueInfo[], issue, issueCategories: IssueCategory[], allAuthors: Set<string>) {
  const labelNames = issue.labels.map(label => label.name);
  const targetIssue = makeIssue(issue);
  let uncategorized = true;
  issueInfos.forEach(issueInfo => {
    // @ts-ignore
    const categoryLabels = issueCategories.find(cat => cat.category === issueInfo.category).labels;
    if (hasLabel(categoryLabels, labelNames)) {
      issueInfo.issues.push(targetIssue);
      uncategorized = false;
    }
  });

  if (uncategorized) {
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
