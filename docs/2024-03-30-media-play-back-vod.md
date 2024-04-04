# 2024-03-30 Enhanced media playback and video-on-demand experience

The integrated media player is key part of Quickbyte's offering, being able to watch, review and add feedback from Quickbyte without downloading the file is crucial. However, the experience at the time of this writing is sometimes atrocious. To play videos, we wrap the HTML `video` (or `audio`) element directly and pass a presigned download url of the video (or audio) file. This naive approach works well enough for limited scenarios, like really small files, short clips (e.g. a few seconds) on a good network. When the video is a few minutes and < 1GB, the experience is still passable on my computer with decent network, you can seek to an arbitrary timestamp and it will go there almost reliably (with some noticeable delay. But at this point the experience starts getting frustrating on mobile, seeking doesn't work reliably, it take noticeably longer for the video to be ready for playback, and errors may occur when you try to play, seek, pause, etc. For larger files (> 1 GB), playback experience becomes atrocious even on desktop/laptop, and even for audio files.

I have a known of this issue for months and was planning to work on it before the "official launch". Not many customers have reported it so far because many have been using it for images or music videos < 1GB. But I've been using it for large video/audio files, so I know the pain. But recently, I got some users who wanted to use Quickbyte to share their podcast footage and playback didn't work, and they couldn't use it. So the time has come to do it.

When I first did research into this problem I learned about protocols, web standards and extensions that offer support for live streaming and video-on-demand on the web. In my case, video-on-demand (VOD) is the more relevant. See: https://developer.mozilla.org/en-US/docs/Web/Media/Audio_and_video_delivery/Live_streaming_web_audio_and_video

My first intuition was to build a backend pipeline that would run in the background on some worker nodes:
- fetch raw uploaded video (and audio) from the cloud storage where Quickbyte has uploaded them to
- create new versions suitable for playback on the web by: compressing, transcoding, generating lower-resolutions using a tool like `ffmpeg`
- generate thumbnails
- packaging the generated media for web playback based on MPEG-DASH, HLS formats using to tools like `shacka-packager`
- uploading these assets to cloud storage and storing relevant metadata to the corresponding file records in the DB

To reduce cloud bandwidth and ingress/egress costs I could consider running the workers in the same region (or even same cloud provider) where the videos are hosted and also ensure the generated videos and assets are stored in the same region or bucket/container as the source files. But this could be costly and complicated to setup at first. Maybe it would be a future optimization.

Here are some resources that would help implement this:
- https://developer.mozilla.org/en-US/docs/Web/Media/Audio_and_video_delivery/Live_streaming_web_audio_and_video
- https://www.youtube.com/playlist?list=PLNYkxOF6rcID8S0kEBuQwRyev7RgilNZF
- https://www.youtube.com/watch?v=zOPu26W48AA

