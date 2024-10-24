# Quickbyte

Fast, resumable, reliable sharing of large files

## MVP Roadmap

### API

- [x] User sign up and authentication
- [x] Sign-in with Google
- [x] Basic permissions
- [x] Init file uploads with secure file URL
- [x] Generate download URL
- [x] Support multiple regions?
- [x] Region-ping latency detection
- [x] Multi-file transfers
- [x] Large zip download support
  - [x] Zip download resilience (chunked downloads + retries)
  - [x] Zip64 support
- [ ] Validation
- [ ] Perf benchmarks and tuning
- [x] Resumable uploads
- [x] Deploy to staging
- [x] Deploy to prod
- [x] Email provider integration
- [x] Deployment pipeline? (Vercel and Railway auto-deploy on merge to main)
- [x] Automation cloud resource provision (storage accounts, auth, etc.)
  - [x] Automatic storage account provisioning and config with Terraform
- [x] Payment integration
- [x] Collect more data for better insights
  - [x] Transfer source location
  - [x] Transfer duration
  - [x] Download location
  - [x] Download kind (zip, individual files)
  - [x] Add duration and file stats to transfer object
  - [x] Tune and optimize sentry telemetry
- [x] Make transfers invalid past expiry date
- [x] Handle TODOs and deprecations
- [x] Improve landing page, sign up and first-time-user flow
- [x] Legal pages
  - [x] Terms of service
  - [x] Privacy Policy
  - [x] Cookie Policy

### Client

Web app

## How it works (high-level overview)

When client wants to transfer a file:

- client pings regions in available provider to find provider/region with optimal latency
- client sends request to server to initiate file upload, payload includes filename and other metadata
also includes preferred provider and region
- server creates blob in provider/region under the user's account, blob has unique path
- server stores file and blob metadata in db
- server generates secure upload url and sends response to client
- client uses secure upload URL to upload blocks of the blob
- client will send update to server when upload is done
- client could send periodic updates to server on upload progress
