# 2024-10-21 Rebooting payments and subscriptions

I turned off subscriptions earlier this year as I was pivoting Quickbyte away from a plain file transfer tool into a wider media sharing and collaboration platform. After many months of testing with real users using Quickbyte for real work, I want to enable payments again. I already had subscriptions implemented, but I want to revisit the existing implementation to make sure it will meet the criteria I want and make improvements where necessary.

## Existing implementation

The existing implementation is based on **accounts**, **plans**, **subscriptions**, **transactions** and **providers**. An account allows a user to access features of the app. Files, media, projects, etc. are all stored in an account. An account can have one or multiple users. An account is tied to a single subscription.

A subscription is an instance of plan. A plan defines the features, limits, price, currency and renewal period of an account.

### Implementing monthly and annual versions

In the current implementation, if you want to have one plan with both a monthly and an annual version, you will have two define two plans. The plans will have distinct `name` fields but the same `displayName`. They will have the same feature and limits, same currency, but different `renewalRate` and different `price`.

### Providers

Subscription payments are handled by payment providers. Currently only Paystack is supported. A plan's `providerIds` maps the plan the definition to the corresponding plan in the payment service. For example, Paystack allows you to create subscriptions and subscription plans. The `providerIds` in this case matches each plan to the corresponding subscription plan code in Paystack.

The `PaymentHandler` interface aims to provide an abstraction between  the `TransactionService` (which manages interactions with subscriptions) and the actual payment service.

Currently Paystack handles subscription charging, automatic renewal, we take the user to a Paystack payment page to manage the card (e.g. update payment method) or cancel that subscription. Offloading all the subscription management to Paystack is convenient and saves time, allowing me to roll out subscription faster. However, Paystack's subscription features are very limited. One of the main limitation is that pricing is fixed. So it would not support things like add-ons directly (e.g. adding extra storage space beyond what the plan provides) or usage-based pricing (e.g. per-user pricing, per-GB pricing, etc.). You can't automatically upgrade a user from one plan to another. Such features would require us to write custom implementation. Stripe is a more capable payments provider.

We use webhooks to listen to transaction events from the payment service and match them to a transaction and subscription in Quickbyte. The current code is hacky and not well architected. The abstractions are not well defined to cleanly support different providers.

## New subscriptions model

Moving forward, I'd like to support more features with subscriptions:

- Region-based pricing. I'd like to offer plans in KES to Kenyan customers and USD to other countries. I could also offer different prices for different regions.
- Usage-based pricing: Support for price per-user, price per-GB, etc.
- Support for add-ons (add-ons can be added in the middle of a billing cycle)
- Upgrade plans (upgrades can be done in the middle of a billing cycle)
- Pro-rating (for add-ons and plan changes)
- Invoice/bill generation
- Transaction history
- Ease of support for multiple providers (e.g. Paystack and Stripe)
- Tax (tentative)
- Multiple plans
- Cancellation

Tentative new plans:
- Free tier (e.g. max 3GB storage)
- Lite ($3-$5 max 2 collaborators) (To compete with cheap Google Drive options)
- Pro ($9 per-collaborator) (To compete with Frame.io, WeTransfer, Dropbox Replay)
- Team ($99 unlimited collaborators) (Value for large teams)
- Each plan will have a discounted annual version

I'll figure the right plans, pricing and features after properly analyzing cost of running the business, market opportunity, target audience purchasing power, competitiveness, etc.

### Phase 1: Early Bird Plan

The new features will likely take a while to implement. I do not want to delay subscriptions any further cause they're overdue and I'd like to see how Quickbyte fairs with paying customers before I continue investing in more features. So I plan to re-enable subscriptions using existing implementation with a single paid plan and roll-out new plans after we've implemented a better subscriptions system that supports them.

I'll market the single plan as an "Early Bird Plan", and offer made to current and new users to "reward" them for being early adoptors. This will continue to use the existing implementation based on Paystack. I should let users know that this plan is subject to change. The early bird approach allows me to start charging without committing to long-term pricing. To incentivize users to join the early bird plan, I will grandfather those who sign up for the annual subscription. That means, if you sign up for the annual early bird plan, you can stay on that plan even after it's removed from the site. You will continue to pay the same price for the same features. But if you cancel the plan, you will not be able to renew it if it won't exist anymore. You will have to move to the new plans.

In this phase, I will focus on creating a proper account settings and overhauling the billing management page. I should also start tracking usage and limits.

### Phase 2: New implementation

(TODO: should check if there's some off-the-shelf library or service that already provides all this functionality out of the box)

#### Invoice

To support add-ons, usage-based pricing and prorated billing, I will add a new record to represent an invoice or a bill. At the end of each billing cycle, an invoice will be generated and the invoice will have a line item for each resource that needs to be paid for, e.g.:

- Pro plan 2 collaborators: $9 * 2 = $18
- Storage add-on: 200-GB at $5 per 100GB (prorated to 0.7 months) = $5 * 2 * 0.7 = $7
- Total = $25

We'll need to track what resources were active during that billing cycle, and for how long they were active so that we can charge and prorate them accordingly.

#### Billing cycle

When a user initiates a subscription to a plan and is charged for, that begins the billing cycle. The subscription's duration will depend on the renewal rate (e.g. monthly, annually, etc.). The payment is made at the start of the subscription, not the end. At the end of the subscription, a new billing cycle will start, and the subscription will be automatically renewed (if payment is succeeds).

The billing cycle is determined by the active subscription. If the customer purchases an add-on in the middle of the cycle, then it will be attached the current subscription's billing cycle. For example, if a monthly subscription started on 1st September, it is scheduled to be renewed on 1st October. If on 15th October
the customer purchases an add-on worth 10$ per month, then the customer will be charged 5$ on 15th October and $10 at the renewal on 1st of October. Not sure if this is most natural way to handle it. Another option would be no to charge on 15th, and then charge $15 on 1st October, then $10 every month after that. Another option would be to have independent billing cycles for each product, that would mean the customer would be charged multiple times per month. I think that's confusing and makes it harder for the customer to plan.

