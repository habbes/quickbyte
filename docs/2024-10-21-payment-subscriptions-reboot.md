# 2024-10-21 Rebooting payments and subscriptions

I turned off subscriptions earlier this year as I was pivoting Quickbyte away from a plain file transfer tool into a wider media sharing and collaboration platform. After many months of testing with real users using Quickbyte for real work, I want to enable payments again. I already had subscriptions implemented, but I want to revisit the existing implementation to make sure it will meet the criteria I want and make improvements where necessary.

## Existing implementation

The existing implementation is based on **accounts**, **plans**, **subscriptions**, **transactions** and **providers**. An account allows a user to access features of the app. Files, media, projects, etc. are all stored in an account. An account can have one or multiple users. An account is tied to a single subscription.

A subscription is an instance of plan. A plan defines the features, limits, price, currency and renewal period of an account.

### Implementing monthly and annual versions

In the current implementation, if you want to have one plan with both a monthly and an annual version, you will have two define two plans. The plans will have distinct `name` fields but the same `displayName`. They will have the same feature and limits, same currency, but different `renewalRate` and different `price`.