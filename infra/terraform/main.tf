terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0.2"
    }

    aws = {
      source = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.1.0"

  # Enable to provision testing infra
  cloud {
    organization = "habbes"
    workspaces {
      name = "learn-terraform"
    }
  }

  # Enable to deploy to prod
  # cloud {
  #   organization = "AlphaManuscript"
  #   workspaces {
  #     name = "quickbyte-prod"
  #   }
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

// Ideally a collection variable should be used here like with Azure,
// Unfortunately the AWS Provider requires us to set the region
// on the provider instead of the resources, and we can't set
// the provider alias dynamically.
// This is a known issue discussed in the following threads:
// - https://github.com/hashicorp/terraform-provider-aws/issues/8853
// - https://github.com/hashicorp/terraform-provider-aws/issues/27758
// - https://github.com/hashicorp/terraform-provider-aws/pull/31517

# provider "aws" {
#   region = "af-south-1"
#   alias = "afsouth1"
# }

provider "aws" {
  region = "us-east-1"
  alias = "useast1"
}

# provider "aws" {
#   region = "eu-north-1"
#   alias = "eunorth1"
# }

# provider "aws" {
#   region = "ap-south-1"
#   alias = "apsouth1"
# }


// AZURE BLOB STORAGE RESOURCES


# this data source will be used to get current tenant and app id
data "azurerm_client_config" "current" {}


# Resource Group

resource "azurerm_resource_group" "resource_group" {
  name     = "${var.resource_prefix}rg"
  location = "eastus2"
}

# Create a storage account for each region
resource "azurerm_storage_account" "storage_accounts" {
  for_each = var.az_regions

  resource_group_name = azurerm_resource_group.resource_group.name
  name                = "${var.resource_prefix}${each.key}"
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
  name                = "${var.resource_prefix}kv"
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
}

resource "azurerm_key_vault_secret" "secrets" {
  #   count = length(azurerm_storage_account.storage_accounts)
  for_each = var.az_regions

  name         = "${azurerm_storage_account.storage_accounts[each.key].name}-connection-string"
  value        = azurerm_storage_account.storage_accounts[each.key].primary_connection_string
  key_vault_id = azurerm_key_vault.key_vault.id
}


// AWS S3 RESOURCES

resource "aws_s3_bucket" "useast1_data_bucket" {
  provider = aws.useast1

  bucket = "${var.resource_prefix}useast1"

  tags = {
    Product = "${var.resource_prefix}"
  }
}

resource "aws_s3_bucket_cors_configuration" "useast1_data_bucket_cors_config" {
  bucket = aws_s3_bucket.useast1_data_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag", "Etag", "Content-Length"]
    max_age_seconds = 3000
  }
}

// Ping file

resource "aws_s3_object" "useast1_ping_object" {
  bucket = aws_s3_bucket.useast1_data_bucket.id
  key    = "${var.s3_ping_blob_key}"
  content = "${var.s3_ping_blob_content}"
}

// TODO add bucket configs for other regions