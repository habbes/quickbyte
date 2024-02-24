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

export function createServerErrorWithDetails(errors: { error: AppError, details: any }[]): string {
    let message = '';
    for (let error of errors) {
        message += `
<div>
<h3>Code: ${error.error.code}</h3>
<p>
${error.error.message}
</p>
<pre>
${error.error.stack}
</pre>
<h4>Additional details</h4>
<pre>
${ error.details }
</pre>
<div>
`
    }

    return message;
}

export function createGenericInviteEmail(invitedBy: string, inviteSecret: string, name: string, appBaseUrl: string) {
    const greeting = name ? `Hello ${name}` : 'Hello';
    const inviteUrl = `${appBaseUrl}/i/${inviteSecret}`;

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

export function createProjectInviteEmail(invitedBy: string, invite: UserInvite, secretCode: string, appBaseUrl: string) {
    const greeting = invite.name ? `Hello ${invite.name}` : 'Hello';
    const inviteUrl = `${appBaseUrl}/i/${secretCode}`;

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

export function createDeclineProjectInviteEmail(invitedBy: string, invite: UserInvite) {
    const inviteeName = invite.name ? `${invite.name} (${invite.email})` : invite.email;
    const message =`
Hello ${invitedBy},
<br>
${inviteeName} has declined your request to join the project <b>${invite.resource.name}</b> on Quickbyte.
`;
    return message;
}

export function createDeclineGenericInviteEmail(invitedBy: string, invite: UserInvite) {
    const inviteeName = invite.name ? `${invite.name} (${invite.email})` : invite.email;
    const message =`
Hello ${invitedBy},

${inviteeName} has declined your request to join <b>${invite.resource.name}</b> on Quickbyte.
`;
    return message;
}

export function createInviteAcceptedEmail(invitorName: string, inviteeName: string, invite: UserInvite) {
    if (invite.resource.type === 'project') {
    return `
Hello ${invitorName},
<br>
${inviteeName} has accepted your invitation to collaborate on project <b>${invite.resource.name}</b> on Quickbyte.
`;
    }

    return `
Hello ${invitorName},
<br>
${inviteeName} (${invite.email}) has accepted your invitation on <b>Quickbyte</b>.
`;
}

// TODO: mention media file name in message
export function createMediaCommentNotificationEmail({
    authorName,
    recipientName,
    commentText,
    projectName,
    url
}: {
    authorName: string,
    recipientName: string,
    commentText: string,
    projectName: string,
    url: string
}) {
    return `
Hello ${recipientName},
<br>
${authorName} has shared the following comment in the project <b>${projectName}</b>.
<br>
<p style="padding:10px">
    <blockquote>
    ${commentText}
    </blockquote>
</p>
<p>
Click <a href="${url}">here</a> to open the comment.
</p>
`
}

export function createEmailVerificationEmail({ code }: { code: string }) {
    return `
<p>
Enter the 6-digit code below to verify your identity and gain access to your
Quickbyte account.
</p><br>
<p style="font-weight:bold;font-size:20px">
${code}
</p><br>
<p>
Quickbyte Team
</p>
<br>
<p stylef="font-size:8px">
If this request did not come from you, contact us at <a href="mailto:support@quickbyte.io">support@quickbyte.io</a>.
</p>
`;
}