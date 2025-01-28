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

import {printReleaseNotes} from './shared/create-release-notes';

async function run(githubToken: string, milestoneId: string) {
    console.log(`Generating the release notes for milestone: ${milestoneId}`)
    const issues = await printReleaseNotes(githubToken, milestoneId);
    console.log(`\n Release notes are based on ${issues.length} issues (not all of them are included in the final release notes)`);
}

const githubToken = process.env['GITHUB_TOKEN'];
if (!githubToken) {
    throw new Error('No GitHub Token provided - set the token in a GITHUB_TOKEN env variable before running');
}

const milestoneId = process.env['MILESTONE_ID']
if (!milestoneId) {
    throw new Error('No milestone id provided - please set identifier of the milestone for which the release notes should be created via the MILESTONE_ID env variable before running.')
}

run(githubToken, milestoneId);