Initially, I had an estimate of about 2 weeks to build and integrate the first iteration of a functional end-to-end pipeline for VOD and then improve it from there. However, given the sudden urgency of this task, I want to use an existing solution that I can integrate in <= 3 days, but that's relatively cheap (or with a generous free time). Something that can solve the playback issue without requiring me to worry about it for 1y+. Basically, a managed service that I can give presigned download urls from Quickbyte files as input and it can handle everything else:
- transcoding and packaging
- thumbnail generation
- storage of generated assets (but I'm also open to storing them if it would significantly reduce the cost of the service)
- CDN storage for for optimized playback

Here are a couple that I found

- https://io.mediakind.com/
- https://bitmovin.com
- https://www.dacast.com/
- https://www.gumlet.com/
- https://www.ravnur.com/
- https://imagekit.io/plans
- https://cloudinary.com/pricing
- https://aws.amazon.com/solutions/implementations/video-on-demand-on-aws/
- https://aws.amazon.com/blogs/media/creating-a-secure-video-on-demand-vod-platform-using-aws/
- https://azure.microsoft.com/en-us/products/media-services
- https://www.cloudflare.com/en-gb/products/cloudflare-stream/

Here the most important criteria I'm using:

- cost (should be affordable for me since I'm still footing the operation costs out of pocket. I also want something that will still allow me to be profitable even after I start charging, without having to rebuild it from scratch immediately)
- ease of integration (something I can get up an running quickly, good documentation, etc.)
- it works well, playback issues disappear (but I'll have to test it to find out for sure)
- compatibility with free/open source mpeg-dash/hls video player libraries (so that I'm not tied to their player SDKs in case I want to switch)

For the sake of comparison, I'm estimating about 4h of uploaded video per user per month (This estimate is based on the needs of the most resource-intensive potential customer I have right now, but most current users fall far below this estimate. I think it's not unreasonable to expect more such use cases as the platform grows).

The AWS solutions don't seem favorable because they are more like guidelines on how to build a VOD or streaming pipeline using AWS services that you'd probably need to provision in your AWS account. This would have been more suitable if I wanted to build and manage the service myself. The Azure Media Services is going to be retired this year, so it doesn't count. Ravnur (which I discovered from the Azure Media Services page) has no pricing page on their website, so I'll give it a pass. A few other services were too costly for my liking or their free plans were not as generous as I'd want. One of the target customers expects to upload 1h of video on average, so 100minutes would run out pretty fast.

I considered Bitmovin, Gumlet and Cloudflare stream. Of the three, Gumlet had the least comprehensive docs. It's free plan only offers 100 free minutes, it's first paid plan of $10/month is not as competitive of as Cloudflare stream.

Bitmovin seems to have a more complete product and good docs. It offers 2K free minutes a month. That's around 33h. That means I'm not paying much for the first 8 customers, which is a good headstart. However, when encoding costs of 0.02 per minute after the free minutes, this would translate to 0.02 * 60 * 4 = $4.8 per customer per month. This is much higher than I'd want. I'm hoping to spend less than $2 on encoding costs per customer per month, actually less than $1 would be ideal. When I use [their cost estimator](https://bitmovin.com/pricing#payg-calculator), the lowest figure I could get for 4 60-minutes assets of up to 1080p resolution is $15.03, but the minimum number of viewers you can set on the estimator is 5000. A part from cost, Bitmovin seems to have good docs and very flexible infrastructure, integration with different cloud providers as input sources, custom output destinations (e.g. store the output in Azure or in Bitmoving CDN, etc.).

Cloudflare Stream also seems enticing, it has $5/month plan that offers 1000 storage minutes and $1/1000 transfer minutes. That mean $6 will serve about 1000/(60 * 4) ~= 4 customers per month. That means 1.25$ per customer per month on encoding costs (this math assumes each video will be watched in full only once). I like the per-minute encoding pricing instead of per-GB. But I don't like the fact that I have to pay a fixed price per month even when I don't have users consuming that much data. The lack of a free plan or pay-as-you-go tier makes this less attractive. Cloudflare stream seems to have a simpler API surface and quick to build on than Bitmovin.

I will give Bitmovin a try first. If it doesn't work as well as expected or if it has unexpected costs, I may switch to Cloudflare.

I acknowledge that these costing estimates are not robust, especially on account for transfer costs from source to encoding service and from encoding service to end users. I will compute better estimates after analyzing actual usage over time.

Similar to how we have `StorageHandler` interface to abstract different implementations, I'm thinking of creating a `PlaybackPackager` interface that will abstract away the implementation details of different providers and make it possible for more to swap out implementations or to use different providers for different files, which would make it possible to have gradual migration.

After a transfer is complete, a job will be queued that will go through the files and submit them to the `PlaybackOptimizer`. The optimizer will send the relevant details to the relevant VOD service (e.g. Bitmovin, Cloudflare stream). We'll need to register a webhook to find out when the optimization is complete. The relevant optimizer will handle the webhook and update the file record to indicate that optimization is complete and the assets are ready for playback. Assets include playback links, or a reference that can be used to generate a secure playback link, thumbnail assets, etc.

## Service provider choices made during actual implementation

This is an update after I've gone through the implementation of the feature. My first option was to use Bitmovin because it has richer docs, client SDKs for nodejs and other languages, and a free tier (at that point I had not realized things would get more expensive after the free tier). However, the getting started guide was quite long. I wanted to something that would allow me to get up and running quickly, but with Bitmovin it seems you have to configure very granular encoding options to get up and running. I didn't understand a lot of this option as I'm still new in the video encoding space, but also didn't want to do all the reading and research or make fine-grained decisions about hls, or fmp4, or muxing options. I wanted something that I can pass my URL and at most set a few options (like supported resolutions, encoding formats, etc.) and submit one call to the API. With Bitmovin, you have to make too many calls and create preset configs before you can get up and running. You also have to maintain a lot more state, like keeping track of your input ids, and output ids, etc. I think this flexibility is realy great for advanced scenarios, but I just wanted something quick. I also found somewhere in the Bitmovin docs where they say that their CDN is based in Europe, it's not globally distributed. So playback performance may not be optimal outside of Europe. Furthermore, in order to integrate with Azure for input source or destination, you have to provide an access key and secret to a storage account, which I am not very comfortable with. I assumed direct integration with a source would provide better transfer performance, I'm not sure if it performs multi-part download when you only provide a URL. But when I was testing encoding on the dashboard UI, it failed to download the file from an Azure signed download URL, so I tested by manually uploading a file from my system. Not sure if this would have worked if I had used the API or SDK instead.

Because I was too lazy to go through Bitmovin's getting started guide, I switched over to Cloudflare Stream instead. Cloudflare has a simpler API, you only need one API call to submit an encoding job. I was able to get an end-to-end video encoding pipeline working in Quickbyte using Cloudflare stream in relatively short amount of time. However, I faced the following issues:

- Cloudflare Stream has no standard SDK. Their REST API is easy to work with, but a typescript-enabled node.js client SDK would have provided a better developer experience
- You cannot create different environments or organizations or projects in your account. I want to be able to have isolated production and development environments without having to create and pay monthly fees for multiple accounts.
- You can only register one webhook url per account at time. Same issue as lack of prod and test environment isolation within the same account.
- No support for audio-only media. It only supports video. However, I also want good playback experience for audio files. I've seen mentions of plans to support it while searching online, but I didn't find any official announcement of an ETA.
- No support for 4K. Seems output video quality is limited to 1080p

Due to these issues, it was clear that I would not stick Cloudflare after finishing implementation of the end-to-end pipeline. Luckily, I stumbled upon other services while implementing the feature. And I settled on [**Mux**](https://mux.com). Mux was just the perfect fit for what I need right now. Here are the benefits of using Mux:

- Great documentation, creat client SDKs, easy to integrate, simple API, easy to submit an encoding job
- Affordable pricing with pay-as-you-go tier. [They have 2 tiers](https://docs.mux.com/pricing/video):
  - The **baseline** tier has no encoding costs. You only pay 0.004$ per min in storage (for 1080p) and 0.00096$ per min in delivery per month. This translates to about $1.248 per customer per month based on the calculations used in the previous section. I'd have wanted something < $1, but I think I can work with this for now. The baseline tier only supports videos up to 1080p, has a smaller Adataptive Bit Rating ladder and does not support audio-only streams.
  - The **smart** tier is more expensive but also supports 4k videos and audio-only streams.
  - The good thing is that you can configure the tier per encoding asset. You're not tight to one for your whole account. So I can use the baseline tier for most videos and only enable the smart tier for audio and for cases when I want to enable 4k (e.g. premium users)
- You can create multiple environments in a single account. So you can have separate, isolated prod and dev environment, each one with its own assets, separate webhook urls, separate api keys, etc.
- Mux Data: A product for tracking engagement and metrics on media playback. I had not thought about this before, but looks like something I should consider. To help me (and users) know how often videos have been watched, from where, at which resolutions, etc. Other services seem to have this feature integrated in their own players, but with Mux, it seems you can integrate this with third-party players. I'm not planning to work on this now, but might be useful in the future

Due to these features, I switched to Mux. The only downside to Mux (other than not having a free tier) is that it seems not to support DASH, only HLS support is listed for on-demand videos. But I don't know if that's a problem in practice. HLS seems to have a wider support across devices and browsers than DASH (I don't think DASH is supported on iOS Safari).

## Implementation details

Here are the details of the current implementation.

I created a `PlaybackPackager` interface that abstacts an encoding service that can perform encoding on a media file and generate optimized playback urls. A `PlaybackPackagerProvider` can register multiple packagers and selects the first one that `canPackage` a file. I currently have two implementations: `MuxPlaybackPacakger` and `CloudflarePlaybackPackager` (I'm no longer using cloudflare, and will probably remove it in the future).

When a file transfer into Quickbyte completes, a `transferComplete` event is emitted. The global event handler listens to this event and queues an encoding job for each file. For each file in the queue, the `tryStartPackageFile` function is called which tries to find a packager that supports the file, and if one is found calls the `packager.startPackagingFile` method. In the current case, the `MuxPlaybackPackager` only supports video and audio files (we use the file extension to determine the media type). The mux packager submits an encoding job to the Mux API. For video files, the `baseline` tier is used, for audio files, the `smart` tier is used, since it's the only one that supports audio files (audio files are charged at 1/10th the price of 1080p videos). We update the file's record to indicate that packing is in progress.

When packaging is complete, Mux (or whichever encoding service) will send a notification to our webhook endpoint. Then we'll fetch the corresponding asset from the encoding service (Mux) to get the latest status and update our file record accordingly.

I also made changes to the `MediaPlayer` component. I replace the HTML5 `<video>` and `<audio>` elements to with the open-source [Vidstack](https://www.vidstack.io/) player. It has built-in support for HLS and other video and audio formats. I did not want to use a player provided by a specific encoding service provider because I wanted to it to be easy to switch. I think (haven't verified) that standalone video libraries have better customization support because they're more general purpose. I considered a few options (like [Video.js](https://videojs.com/)), but Vidstack seemed to have better documentation and was easier for me to customize the controls. I wanted to retain the existing Quickbyte controls especially because of the customized slider that has tight-integration to Quickbyte comments. I didn't want to spend too much time figuring out how to build that feature on top of third party video players.

When the player view is opened, the backend will fetch add playback urls from the packager to the file record (playback urls include HLS manifest URL, thumbnail URL, etc.). The URLs are used to populate the video or audio player sources. HLS and DASH are preferred when available, and the file's download url is used as a fallback. If the `playbackPackagingStatus` of a file is `progress`, a warning is shown to the user that playback optimization is in progress and that playback experience may be degraded until the process completes. Currently we don't notify the user that encoding is complete. I considered sending an email notification, but I feared there would be too many emails sent to the user if sent an email for each file. I think we can consider this if customers request it or when we implement a way to "buffer" emails and send a single email with multiple related notifications instead of an individual email per file.

When fetching a media file which does not have playback packaging information (e.g. it was uploaded before this feature was implemented, or at the time it was uploaded we did not have a packager that supports it), the backend will automatically queue it for encoding if a packager is supports it. This helps ensure we can automatically encode files that were uploaded before this feature. A next step is to implement a background job that will go through all files and try to encode supported ones. That can be done in a future iteration.

While working on this I also realized that we need to keep track of individual file upload status, instead of relying on transfer status. If multiple files are uploaded in a single transfer, we don't have to wait for the entire transfer to complete before we start encoding, we can queue an encoding job when a file upload completes. This is something to improve in future work.
