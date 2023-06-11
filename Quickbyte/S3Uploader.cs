using Amazon;
using Amazon.S3;
using Amazon.S3.Transfer;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Quickbyte;
class S3Uploader
{
    private IAmazonS3 s3Client;


    public S3Uploader(string accessKey, string secretKey, RegionEndpoint region)
    {
        s3Client = new AmazonS3Client(accessKey, secretKey, new AmazonS3Config { RegionEndpoint = region, UseAccelerateEndpoint= true });
    }

    public async Task UploadFile(string filePath, string bucketName, string keyName)
    {
        try
        {
            var fileTransferUtility =
                new TransferUtility(s3Client);

            // Option 4. Specify advanced settings.
            var fileTransferUtilityRequest = new TransferUtilityUploadRequest
            {
                BucketName = bucketName,
                FilePath = filePath,
                StorageClass = S3StorageClass.StandardInfrequentAccess,
                PartSize = 16 * 1024 * 1024, // 6291456, // 6 MB.
                Key = keyName,
                
                // CannedACL = S3CannedACL.PublicRead
            };


            await fileTransferUtility.UploadAsync(fileTransferUtilityRequest);
            Console.WriteLine("Upload 4 completed");
        }
        catch (AmazonS3Exception e)
        {
            Console.WriteLine("Error encountered on server. Message:'{0}' when writing an object", e.Message);
        }
        catch (Exception e)
        {
            Console.WriteLine("Unknown encountered on server. Message:'{0}' when writing an object", e.Message);
        }

    }
}

