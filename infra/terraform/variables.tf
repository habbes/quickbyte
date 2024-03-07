// COMMON variables

variable "resource_prefix" {
  type    = string
  default = "quickbytetest"
}

// AZURE STORAGE variables

variable "az_regions" {
  type = map(any)
  default = {
    eastus = {
      name = "East US"
    },
    westus = {
      name = "West US"
    },
    northsa = {
      name = "South Africa North"
    },
    centralin = {
      name = "Central India"
    },
    southuk = {
      name = "UK South"
    },
    wcentralde = {
      name = "Germany West Central"
    },
    centralfr = {
      name = "France Central"
    },
    centralqt = {
      name = "Qatar Central"
    },
    centralca = {
      name = "Canada Central"
    },
    southbr = {
      name = "Brazil South"
    }
  }
}

variable "az_data_container_name" {
  type    = string
  default = "data"
}

variable "az_ping_container_name" {
  type    = string
  default = "ping"
}

variable "az_ping_blob_name" {
  type    = string
  default = "ping.txt"
}

variable "az_ping_blob_content" {
  type    = string
  default = "ping"
}

// S3 variables

variable "s3_regions" {
  type = map(any)
  default = {
    useast1 = {
      name = "us-east-1"
    },
    uswest2 = {
      name = "us-west-2"
    },
    afsouth1 = {
      name = "af-south-1"
    },
    eucentral1 = {
      name = "eu-central-1"
    },
    euwest2 = {
      name = "eu-west-2"
    },
    euwest3 = {
      name = "eu-west-3"
    },
    eunorth1 = {
      name = "eu-north-1"
    },
    apsouth1 = {
      name = "ap-south-1"
    },
    saeast1 = {
      name = "sa-east-1"
    }
  }
}

variable "s3_ping_blob_key" {
  type    = string
  default = "ping/ping.txt"
}

variable "s3_ping_blob_content" {
  type    = string
  default = "ping"
}