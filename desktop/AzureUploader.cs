using System;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage;

namespace Quickbyte;

public class AzureUploader
{
	BlobServiceClient client;

	public AzureUploader(string connectionString)
	{
		client = new BlobServiceClient(connectionString);
	}

	public async Task UploadFile(string filePath, string containerName, string keyName)
	{
		BlobContainerClient container = client.GetBlobContainerClient(containerName);
		BlobClient blobClient = container.GetBlobClient(keyName);

		var result = await blobClient.UploadAsync(filePath, new BlobUploadOptions
		{
			TransferOptions = new StorageTransferOptions
			{
				MaximumConcurrency = 8,
				MaximumTransferSize = 16 * 1024 * 1024,
				InitialTransferSize = 16 * 1024 * 1024
			}
		});
	}
}

