## Sample paystack webhookd events

### `charge.success`

Triggered when card was charged successfully. In this example,
this was in response to a manually triggered charge when
purchasing a subscription. What about when a subscription
is automatically renewed? Does it still have a `reference`?

```json
{
  event: 'charge.success',
  data: {
    id: 3157687910,
    domain: 'test',
    status: 'success',
    reference: 'c5d4da038636785ecaf76c18319e4fd5',
    amount: 100000,
    message: null,
    gateway_response: 'Successful',
    paid_at: '2023-10-01T13:46:14.000Z',
    created_at: '2023-10-01T13:46:11.000Z',
    channel: 'card',
    currency: 'KES',
    ip_address: '105.163.0.16',
    metadata: { referrer: 'http://localhost:5173/pay' },
    fees_breakdown: null,
    log: null,
    fees: 2900,
    fees_split: null,
    authorization: {
      authorization_code: 'AUTH_mpkkiwzkaj',
      bin: '408408',
      last4: '4081',
      exp_month: '12',
      exp_year: '2030',
      channel: 'card',
      card_type: 'visa ',
      bank: 'TEST BANK',
      country_code: 'KE',
      brand: 'visa',
      reusable: true,
      signature: 'SIG_nMZLf7vKo9eDk6EDDSP5',
      account_name: null,
      receiver_bank_account_number: null,
      receiver_bank: null
    },
    customer: {
      id: 141845023,
      first_name: '',
      last_name: '',
      email: 'habbes@manuscript.live',
      customer_code: 'CUS_hyl64o3siqkcx03',
      phone: '',
      metadata: null,
      risk_action: 'default',
      international_format_phone: null
    },
    plan: {
      id: 946004,
      name: 'Quickbyte Starter',
      plan_code: 'PLN_kaperxeyhecphkl',
      description: null,
      amount: 100000,
      interval: 'monthly',
      send_invoices: 1,
      send_sms: 1,
      currency: 'KES'
    },
    subaccount: {},
    split: {},
    order_id: null,
    paidAt: '2023-10-01T13:46:14.000Z',
    requested_amount: 100000,
    pos_transaction_data: null,
    source: {
      type: 'web',
      source: 'checkout',
      entry_point: 'request_inline',
      identifier: null
    }
  }
}
```

### `subscription.not_renew`

Triggered when subscription is cancelled.

```json
{
  event: 'subscription.not_renew',
  data: {
    id: 558390,
    domain: 'test',
    status: 'non-renewing',
    subscription_code: 'SUB_ygfaj9e6d8g5h13',
    email_token: 'nmuo6dr7icd3rma',
    amount: 100000,
    cron_expression: '46 13 1 * *',
    next_payment_date: null,
    open_invoice: null,
    createdAt: '2023-10-01T13:46:15.000Z',
    integration: 1037001,
    plan: {
      id: 946004,
      name: 'Quickbyte Starter',
      plan_code: 'PLN_kaperxeyhecphkl',
      description: null,
      amount: 100000,
      interval: 'monthly',
      send_invoices: 1,
      send_sms: 1,
      currency: 'KES'
    },
    authorization: {
      authorization_code: 'AUTH_mpkkiwzkaj',
      bin: '408408',
      last4: '4081',
      exp_month: '12',
      exp_year: '2030',
      channel: 'card',
      card_type: 'visa ',
      bank: 'TEST BANK',
      country_code: 'KE',
      brand: 'visa',
      reusable: true,
      signature: 'SIG_nMZLf7vKo9eDk6EDDSP5',
      account_name: null
    },
    customer: {
      id: 141845023,
      first_name: '',
      last_name: '',
      email: 'habbes@manuscript.live',
      customer_code: 'CUS_hyl64o3siqkcx03',
      phone: '',
      metadata: null,
      risk_action: 'default',
      international_format_phone: null
    },
    invoice_limit: 0,
    split_code: null,
    most_recent_invoice: null
  }
}
```