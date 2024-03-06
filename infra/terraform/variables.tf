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

variable "az_resource_prefix" {
  type    = string
  default = "quickbytetest"
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