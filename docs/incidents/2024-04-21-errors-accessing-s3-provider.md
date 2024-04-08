# 2024-04-21 Incident report: Failure to access files to disabled S3 provider

On Thursday March 14th 2024 (a week ago from the time of this writing), an incident occurred in Quickbyte's production deployment where some customers could not access some files that they had uploaded to their projects, they would get an error when trying to access the files. The error occurred because the files had been uploaded using the S3 provider, but the S3 provider had been unregistered when the user was trying to access them.

This document provides a detailed report of the incident, including the root cause, how it was detected, how it was mitigated, customer impact and what needs to be done as a result. I will also send a (less detailed) report to customers.

## Detection

On Thursday March 14th at 9:56AM EAT, I received an email from `info@quickbyte.io` notifying me server errors. This email was triggered by the Admin alerts background job that sends the configured admin email alerts when server error (status code 500) have occurred within the last 5 minutes. Here's the content of the email:

Subject: **Quickbyte - Quickbyte Admin Alert: Server errors occurred in the last 5 minutes.**

Content:

> **Code: appError**
> Unknown storage provider 's3'
>
>
> ```Error: Unknown storage provider 's3'
>    at createAppError (file:///app/server/dist/core/error.js:31:12)
>    at StorageHandlerProvider.getHandler (file:///app/server/dist/core/services/storage/storage-provider-registry.js:12:19)
>    at file:///app/server/dist/core/services/transfer-service.js:255:63
>    at Array.map ()
>    at TransferService.getMediaFiles (file:///app/server/dist/core/services/transfer-service.js:254:50)
>    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
>    at async Promise.all (index 0)
>    at async MediaService.getMediaById (file:///app/server/dist/core/services/media-service.js:49:39)
>    at async ProjectService.getMediumById (file:///app/server/dist/core/services/project-service.js:108:27)```


When I saw the error message and stack trace, it was clear that someone was trying to access a file had `s3` as the storage handler, but the `s3` was not registered was not regisered in the `StorageHandlerProvider`.

I also looked at server logs and confirmed that requests to the `/api/projects/{projectId}/media/{mediaId}` endpoint were failing with 500-level status codes.

I ran queries in the DB to find which files had `provider` set to `s3` and which projects and accounts they belonged to. I found two files that served as different versions of the same media item had the `provider` set to `s3`. I then looked up the project the media item belong to, found the account then the account owner.

At 10:00AM I sent the affected account owner an email notifying them that we had detected an issue and were working to solve it:

Subject: **Detected file access failures in your project**

Content:

> Hello xxx,
>
> Our systems have detected some failures occuring in your accounts accessing files within the last 5 minutes. We apologize for this inconvenience and are promptly working to resolve these issues. We’ll update you when the issue has been resolved.
>
>
> Regards,
> Clément

## Mitigation

I created a patch to fix the issue by simply registering the `s3` storage handler again. S3 storage handler was in the codebase, but not registered in the storage handler.
- Here's the PR that patched the issue: https://github.com/habbes/quickbyte/pull/271
- Here's the PR that deployed the fix to production: https://github.com/habbes/quickbyte/pull/272

The patch PR was merged at 10:15AM.

Deployment to production was completed at 10:19AM.

Time from detection to mitigation: 23min (from 9:56AM to 10:19AM).

Since the alert email could have been sent up to 5 minutes after the issue occured, the total time to mitigation is around 28min.

After deploying the fix I monitored the server logs for about 5 minutes to see whether any more errors would occur. I didn't see any errors and didn't get any more alert emails (I had received a total 6 alert emails reporting the same error between 9:56AM and 10:21AM).

At 10:24AM I sent an email to the owner of the affected account announcing that the issue was resolved.


Email Subject: **File access issue resolved**

Content:

>Hello,
>
>Our systems had detected failures occurring in one of your project when accessing certain files. We are happy to inform you that we have resolved this issue and you >should now be able to access those files. Do not hesitate to reach out to us if you continue to face issues. We will share with you a more detailed report about what >cause the incident once we have finished investigating the issue. We apologize for any inconvenience caused throughout this ordeal. Thank you for your patience.
>
>Regards,
>
>Clément
>
>Quickbyte Team


At 10:37AM I sent the same email to the 2 other collaborators on the affected project. I had not considered sending them an email earlier on, but I realized it would be better to notify them since I didn't know which user actually faced the issue. But I had informed them of the failure detection when I sent the first email. This is something that needs to be improvement for future incident announcements since I was manually sending the emails from my mail client.

## Root cause

Due to the suboptimal [download speeds](https://github.com/habbes/quickbyte/issues/239) I've observed from Quickbyte I wanted to add support for Amazon S3 as an alternative to the Azure storage provider in hopes of improving direct download speeds. I created a couple of PRs to advance this work:

- https://github.com/habbes/quickbyte/pull/247
- https://github.com/habbes/quickbyte/pull/256

I implemented most of the code to support Amazon S3, including multi-part uploads and downloads, upload recovery etc. The only thing that was missing was to automate the infrastructure provisioning using Terraform in the same way I do it for Azure. However, S3 terraform provider doesn't provide a convenient dynamic way for provisioning buckets in multiple regions. So paused this work and said I'd do it later. But up to this point I had tested the feature against some test bucket which I had "temporarily" hardcoded in the code.

Since I had mingled some other features in the S3 integration PRs, and since the S3 PRs were taking longer than I thought, I decided to merge the PRs so that I can get the other features shipped. But I would "disable" S3 from being selected by the client.

Unfortunately, it seems like in one of those merged PRs, I exposed the S3 feature in production as the preferred provider by the client and one account used it to upload files. But I was not aware that the feature was exposed.

When I merged the [second S3 PR](https://github.com/habbes/quickbyte/pull/256), I "disabled" S3 support by skipping its registration in the `StorageProviderRegistry`. And this PR was pushed to prod. This means that that the system no longer knew how to resolve the `s3` provider, even though there were files in the database that stored with the `s3` provider from a previous PR. **The system was no in an invalid state**.

Now, the next time the files that were uploaded with the `s3` provider were requested by the user, the server could not find the `s3` provider in the registry and throw an error. This error triggered the email

## Next steps

The patch I created re-enabled s3, but the s3 bucket being used was meant for testing and it's a risk to keep the files there. The files should be transferred to an storage account or bucket meant for production, whether on s3, azure or some other provider we support:

- https://github.com/habbes/quickbyte/issues/320


While I had sent updates to affected customers, I also want to send an incident report both to internal customers (via email) as well as the general public (social media post). I think this would promote trust and transparency with customers and also show that we do take incidents seriously (given that it was detected and mitigated before customers raised the alarm).

