import { AppError } from "../../error.js";

export function createWelcomeEmail(name: string) {
    return `
Hello ${name},

<h2>Welcome to Quickbyte!</h2>

<p>
We're happy you have chosen Quickbyte for your file transfer needs.
We're working hard to make this the best file transfer and collaboration
service for creatives.
</p>

<p>
To start transfering files, head over to <a href="https://quickbyte.io">Quickbyte</a>.
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