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
- [ ] Multi-file transfers?
- [ ] DB indexes
- [ ] Validation
- [ ] Perf benchmarks and tuning
- [ ] Resumable uploads
- [x] Deploy to staging
- [ ] Deploy to prod? (maybe not)
- [x] Deployment pipeline? (Vercel and Railway auto-deploy on merge to main)
- [ ] Automation cloud resource provision (storage accounts, auth, etc.)
    - [x] Automatic storage account provisioning and config with Terraform
    - [ ] Automatic auth provisioning and config
- [ ] Tests?

### Client

Desktop app or Web app ?

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
