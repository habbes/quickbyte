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

## Terraform environment

I'm using Terraform Cloud to store configuration and resource state.

I different workspaces for testing and for prod, corresponding to different Azure tenants and subscriptions.

**Test configuration**:

- Terraform organization: `habbes`
- Terraform workspace: `learn-terraform`
- Azure Tenant: `936c057b-93ca-45bb-91c7-32ac0363257f` (my default directory on Azure)
- Azure Subscription: `e8a5d058-e1b5-48f4-b1ff-b3bc830fb899` (Visual Studio Subscription)

**Production configuration**:

- Terraform organization: `AlphaManuscript`
- Terraform workspace: `quickbyte-prod`
- Azure Tenant: `5fc9fee9-94d9-4f94-92e4-ab7c9da80396` (Alpha Manuscript)
- Azure Subscription: `53c33bf5-3faf-4d6a-8adb-e5c91c80bb8e` (Quickbyte subscription)

On each workspace in Terraform cloud, we set the corresponding environment variables:

- `ARM_CLIENT_ID` (service principal client ID)
- `ARM_CLIENT_SECRET` (service principal password/client secret)
- `ARM_TENANT_ID` (Azure tenant ID)
- `ARM_SUBSCRIPTION_ID` (Azure subscription ID)

We configure the environment we want to use to provision the resource by adding
the following config in [./main.tf](`main.tf`):

```
terraform {
  cloud {
    organization = "AlphaManuscript"

    workspaces {
      name = "quickbyte-prod"
    }
  }
}
```

using the corresponding organization and workspace names.

## Provisioning infrastructure

Currently I run the provisioning from the CLI. Might consider automating it via GitHub integration
some day:

Ensure you've logged in:
```
terraform login
```

Then initalize the workspace:
```
terraform init
```

To see changes that will be perform on the infrastructure:
```
terraform plan
```

The following variables have been defined:

```
variable "az_resource_prefix" {
  type    = string
  default = "quickbytetest"
}

variable "az_data_container_name" {
  type    = string
  default = "data"
}

variable "az_ping_container_name" {
  type    = string
  default = "ping"
}

variable "az_ping_blob_name" {
  type    = string
  default = "ping.txt"
}

variable "az_ping_blob_content" {
  type    = string
  default = "ping"
}
```

You can override them when runnging the apply command, for example:

```
terraform apply -var="az_resource_prefix=quickbyte"
```

Then run:
```
terraform apply -var...
```

To get the outputs of the run:
```
terraform output
```

# Azure AD config

Your service principal also needs permissions to create applications and service principals.
Specifically, you need to grant it the `Application.ReadWrite.All` permission in your tenant.
You can follow the following steps: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/guides/service_principal_configuration

I didn't get Terraform to automate the Azure AD config (probably something to do with authentication or managed identities, or something). So I
configured the auth tenant manually on the entra portal (https://entra.microsoft.com). The critical think is to ensure
to use Entra External ID for customers also called CIAM, here are the docs: https://learn.microsoft.com/en-us/azure/active-directory/external-identities/customers/

Note that you need to be logged into a Workfoce directory (Azure AD) in Entra Portal to be able to create a Customer/CIAM tenant. Think of it this way, the workfoce tenant represents your organization, that's where you can add in-house apps and employee accounts. You may also want to create apps that external customers can login to, for this you would need a need a CIAM tenant that's part of your organization.

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

# Server and DB

The server runs on [Railway](https://railway.app). In prod the DB runs in MongoDB Atlas. But in other environments, the DB runs on Railway as well.

# Client

The web app runs on [Vercel](https://vercel.com).


# Sentry Config

We use Sentry for logging and tracing.

Sentry for Vue.js: https://docs.sentry.io/platforms/javascript/guides/vue/