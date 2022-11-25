/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *  https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GhIssue } from "./github";

const maxIssueDescriptionLength = 65000;

function parseQuote(d: string): string {
    let startIndex = d.indexOf("{quote}");
    if (startIndex <= -1) {
        return d;
    }
    d = d.substring(0, startIndex) + "> " + d.substring(startIndex + "{quote}".length);
    let endIndex = d.indexOf("{quote}");
    if (endIndex > -1) {
        d = d.substring(0, endIndex) + d.substring(endIndex + "{quote}".length);
    } else {
        endIndex = d.length + 100;
    }
    let index = d.indexOf("\n", startIndex);
    while (index < endIndex && index > -1) {
        d = d.substring(0, index) + "\n> " + d.substring(index + "\n> ".length);
        index = d.indexOf("\n", index+"\n> ".length);
    }

    return parseQuote(d);
}

function escapeSpecialChars(d: string): string {
    d = d.replace(/==/g, "\\==");
    d = d.replace(/--/g, "\\--");
    return parseQuote(d.replace(/>/g, "\\>"));
}

function parseLists(d: string): string {
    let curIndex = 0;
    while (curIndex > -1) {
        while (curIndex < d.length && d[curIndex] == " " || d[curIndex] == "\n") {
            curIndex++;
        }
        if (curIndex < d.length-1 && d[curIndex] == "#" && d[curIndex+1] == " ") {
            return `${escapeSpecialChars(d.slice(0, curIndex))}- ${parseLists(d.slice(curIndex+2))}`;
        }
        curIndex = d.indexOf("\n", curIndex);
    }

    return escapeSpecialChars(d);
}

function parseBold(d: string): string {
    const start = d.indexOf("{*}");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("{*}", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseLists(d.slice(0, start))}_${d.slice(start+1, endOfBlock)}_${parseBold(d.slice(endOfBlock+3))}`
    }

    return parseLists(d);
}

function parseItalics(d: string): string {
    const start = d.indexOf("{_}");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("{_}", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseBold(d.slice(0, start))}_${d.slice(start+1, endOfBlock)}_${parseUnderline(d.slice(endOfBlock+3))}`
    }

    return parseBold(d);
}

// Markdown doesn't have underline, so we'll just go with bold
function parseUnderline(d: string): string {
    const start = d.indexOf("+");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("+", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseItalics(d.slice(0, start))}**${d.slice(start+1, endOfBlock)}**${parseUnderline(d.slice(endOfBlock+1))}`
    }

    return parseItalics(d);
}

function fixLinks(d: string): string {
    const start = d.indexOf("[");
    const endOfLine = d.indexOf("\n", start);
    const endOfLink = d.indexOf("]", start);
    const delimiter = d.indexOf("|", start);
    
    if (start > -1 && endOfLink > start) {
        if (endOfLink > endOfLine && endOfLine > -1) {
            // Potential link spans multiple lines, move on to looking in next line.
            return `${parseUnderline(d.slice(0, endOfLine + 1))}${fixLinks(d.slice(endOfLine+1))}`;
        }
        let link = d.slice(start+1, endOfLink);
        let caption = link;
        if (delimiter > -1 && delimiter < endOfLink) {
            caption = d.slice(start+1, delimiter);
            link = d.slice(delimiter+1, endOfLink);
        }
        if (link.indexOf("://") > -1) {
            return `${parseUnderline(d.slice(0, start))}[${caption}](${link})${fixLinks(d.slice(endOfLink+1))}`;
        }

        // No valid link, continue looking in rest of description.
        return `${parseUnderline(d.slice(0, endOfLink + 1))}${fixLinks(d.slice(endOfLink+1))}`;
    }

    return parseUnderline(d);
}

function parseHeaders(d: string): string {
    const headerToMarkdown = {
        "h1.": "#",
        "h2.": "##",
        "h3.": "###",
        "h4.": "####",
        "h5.": "#####"
    }
    for (const header of Object.keys(headerToMarkdown)) {
        if (d.indexOf(header) == 0) {
            d = headerToMarkdown[header] + d.slice(header.length);
        }
        while (d.indexOf(`\n${header}`) > -1) {
            d = d.replace(`\n${header}`, `\n${headerToMarkdown[header]}`)
        }
    }
    return fixLinks(d)
}

function parseCodeLines(d: string): string {
    const start = d.indexOf("{{");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("}}", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseHeaders(d.slice(0, start))}\`${d.slice(start+2, endOfBlock)}\`${parseCodeLines(d.slice(endOfBlock+2))}`
    }

    return parseHeaders(d);
}

