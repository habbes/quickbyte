using Quickbyte;
using System;
using System.Diagnostics;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text.Json;
using Microsoft.Identity.Client;
// See https://aka.ms/new-console-template for more information

var filePath = args[0];
string? recoveredBlocksPath = args.Length > 2 ? args[2] : null;



//await S3Upload(filePath, targetFile);
 await AzureUpload(filePath, recoveredBlocksPath);

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

static void Log(LogLevel level, string message, bool containsPii)
{
    string logs = $"{level} {message}{Environment.NewLine}";
    Console.WriteLine(logs);
}

async Task AzureUpload(string filePath, string? recoveredBlocksPath = null)
{
    var clientId = "f7f3ded2-7a89-48bc-baf8-ae0132794c23";
    var tenantId = "b01dbca9-6567-4d7e-9bca-7abf151864a8";
    var tenantName = "TrialTenantlDF1TAkb";
    var tenant = $"{tenantName}.onmicrosoft.com";
    
    var policy = "b2c_1_susi";
    var redirectUri = $"https://{tenantName}.b2clogin.com/oauth2/nativeclient";
    //var authority = $"https://TrialTenantlDF1TAkb.b2clogin.com/tfp/{tenantId}/{userFlowPolicy}";
    // var authority = $"https://login.microsoftonline.com/tfp/{tenantId}/${userFlowPolicy}";
    var authority = $"https://{tenantName}.b2clogin.com/tfp/{tenant}/{policy}";
    //var authority = $"https://login.microsoftonline.com/tfp/{tenantId}/{policy}";
    var scopes = new[] { "api://c84523c3-c74d-4174-a87d-cce9d81bd0a3/.default", "openid", "offline_access" };
    IPublicClientApplication app = PublicClientApplicationBuilder.Create(clientId)
        .WithDefaultRedirectUri()
        // .WithRedirectUri(redirectUri)
        .WithB2CAuthority(authority)
        .WithLogging(Log, LogLevel.Verbose)
        // .WithTenantId(tenantId)
        .Build();

    var accounts = await app.GetAccountsAsync();

    AuthenticationResult tokenResult; 
    try
    {
        tokenResult = await app.AcquireTokenSilent(scopes, accounts.FirstOrDefault())
            .ExecuteAsync();
    }
    catch
    {
        try 
        {
        // Getting the following error
        // The resource you are looking for has been removed, had its name changed, or is temporarily unavailable.
            tokenResult = await app.AcquireTokenInteractive(scopes).ExecuteAsync();

        // tokenResult = await app.AcquireTokenWithDeviceCode(scopes, result =>
        // {
        //     Console.WriteLine(result.Message);
        //     return Task.CompletedTask;
        // }).ExecuteAsync();
        }
        catch (Exception e)
        {
            throw new Exception($"Authentication error: {e.Message}");
        }
    }

    Console.WriteLine("token {0}", tokenResult.AccessToken);

    
    ApiClient apiClient = new ApiClient(tokenResult.AccessToken);
    var user = await apiClient.GetMe();

    Console.WriteLine("Initializing file");
    var initResult = await apiClient.InitFile(user.Account.Id, new FileInitRequest
    (
        OriginalName: new FileInfo(filePath).Name,
        Provider: "az",
        Region: "sa-north"
    ));
    
    var uploader = new AzureMultipartUploader(initResult.SecureUploadUrl);
    var destination = initResult.Path;

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
    var uri = await uploader.UploadFile(filePath, recoveredBlocks!, block =>
    {
        completedBlocks.Add(block);
        signal.Set();
    });
    stopwatch.Stop();
    
    shouldTerminate.ShouldTerminate = true;
    signal.Set();
    await saveTask;
    File.Delete(progessFilePath);
    var download = await apiClient.RequestDownload(user.Account.Id, initResult.Id);

    Console.WriteLine();
    Console.WriteLine($"Azure Storage: Took {stopwatch.ElapsedMilliseconds}ms");
    Console.WriteLine("Upload complete! Open the following URL in your browser to download the file.");
    Console.WriteLine(download.DownloadUrl);
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