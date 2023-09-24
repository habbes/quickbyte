declare module '@paystack/inline-js' {
    export interface PaystackInlineOptions {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        reference?: string;
        plan?: string;
        container?: string | HTMLElement;
        callback?: (response: PaystackInlineResponse) => void;
        onClose?: () => void;
    }
  
    export interface PaystackInlineResponse {
        status: string;
        message: string;
        data?: any;
    }

    export interface PaystackHandler {
        openIframe(): void;
    }
  
    export function setup(options: PaystackInlineOptions): PaystackHandler;
    export function closePaymentModal(): void;
}
