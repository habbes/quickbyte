import { Axios } from 'axios';
import { PaymentHandler, VerifyTransactionResult } from './types.js';
import { Transaction } from '../../models.js'
import { createAppError } from '../../error.js';

export interface PaystackHandlerConfig {
    publicKey: string;
    secretKey: string;
}

export class PaystackPaymentHandler implements PaymentHandler {
    private client: Axios;
    constructor(private config: PaystackHandlerConfig) {
        this.client = new Axios({
            baseURL: 'https://api.paystack.co/',
            headers: {
                Authorization: `Bearer ${config.secretKey}`,
                "Content-Type": "application/json",
            }
        });;
    }

    name() {
        return 'paystack';
    }

    initializeMetadata(tx: Transaction): Promise<Record<string, any>> {
        return Promise.resolve({
            key: this.config.publicKey
        });
    }

    async verifyTransaction(tx: Transaction): Promise<VerifyTransactionResult> {
        const response = await this.client.get<string>(`transaction/verify/${tx._id}`);
        const data = JSON.parse(response.data) as PaystackVerifyTransactionResult;
        console.log('paystack result', typeof data, data);

        if (!data.data || !data.status) {
            throw createAppError(`Failed to verify transaction: ${data.message}`);
        }

        const result = data.data;

        return {
            status: result.status === 'success' ? 'success' : 'failed',
            errorMessage: result.message || undefined,
            providerId: String(result.id),
            amount: result.amount,
            currency: result.currency,
            metadata: {
                channel: result.channel,
                authorization: result.authorization,
                amount: result.amount,
                currency: result.currency
            }
        }
    }
}

type PaystackTransactionStatus = 'success';

// see: https://paystack.com/docs/payments/verify-payments/
interface PaystackVerifyTransactionResult {
    "status": boolean,
    "message": string
    "data": {
        "id": number,
        "domain": string,
        "status": PaystackTransactionStatus,
        "reference": string,
        "amount": number,
        "message": null,
        "gateway_response": string, // e.g. 'Successful'
        "paid_at": string,
        "created_at": string,
        "channel": string, // e.g. card
        "currency": string,
        "ip_address": string,
        "metadata": string,
        "log": {
            "start_time": number,
            "time_spent": number,
            "attempts": number,
            "errors": number,
            "success": boolean,
            "mobile": boolean,
            "input": any[],
            "history": { type: string, message: string, time: number }[]
        },
        "fees": number,
        "fees_split": {
            "paystack": number,
            "integration": number,
            "subaccount": number,
            "params": {
                "bearer": string, // e.g. "account"
                "transaction_charge": string,
                "percentage_charge": string // e.g. "0.2"
            }
        },
        "authorization": {
            "authorization_code": string,
            "bin": string,
            /**
             * last 4 digits of the credit card
             */
            "last4": string,
            // .e.g "12"
            "exp_month": string,
            // e.g. "2020"
            "exp_year": string,
            // e.g. "card"
            "channel": string,
            // e.g. "visa DEBIT"
            "card_type": string,
            "bank": string,
            // e.g. "NG"
            "country_code": string,
            // e.g. "visa"
            "brand": string,
            "reusable": boolean,
            "signature": string,
            "account_name": string | null
        },
        "customer": {
            "id": number,
            "first_name": string | null,
            "last_name": string | null,
            "email": string,
            "customer_code": string,
            "phone": string | null,
            "metadata": string | null,
            // e.g. "default"
            "risk_action": string
        },
        "plan": string | null,
        "order_id": string | null,
        "paidAt": string,
        "createdAt": string,
        "requested_amount": number,
        "transaction_date": string,
        "plan_object": {},
        "subaccount": {
            "id": number,
            "subaccount_code": string,
            "business_name": string,
            "description": string,
            "primary_contact_name": string | null,
            "primary_contact_email": string | null,
            "primary_contact_phone": string | null,
            "metadata": string | null,
            // e.g. 0.2
            "percentage_charge": number,
            "settlement_bank": string,
            "account_number": string
        }
    }
}