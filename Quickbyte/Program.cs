using Quickbyte;
using System;
using System.Diagnostics;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text.Json;
// See https://aka.ms/new-console-template for more information

var filePath = args[0];
var targetFile = args[1];
string? recoveredBlocksPath = args.Length > 2 ? args[2] : null;



//await S3Upload(filePath, targetFile);
 await AzureUpload(filePath, targetFile, recoveredBlocksPath);

async Task S3Upload(string filePath, string targetFile)
{
    string accessKey = "";
    string secretKey = "";
    // string bucket = "";
    // var region = Amazon.RegionEndpoint.EUWest2;
    string bucket = ""; //SA
    var region = Amazon.RegionEndpoint.AFSouth1;
    var uploader = new S3Uploader(accessKey, secretKey, region);
    var destination = $"test/{targetFile}";

    Console.WriteLine($"AWS S3: Uploading file {filePath} to {destination}");

    var stopwatch = Stopwatch.StartNew();
    await uploader.UploadFile(filePath, bucket, destination);
    stopwatch.Stop();

    Console.WriteLine($"AWS S3:Took {stopwatch.ElapsedMilliseconds}ms");
}

async Task AzureUpload(string filePath, string targetFile, string? recoveredBlocksPath = null)
{
    //string connectionString = "DefaultEndpointsProtocol=https;AccountName=habbesuploadertestseu;AccountKey=DMSCHQ7TIb8R+JnszJmi5kOy4wbu7YTuGoHw1JbpOgHqd6HZBC8/aKaeq+LB5YbqFZSj0T/11U9b+AStkc83Aw==;EndpointSuffix=core.windows.net";
    // TODO store credentials in secure on-client location
    string connectionString = "";
    string container = "";
    
    var uploader = new AzureMultipartUploader(connectionString);
    var destination = $"test/{targetFile}";

    Console.WriteLine($"Azure Storage: Uploading file {filePath} to {destination}");
    
    var stopwatch = Stopwatch.StartNew();
    ConcurrentBag<Block> completedBlocks = new();
    AutoResetEvent signal = new AutoResetEvent(false);

    TerminateSignal shouldTerminate = new TerminateSignal { ShouldTerminate = false };
    FileInfo fileInfo = new FileInfo(filePath);
    string progessFilePath = $"{fileInfo.Name}.progress.json";
    int numBlocks = (int)Math.Ceiling((double)fileInfo.Length / (16 * 1024 * 1024));
    Dictionary<int, Block> recoveredBlocks = new Dictionary<int, Block>();
    if (!string.IsNullOrEmpty(recoveredBlocksPath))
    {
        using var recoveredBlocksFile = File.Open(recoveredBlocksPath, FileMode.Open);
        recoveredBlocks =  await JsonSerializer.DeserializeAsync<Dictionary<int, Block>>(recoveredBlocksFile);
    }
    
    var saveTask = Task.Run(() => SaveProgress(completedBlocks, numBlocks, progessFilePath, signal, shouldTerminate));
    var uri = await uploader.UploadFile(filePath, container, destination, recoveredBlocks!, block =>
    {
        completedBlocks.Add(block);
        signal.Set();
    });
    stopwatch.Stop();
    shouldTerminate.ShouldTerminate = true;
    signal.Set();
    await saveTask;
    File.Delete(progessFilePath);

    Console.WriteLine();
    Console.WriteLine($"Azure Storage: Took {stopwatch.ElapsedMilliseconds}ms");
    Console.WriteLine("Upload complete! Open the following URL in your browser to download the file.");
    Console.WriteLine(uri);
}

async Task SaveProgress(ConcurrentBag<Block> completedBlocks, int totalBlockCount, string dataPath, AutoResetEvent signal, TerminateSignal shouldTerminate)
{
    while (!shouldTerminate.ShouldTerminate)
    {
        signal.WaitOne();
        if (completedBlocks.Count > 0)
        {
            Dictionary<int, Block> dict = new();
            foreach (var block in completedBlocks)
            {
                dict.Add(block.Index, block);
            }

            await using (var stream = File.Open(dataPath, FileMode.Create))
            {
                await JsonSerializer.SerializeAsync(stream, dict);
            }
        }
        Console.CursorLeft = 0;
        double progress = 100 * (double)completedBlocks.Count/totalBlockCount;
        Console.Write("Progress: {0:00.00}%", progress);
    }
    
}

class TerminateSignal
{
    public volatile bool ShouldTerminate;
}