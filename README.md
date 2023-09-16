# Quickbyte

Fast, resumable, reliable sharing of large files

## MVP Roadmap

### API

- [x] User sign up and authentication
- [ ] Social auth providers
- [x] Basic permissions
- [x] Init file uploads with secure file URL
- [x] Generate download URL
- [x] Support multiple regions?
- [x] Region-ping latency detection
- [x] Multi-file transfers
- [x] Large zip download support
  - [x] Zip download resilience (chunked downloads + retries)
  - [x] Zip64 support
- [ ] DB indexes
- [ ] Validation
- [ ] Perf benchmarks and tuning
- [x] Resumable uploads
- [x] Deploy to staging
- [ ] Deploy to prod
- [x] Deployment pipeline? (Vercel and Railway auto-deploy on merge to main)
- [ ] Automation cloud resource provision (storage accounts, auth, etc.)
  - [x] Automatic storage account provisioning and config with Terraform
  - [ ] Automatic auth provisioning and config
- [ ] Payment integration
- [ ] Collect more data for better insights
  - [ ] Transfer source location
  - [ ] Transfer duration
  - [ ] Download location
  - [ ] Download kind (zip, individual files)
  - [ ] Tune and optimize sentry telemetry
- [ ] Allow user to track transfers and downloads
- [ ] Make transfers invalid past expiry date
- [ ] Handle all TODOs and deprecations
- [ ] Legal pages
  - [ ] Terms of service
  - [ ] Privacy Policy
  - [ ] Cookie Policy
- [ ] Tests?

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
