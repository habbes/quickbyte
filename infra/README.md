# Setup Terraform

Install terraform: https://terraform.io

Follow these instructions to install Terraform and setup
your environment for Azure deployment: https://developer.hashicorp.com/terraform/tutorials/azure-get-started/azure-build

## Setup Azure

Create an azure account if you don't have one: https://azure.com

Install **Azure CLI**: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

Login to the Azure CLI: `az login`

If you have multiple tenants, you can specify a tenant. Ensure to specify a tenant
that has the subscription you want to use:

```sh
az login --tenant <TENANT_ID>
```

Sample output:

```sh
You have logged in. Now let us find all the subscriptions to which you have access...

[
  {
    "cloudName": "AzureCloud",
    "homeTenantId": "0envbwi39-home-Tenant-Id",
    "id": "35akss-subscription-id",
    "isDefault": true,
    "managedByTenants": [],
    "name": "Subscription-Name",
    "state": "Enabled",
    "tenantId": "0envbwi39-TenantId",
    "user": {
      "name": "your-username@domain.com",
      "type": "user"
    }
  }
]
```

Set subscription:

```sh
az account set --subscription "35akss-subscription-id"
```

Create a service principal, which is an app registered
within your Azure AD tenant that will be used to perform actions on your behalf.
We use the `--scope` option to restrict which subscriptions this service principal
has access to:

```sh
az ad sp create-for-rbac --role="Contributor" --scopes="/subscriptions/<SUBSCRIPTION_ID>"
```

Sample output:

```sh
Creating 'Contributor' role assignment under scope '/subscriptions/35akss-subscription-id'
The output includes credentials that you must protect. Be sure that you do not include these credentials in your code or check the credentials into your source control. For more information, see https://aka.ms/azadsp-cli
{
  "appId": "xxxxxx-xxx-xxxx-xxxx-xxxxxxxxxx",
  "displayName": "azure-cli-2022-xxxx",
  "password": "xxxxxx~xxxxxx~xxxxx",
  "tenant": "xxxxx-xxxx-xxxxx-xxxx-xxxxx"
}
```

Create env vars containing the Azure credentials

```sh
export ARM_CLIENT_ID="<APPID_VALUE>"
export ARM_CLIENT_SECRET="<PASSWORD_VALUE>"
export ARM_SUBSCRIPTION_ID="<SUBSCRIPTION_ID>"
export ARM_TENANT_ID="<TENANT_VALUE>"
```

## Azure AD config

Your service principal also needs permissions to create applications and service principals.
Specifically, you need to grant it the `Application.ReadWrite.All` permission in your tenant.
You can follow the following steps: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/guides/service_principal_configuration

I didn't get Terraform to automate the Azure AD config (probably something to do with authentication or managed identities, or something). So I
configured the auth tenant manually on the entra portal (https://entra.microsoft.com). The critical think is to ensure
to use Entra External ID for customers also called CIAM, here are the docs: https://learn.microsoft.com/en-us/azure/active-directory/external-identities/customers/

I used the Quickstart guide from the portal for the initial setup, which setup a trial tenant (I can't change the tenant name):
- Tenant name: `TrialTenantlDF1TAkb` (unfortunately I can't change the name)
- Tenant ID: `b01dbca9-6567-4d7e-9bca-7abf151864a8`

I configured an email+password sign-in flow and also added `Display Name` as an extra field collected during sign up. This field's label
should be changed to `Name` in the user flow's page layout customization options.

I configured Google Sign-In federation using this guide: 
https://learn.microsoft.com/en-us/azure/active-directory/external-identities/customers/how-to-google-federation-customers

For the preview, I created a project in Google console called `quickbyte-preview`. It's currently still in test-mode
and only allows sign-ins from Google email addresses I've manually whitelisted in the settings. For the official release
I'll create a different project that I'll move to production mode (and it may need to be reviewed).

