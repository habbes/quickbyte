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

## Setup AWS

Create an AWS account or login into one at: https://aws.amazon.com

**Enable South Africa region (af-south-1) in the AWS account**. This region is disabled by default.

I'd like to use best practices for account management in AWS (e.g. creating accounts or roles or groups that only have the access to the resources created). But for now I just created IAM users with and user groups with restrictions to only access S3 resources based on tag.

I create one set of policies and users for development/test and then create a similar set of configurations for production. I use a `Product` tag to isolate dev from prod. `Product = quickbytest` for dev and `Product = quickbyte` for prod. Using separate, unrelated AWS accounts would probably be a better strategy.

In each "environment", I create 2 sets of policies and user configurations:
- one set is used to provision resources (e.g. create the S3 buckets used to store data). This will be used by tools like terraform.
- another set is only used to store and access objects in the buckets. This will be used by the Quickbyte app.

Let's start with creating the "provisoning" user:

- In the AWS Console, click the User dropdown menu and select **Security Credentials**
- This opens the Identity and Access Management (IAM) console
- Create policy:
  - On the sidebar menu, click **Policies** (we want to create a policy that restricts the permissions our user will have)
  - Create a policy that allows access to all S3 resources but only for the appropriate tag (e.g. `Product` =  `quickbytest`). See the JSON below showing what the policy config looks like:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "*"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "s3:CreateJob"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "aws:ResourceTag/Product": "quickbytetest"
                }
            }
        }
    ]
}
```
  - In the dev scenario, I called this policy `QuickbyteTestProvisioning`
- Next, create a group
  - In the IAM portal, click **User groups**
  - Create a group (I called the dev one `QuickbyteTestProvisioningGroup`)
  - In the group's page, click **Permissions**
  - Click **Add Permissions** -> **Attach policies**
  - Search of the name of the policy created and attach it
- Next, create a user:
  - In the IAM portal, click **Users**
  - Create User (I called the dev one `QuickbyteTestProvisioningUser`)
  - Assign to the group created in the previous step (`quickbytetest_group`)

Once the user is created, navigate to the user, then **Security Credentials** then create an access key. This access key can be used by terraform to provision resources using the following env vars:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

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
variable "resource_prefix" {
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

variable "s3_ping_blob_key" {
  type    = string
  default = "ping/ping.txt"
}

variable "s3_ping_blob_content" {
  type    = string
  default = "ping"
}
```

You can override them when runnging the apply command, for example:

```
terraform apply -var="az_resource_prefix=quickbyte"
```

Ideally, **You should also define the variables that with different values for dev and prod in the terraform cloud as well**. This makes it easier to have different values defined in dev and prod without having to manually edit the file. Specficially, you should set the **resource_prefix** variable accordingly because it determines the names and tags of your resources.

Then run:
```
terraform apply -var...
```

To get the outputs of the run:
```
terraform output
```

# Azure AD config

### Important: I moved away from Azure AD in favour of custom auth. The information here is therefore mostly deprecated. I keep it here for backwards compatibility in case there are things I forgot to move from Azure AD and want to refer back to

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

I added the `login_hint` optional claim to the ID token configuration. I used to this feature to be able to logout the user without
having the app ask the user to select the account they want to logout from. To add the `login_hint` option claim,
open the App registration in the Entra portal, then **Manage** -> **Token Configuration** -> **Optional Claims** -> **Add optional claim** then select `login_hint`. See:
- https://learn.microsoft.com/en-gb/entra/identity-platform/optional-claims#v10-and-v20-optional-claims-set
- https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference
- https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/logout.md


I configured Google Sign-In federation using this guide: 
https://learn.microsoft.com/en-us/azure/active-directory/external-identities/customers/how-to-google-federation-customers

For the preview, I created a project in Google console called `quickbyte-preview`. It's currently still in test-mode
and only allows sign-ins from Google email addresses I've manually whitelisted in the settings. For the official release
I'll create a different project that I'll move to production mode (and it may need to be reviewed).

## Google Auth

I used the [these docs](https://developers.google.com/identity/gsi/web/guides/overview) to setup "Sign in with Google".

The client ID used on staging (and sometimes local testing) is:  `898543344414-500i7unojepnlaecqmn84cd8k11k7h6g.apps.googleusercontent.com` and is called `quickbyte-preview` in the Google Developer Console.

I use a different client in production, called `quickbyte-production`.



# Server and DB

The server runs on [Railway](https://railway.app). In prod the DB runs in MongoDB Atlas. But in other environments, the DB runs on Railway as well.

For development, I run a local copy of [Mongodb Community Edition](https://www.mongodb.com/docs/manual/installation/).

Since the app uses transactions, we have to run MongoDB in a replica set configuration as opposed to a standalone server. To configure your local development MongoDB Community to run
in a replica set, follow this guide: https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/

In my case, I added the following configuration to my local `/opt/homebrew/etc/mongod.conf` file:
```
replication:
   replSetName: rs0
```

# Client

The web app runs on [Vercel](https://vercel.com).

# Monorepo

The project is setup as a monorepo using [`npm workspaces`](https://docs.npmjs.com/cli/v10/using-npm/workspaces). The workspace configuration is contained in the root [`package.json`](../package.json) file. We have the following packages:

- `common`: typescript package that contains share types and utilities, used by both the server and web client code.
- `server`: the server code
- `webapp`: the web client code

The server and client `tsconfig.json` configurations use the `@quickbyte/common` alias to import code from the shared package. i.e:

```ts
import { ... } from '@quickbyte/common';
```


# Sentry Config

We use Sentry for logging and tracing.

Sentry for Vue.js: https://docs.sentry.io/platforms/javascript/guides/vue/
