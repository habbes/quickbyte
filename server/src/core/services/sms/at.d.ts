declare module 'africastalking' {
    export default function Africastalking({ apiKey: string, username: string}) {
        return {
            SMS: {
                send(options: { to: string[], message: string, from?: string }): Promise<any>;
            }
        };
    }
}