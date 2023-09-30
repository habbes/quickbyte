import { Axios } from 'axios';
import { PaymentHandler, VerifyHandlerSubscriptionResult, VerifyHandlerTransactionResult } from './types.js';
import { Subscription, Transaction, Plan } from '../../models.js'
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

    async verifyTransaction(tx: Transaction): Promise<VerifyHandlerTransactionResult> {
        const response = await this.client.get<string>(`transaction/verify/${tx._id}`);
        const data = JSON.parse(response.data) as PaystackVerifyTransactionResult;

        if (!data.data || !data.status) {
            throw createAppError(`Failed to verify transaction: ${data.message}`);
        }

        const result = data.data;
        const metadata: PaystackTransactionMetadata = {
            channel: result.channel,
            authorization: result.authorization,
            amount: result.amount,
            currency: result.currency,
            customer: result.customer
        };

        return {
            status: result.status === 'success' ? 'success' : 'failed',
            errorMessage: result.message || undefined,
            providerId: String(result.id),
            amount: result.amount,
            currency: result.currency,
            metadata
        };
    }

    async verifySubscription(tx: Transaction, sub: Subscription, plan: Plan): Promise<VerifyHandlerSubscriptionResult> {
        const txMeta = tx.metadata as PaystackTransactionMetadata;

        // TODO we can filter by plan using a URL like the one below. But currently, we're only
        // storing the plan code, not the plan ID.
        // const url = `subscription?customer=${txMeta.customer.id}&plan=${plan.providerIds.paystack}`;
        const response = await this.client.get(
            `subscription?customer=${txMeta.customer.id}`
        );
        
        const data = JSON.parse(response.data) as PaystackFetchSubscriptionResult;
        const paystackSubs = data.data;
        // if there are multiple subs, how do we pick the right one?
        // we find the subscription with matching transaction id and plan
        // there should only be one!

        // Paystack seems to support only one active subscription per customer per plan (understandbly).
        // If the customer pays for another subscription for the same plan, the duplicate
        // subscription will not be created on Paystack's end despite the duplicate transaction.
        // To avoid this situation, we should add validation to prevent creating a subscription when
        // one a valid or pending one already exists.
 
        
        const candidateSubs = paystackSubs.map(p => ({ ...p, createdAt: new Date(p.createdAt) }))
        .filter(p => String(p.most_recent_invoice.transaction) === tx.providerId && p.plan.plan_code === plan.providerIds.paystack);
        
        if (!candidateSubs.length) {
            throw createAppError('Could not match Paystack subscription to transaction.');
        }

        // find the subscription nearest to the transaction time
        candidateSubs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const paystackSub = candidateSubs[0];

        const isActive = (['active', 'attention', 'non-renewing'] as PaystackSubscriptionStatus[]).includes(paystackSub.status);

        const result: VerifyHandlerSubscriptionResult = {
            status: isActive ? 'active' : 'inactive',
            renewsAt: paystackSub.next_payment_date ? new Date(paystackSub.next_payment_date) : undefined,
            willRenew: paystackSub.status === 'active',
            providerId: String(paystackSub.id),
            cancelled: paystackSub.status === 'cancelled',
            attention: paystackSub.status === 'attention',
            metadata: {}
        };

        return result;
    }
}

type PaystackTransactionStatus = 'success';

interface PaystackTransactionMetadata {
    channel: string;
    authorization: {
        authorization_code: string;
        last4: string;
        channel: string;
        card_type: string;
    };
    customer: {
        id: number;
        email: string;
    };
    amount: number;
    currency: string;
}

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

interface PaystackFetchSubscriptionResult {
    status: boolean;
    message: string;
    data: PaystackSubscription[];
}

interface PaystackSubscription {
    "customer": {
        "first_name": string,
        "last_name": string,
        "email": string,
        "phone": string,
        "metadata": null,
        "domain": string,
        "customer_code": string,
        "risk_action": string,
        "id": number,
        "integration": number,
        "createdAt": string,
        "updatedAt": string
    },
    "plan": {
        "domain": string,
        "name": string,
        "plan_code": string,
        "description": string,
        "amount": number,
        "interval": string,
        "send_invoices": boolean,
        "send_sms": boolean,
        "hosted_page": boolean,
        "hosted_page_url": string|null,
        "hosted_page_summary": string|null,
        "currency": string,
        "migrate": string|null,
        "id": number,
        "integration": number,
        "createdAt": string,
        "updatedAt": string
    },
    "integration": number,
    "authorization": {
        "authorization_code": string,
        "bin": string,
        "last4": string,
        "exp_month": string,
        "exp_year": string,
        "channel": string,
        "card_type": string,
        "bank": string,
        "country_code": string,
        "brand": string,
        "reusable": boolean,
        "signature": string,
        "account_name": string
    },
    "most_recent_invoice": {
        subscription: number,
        integration: number,
        domain: string,
        invoice_code: string,
        customer: number,
        transaction: number,
        amount: number,
        period_start: string,
        period_end: string,
        status: string,
        paid: number,
        retries: number,
        authorization: number,
        paid_at: string,
        next_notification: string
        notification_flag: string|null,
        description: string|null,
        id: number,
        created_at: string,
        updated_at: string
    },
    "domain": string,
    "start": number,
    "status": PaystackSubscriptionStatus,
    "quantity": number,
    "amount": number,
    "subscription_code": string,
    "email_token": string,
    "easy_cron_id": string
    "cron_expression": string,
    "next_payment_date": string,
    "open_invoice": string,
    "id": number,
    "createdAt": string,
    "updatedAt": string
}

// see: https://paystack.com/docs/payments/subscriptions/#managing-subscriptions
type PaystackSubscriptionStatus =
    /**
     * The subscription is currently active, and will be charged on the next payment date.
     */
    'active'
    /**
     * The subscription is currently active, but we won't be charging it on the next payment date.
     * This occurs when a subscription is about to be complete, or has been cancelled
     * (but we haven't reached the next payment date yet).
     */
    |'non-renewing'
    /**
     * The subscription is still active, but there was an issue while trying to charge the customer's card.
     * The issue can be an expired card, insufficient funds, etc.
     * We'll attempt charging the card again on the next payment date.
     */
    |'attention'
    /**
     * The subscription is complete, and will no longer be charged.
     */
    |'completed'
    /**
     * The subscription has been cancelled, and we'll no longer attempt to charge the card on the subscription.
     */
    |'cancelled';