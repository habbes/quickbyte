terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0.2"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.15.0"
    }
  }

  required_version = ">= 1.1.0"

  cloud {
    organization = "habbes"
    workspaces {
      name = "learn-terraform"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

provider "azuread" {
  tenant_id = data.azurerm_client_config.current.tenant_id
}

# this data source will be used to get current tenant and app id
data "azurerm_client_config" "current" {}
data "azuread_client_config" "current" {}

# this service principal will be used by our server
# to access the resources created here
# we'll grant it access to relevant resources
# and output its client id and secret
resource "azuread_application" "server_app" {
  display_name = "${var.az_resource_prefix}-server-app"
}

resource "azuread_service_principal" "server_app" {
  application_id = azuread_application.server_app.application_id
}

resource "azuread_service_principal_password" "server_app" {
  service_principal_id = azuread_service_principal.server_app.object_id
}

# Resource Group

resource "azurerm_resource_group" "resource_group" {
  name     = "${var.az_resource_prefix}rg"
  location = "eastus2"
}

# Create a storage account for each region
resource "azurerm_storage_account" "storage_accounts" {
  for_each = var.az_regions

  resource_group_name = azurerm_resource_group.resource_group.name
  name                = "${var.az_resource_prefix}${each.key}"
  location            = each.value.name

  account_tier              = "Standard"
  account_replication_type  = "LRS"
  enable_https_traffic_only = true
  shared_access_key_enabled = true

  blob_properties {
    cors_rule {
      allowed_methods    = ["GET", "PUT", "HEAD", "OPTIONS"]
      allowed_headers    = ["*"]
      allowed_origins    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 0
    }
  }
}

# Create a container for each storage account. These
# are the containers that will store user-uploaded files
resource "azurerm_storage_container" "containers" {
  #   count = length(azurerm_storage_account.storage_accounts)
  for_each = var.az_regions

  name                  = var.az_data_container_name
  storage_account_name  = azurerm_storage_account.storage_accounts[each.key].name
  container_access_type = "private"
}

# Create a ping container for each storage account. These
# containers will be used by client to ping the region
# in order to measure and compare latencies from different regions.
# This will also be used to detect availability of a region
resource "azurerm_storage_container" "ping_containers" {
  # count = length(azurerm_storage_account.storage_accounts)
  for_each = var.az_regions

  name                  = var.az_ping_container_name
  storage_account_name  = azurerm_storage_account.storage_accounts[each.key].name
  container_access_type = "private"
}

# we'll store a simple file in the ping containers that will
# be fetched when pinging
resource "azurerm_storage_blob" "ping_blob" {
  # count = length(azurerm_storage_account.storage_accounts)
  for_each = var.az_regions

  storage_account_name   = azurerm_storage_account.storage_accounts[each.key].name
  storage_container_name = azurerm_storage_container.ping_containers[each.key].name
  type                   = "Block"
  name                   = var.az_ping_blob_name
  source_content         = var.az_ping_blob_content
}

# Create a key vault to store the credentials
# for the storage accounts

resource "azurerm_key_vault" "key_vault" {
  name                = "${var.az_resource_prefix}kv"
  location            = azurerm_resource_group.resource_group.location
  resource_group_name = azurerm_resource_group.resource_group.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  # access policy granted to the terraform client
  # to manage the secrets
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get",
      "Create",
      "Update"
    ]

    secret_permissions = [
      "Get",
      "Set"
    ]

    storage_permissions = [
      "Get",
      "Set"
    ]
  }

  # access policy granted to our server
  # the server only needs to read the secrets
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azuread_service_principal.server_app.object_id

    key_permissions = [
      "Get"
    ]

    secret_permissions = [
      "Get"
    ]
  }
}

resource "azurerm_key_vault_secret" "secrets" {
  #   count = length(azurerm_storage_account.storage_accounts)
  for_each = var.az_regions

  name         = "${azurerm_storage_account.storage_accounts[each.key].name}-connection-string"
  value        = azurerm_storage_account.storage_accounts[each.key].primary_connection_string
  key_vault_id = azurerm_key_vault.key_vault.id
}
