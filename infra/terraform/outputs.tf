
output "resource_group_id" {
  description = "Resource Group ID"
  value       = azurerm_resource_group.resource_group.id
}

output "key_vault_name" {
  value = azurerm_key_vault.key_vault.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.key_vault.vault_uri
}

output "storage_accounts_names" {
  value = {
    for key, storage in azurerm_storage_account.storage_accounts :
    key => {
      name                     = storage.name
      region                   = storage.location
      connection_string_secret = azurerm_key_vault_secret.secrets[key].name
      ping_blob_url            = azurerm_storage_blob.ping_blob[key].url
    }
  }
}

output "s3_bucket_useast1" {
  value = {
    id = aws_s3_bucket.useast1_data_bucket.id
    region = aws_s3_bucket.useast1_data_bucket.region
    ping_blob_key = aws_s3_object.useast1_ping_object.key
  }
}