function parseNoFormatBlocks(d: string): string {
    const start = d.indexOf("{noformat}");
    const nextOccurence = d.indexOf("{noformat}", start + 10);
    if (start > -1 && nextOccurence > -1) {
        let codeBlock = d.slice(start + "{noformat}".length, nextOccurence);
        // Jira wraps single line code blocks, GH doesn't - this adds some (dumb) formatting
        let curIndex = 100;
        while (codeBlock.indexOf(" ", curIndex) > -1) {
            curIndex = codeBlock.indexOf(" ", curIndex);
            codeBlock = codeBlock.slice(0, curIndex) + "\n" + codeBlock.slice(curIndex+1);
            curIndex += 100;
        }
        return `${parseCodeLines(d.slice(0, start))}\`\`\`\n${codeBlock}\n\`\`\`\n${parseCodeBlocks(d.slice(nextOccurence + "{noformat}".length))}`
    }

    return parseCodeLines(d);
}

function parseCodeBlocks(d: string): string {
    const start = d.indexOf("{code");
    const end = d.indexOf("}", start);
    const nextOccurence = d.indexOf("{code}", end);
    if (start > -1 && end > -1 && nextOccurence > -1) {
        let codeBlock = d.slice(end+1, nextOccurence);
        // Jira wraps single line code blocks, GH doesn't - this adds some (dumb) formatting
        let curIndex = 100;
        while (codeBlock.indexOf(" ", curIndex) > -1) {
            curIndex = codeBlock.indexOf(" ", curIndex);
            codeBlock = codeBlock.slice(0, curIndex) + "\n" + codeBlock.slice(curIndex+1);
            curIndex += 100;
        }
        return `${parseNoFormatBlocks(d.slice(0, start))}\`\`\`\n${codeBlock}\n\`\`\`\n${parseCodeBlocks(d.slice(nextOccurence + "{code}".length))}`
    }

    return parseNoFormatBlocks(d);
}

function truncate(d: string): string {
    if (d.length <= maxIssueDescriptionLength) {
        return d;
    }
    return `${d.slice(0, maxIssueDescriptionLength)}\n\n issue truncated because of its length - to see full context, see original Jira`;
}

function formatDescription(d: string): string {
    d = parseCodeBlocks(d);
    d = truncate(d);
    
    return d;
}

function validLabel(l): boolean {
    const labelExclusionList = [
      "Global", "api", "pull-request-available", "AWS", "suggestion-postpone", "suggestion-outdated",
      "streampipes", "suggestion-done", "suggestion-wip"]
    if (!l || l.length <= 0) {
        return false;
    }
    if (l.indexOf(',') > -1) {
        return false;
    }

    if (labelExclusionList.indexOf(l) > -1) {
        return false;
    }

    console.log('Found valid label ' + l)

    return true;
}

function getLabel(l): string {
    switch (l) {
        case "Backend":
        case "Data Lake":
            return "core"
        case "Connect":
        case "connect-worker":
        case "plc":
        case "plc4x":
        case "Pipeline Elements":
        case "extensions":
        case "postgres":
        case "postgresql":
            return "extensions"
        case "UI":
        case "ui":
            return "ui"
        case "Documentation":
        case "documentation":
        case "user-guide":
        case "docs":
            return "documentation"
        case "Website":
        case "website":
            return "website"
        case "Installer":
            return "installer"
        case "ci":
        case "deployment":
            return "gh-actions"
        case "client":
            return "client"
        case "python":
            return "python"
        case "integration-test":
        case "test":
            return "testing"
        case "newbie":
        case "easyfix":
            return "good first issue"
        case "features":
            return "enhancement"
        case "gsoc2021":
            return "gsoc"
        case "mentor":
            return "help wanted"
    }
    return l
}

