
export interface SmsHandler {
    sendSms(to: string, message: string): Promise<void>;
}