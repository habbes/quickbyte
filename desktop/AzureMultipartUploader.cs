using System;
using System.Collections.Concurrent;
using System.Text;
using System.Web;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;

namespace Quickbyte;

public class AzureMultipartUploader
{
	//BlobServiceClient client;
	const int BlockSizeMbs = 16;
	Uri uploadUrl;
	BlockBlobClient blob;

	public AzureMultipartUploader(string secureUploadUrl)
	{
		var uri = new Uri(secureUploadUrl);
		this.uploadUrl = uri;
		//var uriBuilder = new UriBuilder();
		//uriBuilder.Path = uri.AbsolutePath;
		//uriBuilder.Host = uri.Host;
		//uriBuilder.Scheme = uri.Scheme;
		//uriBuilder.Port = uri.Port;
		//var blobUri = uriBuilder.Uri;
		//var query = HttpUtility.ParseQueryString(uri.Query);
		//this.client = new BlobServiceClient(blobUri, new Azure.AzureSasCredential(query.Get("sig")));
		//this.uploadUrl = secureUploadUrl;
		this.blob = new BlockBlobClient(uri);
	}

	public async Task<Uri> UploadFile(string filePath, Dictionary<int, Block> recoveredBlocks, Action<Block> onBlockComplete)
	{
		FileInfo file = new FileInfo(filePath);
		int concurrency = 8;
        //var container = client.GetBlobContainerClient(containerName);
		//var blob = container.GetBlockBlobClient(blobName);
		long fileSize = file.Length;
		int blockSize = BlockSizeMbs * 1024 * 1024;
		int numBlocks = (int)Math.Ceiling((double)fileSize/blockSize);
		string[] blockIds = new string[numBlocks];
		
		SemaphoreSlim semaphore = new SemaphoreSlim(concurrency);
		using FileStream fileStream = File.OpenRead(file.FullName);
		Task[] tasks = new Task[numBlocks];
		var queue = new BlockingCollection<(int i, byte[] buffer)>(concurrency);
		
		for (int i = 0; i < numBlocks; i++)
		{
			await semaphore.WaitAsync();
			byte[] buffer = new byte[blockSize];
			// read the buffer outside the stack to guarantee
			// correct order of blocks
			int bufferSize = await fileStream.ReadAsync(buffer);
			int index = i;
			tasks[i] = Task.Run(async () =>
			{
				if (recoveredBlocks.TryGetValue(index, out Block recoveredBlock))
				{
					Console.WriteLine($"Skipping block {index}");
					blockIds[index] = recoveredBlock.Id;
					onBlockComplete(recoveredBlock);
					return;
				}

				try
				{
					using var bufferStream = new MemoryStream(buffer, 0, bufferSize);
					string blockId = Convert.ToBase64String(
						Encoding.UTF8.GetBytes(Guid.NewGuid().ToString()));
					await blob.StageBlockAsync(blockId, bufferStream);
					blockIds[index] = blockId;
					onBlockComplete(new Block(index, blockId));
				}
				finally
				{
                    semaphore.Release();
                }
            });
		}
		
		await Task.WhenAll(tasks);
		var result = await blob.CommitBlockListAsync(blockIds);
		//var uri = blob.GenerateSasUri(Azure.Storage.Sas.BlobSasPermissions.Read, new DateTimeOffset(2023, 6, 24, 0, 0, 0, default));
		//return uri;
		return this.uploadUrl;
	}

	
}

