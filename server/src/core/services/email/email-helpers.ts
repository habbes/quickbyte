import { EmailHandler } from "./types.js";


export async function sendEmailToMany(emailHandler: EmailHandler ,recipients: { name: string, email: string }[], email: { subject: string, message: string }) {
    const emailTasks = recipients.map(recipient => 
        emailHandler.sendEmail({
            to: recipient,
            subject: email.subject,
            message: email.message
        })
    );
    
    await Promise.all(emailTasks);
}