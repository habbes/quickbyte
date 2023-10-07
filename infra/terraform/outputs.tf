
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

# output "server_sp_client_id" {
#   value = azuread_service_principal.server_app.object_id
# }

# output "server_sp_client_secret" {
#   value     = azuread_service_principal_password.server_app.value
#   sensitive = true
# }

output "tenant_id" {
  value = data.azuread_client_config.current.tenant_id
}