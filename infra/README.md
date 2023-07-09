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