function jiraToGhIssue(jira: any): GhIssue {
    let issue = new GhIssue();
    issue.Title = jira['Summary'];

    issue.Labels.add(jira['Issue Type'].toLowerCase());
    issue.Labels.add(jira['Priority'].toUpperCase());
    for (let i = 0; i < 10; i++) {
        if (validLabel(jira[`Component${i}`])) {
            issue.Labels.add(getLabel(jira[`Component${i}`].toLowerCase()));
        }
        if (validLabel(jira[`Label${i}`])) {
            issue.Labels.add(getLabel(jira[`Label${i}`].toLowerCase()));
        }
    }
    if (jira['Status'] === 'Triage Needed') {
        issue.Labels.add('awaiting triage');
    }

    issue.Description = formatDescription(jira['Description']);
    issue.Description += `\n\nImported from Jira [${jira['Issue key']}](https://issues.apache.org/jira/browse/${jira['Issue key']}). Original Jira may contain additional context.`;
    issue.Description += `\nReported by: ${jira['Reporter']}.`;
    if (jira['Inward issue link (Cloners)']) {
        issue.Description += "\nThis issue has child subcomponents which were not migrated over. See the original Jira for more information.";
    }

    issue.Assignee = mapAssigneeToHandle(jira['Assignee']);
    issue.JiraReferenceId = jira['Issue id']

    issue.Assignable = isAssignable(issue.Assignee, mapAssigneeToHandle(jira['Assignee']));

    return issue;
}

export function jirasToGitHubIssues(jiras: any[]): GhIssue[] {
    const filteredJiras = jiras.filter(j => j["Issue Type"] != "Sub-task").filter(j => j['Summary'].indexOf("Beam Dependency Update Request:") < 0);
    const subTasks = jiras.filter(j => j["Issue Type"] == "Sub-task");
    let issues: GhIssue[] = [];
    for (const jira of filteredJiras) {
        let issue = jiraToGhIssue(jira);
        issue.Children = subTasks.filter(t => t['Parent id'] == jira['Issue id']).map(t => jiraToGhIssue(t));
        issues.push(issue);
    }

    return issues
}

function mapAssigneeToHandle(assignee: string): string {
    // only PMC & committers, as others are ignored by Github spam protection
    switch (assignee) {
        case "bossenti":
        case "udeho":
            return "bossenti";
        case "cdutz":
            return "chrisdutz";
        case "ebi":
            return "EbiDa";
        case "fjohn":
            return "Madabaru";
        case "grainier":
            return "grainier";
        case "mheyden":
            return "heymarco";
        case "micklich":
            return "flomickl";
        case "mohanvive":
            return "mohanvive";
        case "obermeier":
            return "obermeier";
        case "patrickphilipp":
            return "patrickraoulphilipp";
        case "patrickraoulphilipp":
            return "patrickraoulphilipp";
        case "riemer":
            return "dominikriemer";
        case "tex":
            return "tejoha";
        case "vesense":
            return "vesense";
        case "wiener":
            return "wipatrick";
        case "zehnder":
            return "tenthe";
        case "zike":
            return "RobertIndie";
    }

    return "";
}



function isAssignable(assignee: string, jiraUsername: string): boolean {
    const assignable = [
       "bossenti", "chrisdutz", "EbiDa", "Madabaru", "grainier", "heymarco",
      "flomickl", "mohanvive", "obermeier", "patrickraoulphilipp", "dominikriemer",
      "tejoha", "vesense", "wipatrick", "tenthe", "RobertIndie"
    ];
    // Check gh handle and jira username in case I copied the wrong one
    return (assignable.indexOf(assignee) > -1 || assignable.indexOf(jiraUsername) > -1);
}
