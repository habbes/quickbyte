# 2023-12-16 Migrating from Entra ID to custom in-house authentication and user management

Due to frustrations working with Azure AD (Entra ID) CIAM to manage identities and authentication, I decided to implement custom authentation instead. I consider using another third-party provider like Auth0, but I didn't want to risk running into more frustrations. I have user data in-house, it's easier to migrate to a third-party provider than it would be to migrate from third-party provider to another. So while I still have few users, it seems best to migrate to local auth for now.

Here's a summary of the issues I faced with Azure AD:
- It was actually not trivial to set up. I found it easier and faster to implement custom auth with login/logout/password reset, email verification than to setup and configure Entra ID, getting lost in documentation, github sample pages, confusing product offerings, etc.
- Entra ID uthentication requests are slow, sometimes taking longer than a second. You could feel the delay when you visit the app and it takes a while before it grants you access.
- I was getting random auth errors every now and then. This leads to poor user experience. This could have been a skill issue on my end, maybe I did not configure things properly, maybe I did not read through the docs. But I didn't want to deal with this anymore.
- The product has not yet reached general availability. The issues I faced may be due to the fact that I was essentially using a product still in preview.

Here are some related issues and PR's
- https://github.com/habbes/quickbyte/issues/123
- https://github.com/habbes/quickbyte/pull/181
- https://github.com/habbes/quickbyte/pull/182

## Migration

After migrating to custom auth, existing users who logged in with email and password will have to reset their passwords because the local db does not have their passwords. These user records still have the `aadId` field which maps to the ids issues by Entra ID. New users will not have this field. The users with `aadId` are considered verified and will not require to go through an email verification process. Nevertheless, password reset (which they have to go through) does involve email verification. New users will require email verification when they sign up, before they can use the app. This might hurt conversions cause it adds an extra step during sign up, but it makes things easier because I don't have to keep track of who is verifed and who is not, if someone is logged in, we can assume they're verified. Entra ID also verified emails during account signup.

### Sign in with Google

I had enabled "Sign in with Google" with Entra ID. I need to also implement this feature with the new auth flow. However, I did not keep track in the database of which users used federated google credentials and which ones used email+password. I need to detect which users use Google so I can take them to the Google flow. To address this, since I don't have that many users, I can go to the Entra ID portal and find all the users who have Google-issued identities and manually add their Google profile ids to the users collection in a `providerId` field and set `provider` to Google.

I can re-use the same Google application I used with Entra ID, configure the same Client ID and secret that way the same authorizations that Google had granted to Quickbyte just continue to work without disruption. I will also update redirect urls on Google's portal to reflect Quickbyte's new auth urls instead of Microsoft's CIAM urls.
