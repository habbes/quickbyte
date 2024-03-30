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

The AWS solutions don't seem favorable because they are more like guidelines on how to build a VOD or streaming pipeline using AWS services that you'd probably need to provision in your AWS account. This would have been more suitable if I wanted to build and manage the service myself. The Azure Media Services is going to be retired this year, so it doesn't count. Ravnur (which I discovered from the Azure Media Services page) has no pricing page on their website, so I'll give it a pass. A few other services were too costly for my liking or their free plans were not as generous as I'd want. One of the target customers expects to upload 1h of video on average, so 100minutes would run out pretty fast.

I considered Bitmovin, Gumlet and Cloudflare stream. Of the three, Gumlet had the least comprehensive docs. It's free plan only offers 100 free minutes, it's first paid plan of $10/month is not as competitive of as Cloudflare stream.

Bitmovin seems to have a more complete product and good docs. It offers 2K free minutes a month. This sounds too good to be true and I still feel like there's a catch I'm missing. It seems to offer fairly easy integration with different cloud providers and provides a CDN output. Cloudflare Stream also seems enticing, it has $5/month plan that offers 1000 storage minutes and $1/1000 transfer minutes. Also has a $10/month bundle that also includes images.

I will give Bitmovin a try first. If it doesn't work as well as expected or if it has unexpected costs, I may switch to Cloudflare.

Similar to how we have `StorageHandler` interface to abstract different implementations, I'm thinking of creating a `PlaybackOptimizer` interface that will abstract away the implementation details of different providers and make it possible for more to swap out implementations or to use different providers for different files, which would make it possible to have gradual migration.

After a transfer is complete, a job will be queued that will go through the files and submit them to the `PlaybackOptimizer`. The optimizer will send the relevant details to the relevant VOD service (e.g. Bitmovin, Cloudflare stream). We'll need to register a webhook to find out when the optimization is complete. The relevant optimizer will handle the webhook and update the file record to indicate that optimization is complete and the assets are ready for playback. Assets include playback links, or a reference that can be used to generate a secure playback link, thumbnail assets, etc.
