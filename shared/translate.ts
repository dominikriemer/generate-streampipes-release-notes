import { GhIssue } from "./github";

const maxIssueDescriptionLength = 65000;

function fixLinks(d: string): string {
    const start = d.indexOf("[");
    const endOfLine = d.indexOf("\n", start);
    const endOfLink = d.indexOf("]", start);
    const delimiter = d.indexOf("|", start);
    
    if (start > -1 && endOfLink < endOfLine && endOfLink > -1) {
        let link = d.slice(start+1, endOfLink);
        let caption = link;
        if (delimiter > -1 && delimiter < endOfLink) {
            caption = d.slice(start+1, delimiter);
            link = d.slice(delimiter+1, endOfLink);
        }
        if (link.indexOf("://") > -1) {
            return `${d.slice(0, start)}[${caption}](${link})${fixLinks(d.slice(endOfLink+1))}`;
        }
    }
    
    return d;
}

function parseCodeLines(d: string): string {
    const start = d.indexOf("{");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("}", start);
    if (start > -1 && endOfBlock < endOfLine && endOfBlock > -1) {
        return `${fixLinks(d.slice(0, start))}\n\`${d.slice(start+1, endOfBlock)}\`${parseCodeLines(d.slice(endOfBlock+1))}`
    }

    return fixLinks(d);
}

function parseCodeBlocks(d: string): string {
    const start = d.indexOf("{code");
    const end = d.indexOf("}", start);
    const nextOccurence = d.indexOf("{code}", end);
    if (start > 0 && end > 0 && nextOccurence > 0) {
        let codeBlock = d.slice(end+1, nextOccurence);
        // Jira wraps single line code blocks, GH doesn't - this adds some (dumb) formatting
        let curIndex = 100;
        while (codeBlock.indexOf(" ", curIndex) > -1) {
            curIndex = codeBlock.indexOf(" ", curIndex);
            codeBlock = codeBlock.slice(0, curIndex) + "\n" + codeBlock.slice(curIndex+1);
            curIndex += 100;
        }
        return `${parseCodeLines(d.slice(0, start))}\`\`\`\n${codeBlock}\n\`\`\`\n${parseCodeBlocks(d.slice(nextOccurence + "{code}".length))}`
    }

    return parseCodeLines(d);
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

function jiraToGhIssue(jira: any): GhIssue {
    let issue = new GhIssue();
    issue.Title = jira['Summary'];

    issue.Labels.add(jira['Issue Type'].toLowerCase());
    issue.Labels.add(jira['Priority'].toUpperCase());
    for (let i = 0; i < 10; i++) {
        if (jira[`Component${i}`]) {
            issue.Labels.add(jira[`Component${i}`].toLowerCase());
        }
    }
    if (jira['Status'] === 'Triage Needed') {
        issue.Labels.add('awaiting triage');
    }

    issue.Description = formatDescription(jira['Description']);
    issue.Description += `\n\nImported from Jira [${jira['Issue key']}](https://issues.apache.org/jira/browse/${jira['Issue key']}). Original Jira may contain additional context.`;
    issue.Description += `\nReported by: ${jira['Reporter']}.`;
    issue.Assignee = mapAssigneeToHandle(jira['Assignee']);

    // TODO - remove this when ready to assign for real
    issue.Assignee = 'damccorm';

    return issue;
}

export function jirasToGitHubIssues(jiras: any[]): GhIssue[] {
    return jiras.map(j => jiraToGhIssue(j));
}

function mapAssigneeToHandle(assignee: string): string {
    switch (assignee) {
        case "heejong":
            return "ihji";
        case "reuvenlax":
            return "reuvenlax";
        case "chamikara":
            return "chamikaramj";
        case "lostluck":
            return "lostluck";
        case "kileys":
            return "kileys";
        case "egalpin":
            return "egalpin";
        case "dpcollins-google":
            return "dpcollins-google ";
        case "johnjcasey":
            return "johnjcasey";
        case "emilymye":
            return "emilymye";
        case "mosche":
            return "mosche";
        case "danoliveira":
            return "youngoli";
        case "bhulette":
            return "theneuralbit";
        case "arunpandianp":
            return "arunpandianp";
        case "deepix":
            return "deepix";
        case "Krasavinigor":
            return "Krasavinigor";
        case "pabloem":
            return "pabloem";
        case "damccorm":
            return "damccorm";
        case "msbukal":
            return "msbukal";
        case "fbeevikm":
            return "fbeevikm";
        case "yeandy":
            return "yeandy";
        case "jbonofre":
            return "jbonofre";
        case "damondouglas":
            return "damondouglas";
        case "jrmccluskey":
            return "jrmccluskey";
        case "pcoet":
            return "pcoet";
        case "sfc-gh-kbregula":
            return "sfc-gh-kbregula";
        case "dmitryor":
            return "dmitryor";
        case "nielm":
            return "nielm";
        case "suztomo":
            return "suztomo";
        case "kerrydc":
            return "kerrydc";
        case "ibzib":
            return "ibzib";
        case "SteveNiemitz":
            return "SteveNiemitz";
        case "riteshghorse":
            return "riteshghorse";
        case "robertwb":
            return "robertwb";
        case "apilloud":
            return "apilloud";
        case "denisecase":
            return "denisecase";
        case "andreykus":
            return "andreykus";
        case "lcwik":
            return "lukecwik";
        case "aromanenko":
            return "aromanenko-dev";
        case "tvalentyn":
            return "tvalentyn";
        case "clandry94":
            return "clandry94";
        case "andreigurau":
            return "andreigurau";
        case "laraschmidt":
            return "laraschmidt";
        case "pawel.pasterz":
            return "pawelpasterz";
        case "yoshiki.obata":
            return "lazylynx";
        case "thiscensustaker":
            return "fernando-wizeline";
        case "danimartin":
            return "dannymartinm";
        case "cguillaume":
            return "guillaumecle";
        case "Mike Hernandez":
            return "roger-mike";
        case "masahito":
            return "masahitojp";
        case "yardeni":
            return "TamirYardeni";
        case "bulat.safiullin":
            return "bullet03";
        case "rarokni@gmail.com":
            return "rezarokni";
        case "EliasSegundo":
            return "elink21";
        case "andoni.guzman":
            return "andoni-guzman";
        case "ningk":
            return "KevinGG";
        case "R3tto":
            return "Amar3tto";
        case "svetak":
            return "svetakvsundhar";
        case "yihu":
            return "Abacn";
        case "duliu":
            return "liu-du";
        case "Ryan.Thompson":
            return "ryanthompson591";
        case "Anand Inguva":
            return "AnandInguva";
        case "Alexander Zhuravlev":
            return "miamihotline";
        case "janl":
            return "je-ik";
        case "Ekaterina Tatanova":
            return "ktttnv";
        case "dchen":
            return "dxichen";
        case "thiagotnunes":
            return "thiagotnunes";
        case "ahmedabu":
            return "ahmedabu98";
        case "bingyeli":
            return "libingye816";
        case "marroble":
            return "MarcoRob";
        case "elizaveta.lomteva":
            return "";
    }

    return ""
}