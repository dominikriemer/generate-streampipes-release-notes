const fetch = require('node-fetch');

async function addMapping(issueNumber, jiraReference) {
    var bodyData = `{
    "body": "This isn't actually real, but this issue has been migrated to https://github.com/apache/streampipes/issues/${issueNumber}"
    }`;
    await fetch(`https://issues.apache.org/jira/rest/api/2/issue/${jiraReference}/comment`, {
    method: 'POST',
    headers: {
        'Authorization': `Basic ${Buffer.from(
        'damccorm:Webster1!'
        ).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: bodyData
    })
}

//addMapping(112, "BEAM-14441");
