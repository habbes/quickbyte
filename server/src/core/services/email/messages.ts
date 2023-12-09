import { AppError } from "../../error.js";
import { UserInvite } from "../../models.js";

export function createWelcomeEmail(name: string, baseUrl: string) {
    return `
Hello ${name},

<h2>Welcome to Quickbyte!</h2>

<p>
We're happy you have chosen Quickbyte for your file transfer needs.
We're working hard to make this the best file transfer and collaboration
service for creatives.
</p>

<p>
To start transfering files, head over to <a href="${baseUrl}>Quickbyte</a>.
</p>

<p>
Don't hestitate to reach out to us if you run into any problems or want
to request any features or improvements.
</p>

<p>
Here's a list of useful resources:
</p>

<ul>
    <li><a href="https://quickbyte.featurebase.app">Feature requests and bug reports</a></li>
    <li><a href="https://www.youtube.com/@QuickbyteHQ">Video Tutorials</a></li>
    <li>Our support contact: support@quickbyte.io</li>
    <li><a href="https://www.iubenda.com/terms-and-conditions/64965646">Terms and Conditions</a></li>
    <li><a href="https://www.iubenda.com/privacy-policy/64965646">Privacy Policy</a></li>
</ul>

<br>
<br>
Regards,
<br>
Quickbyte Team
    `;
}

export function createServerErrorEmail(errors: AppError[]): string {
    let message = '';
    for (let error of errors) {
        message += `
<div>
<h3>Code: ${error.code}</h3>
<p>
${error.message}
</p>
<pre>
${error.stack}
</pre>
<div>
`
    }

    return message;
}

export function createGenericInviteEmail(invitedBy: string, inviteId: string, name: string, appBaseUrl: string) {
    const greeting = name ? `Hello ${name}` : 'Hello';
    const inviteUrl = `${appBaseUrl}/i/${inviteId}`;

    const message =`
${greeting},
<br>
${invitedBy} has invited you to collaborate on Quickbyte.
<br>
Click the following link to accept the invite: <a href="${inviteUrl}">${inviteUrl}</a>.

<br>
<br>
<i>PS: This invite expires in 2 days</i>.
<br>
Regards,
<br>
Quickbyte Team
`
    return message;
}

export function createProjectInviteEmail(invitedBy: string, invite: UserInvite, appBaseUrl: string) {
    const greeting = invite.name ? `Hello ${invite.name}` : 'Hello';
    const inviteUrl = `${appBaseUrl}/i/${invite._id}`;

    const customMessage = invite.message ? `<p>${invite.message}</p>` : '';

    const message = `
${greeting},
<br>
${invitedBy} has invited you to collaborate on the project <b>${invite.resource.name}</b>.
<br>
${customMessage}
<br>
Click the following link to accept the invite and view the project: <a href="${inviteUrl}">${inviteUrl}</a>.
`;
    return message;
}