terraform {
  required_version = ">= 1.6.0"
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = ">= 1.219.0"
    }
  }
}

provider "alicloud" {
  region = var.region
}

module "networking" {
  source             = "./modules/networking"
  vpc_cidr           = var.vpc_cidr
  public_subnet_cidr = var.public_subnet_cidr
  app_subnet_cidr    = var.app_subnet_cidr
  data_subnet_cidr   = var.data_subnet_cidr
}

module "ack" {
  source           = "./modules/ack"
  cluster_name     = var.cluster_name
  vpc_id           = module.networking.vpc_id
  vswitch_ids      = module.networking.vswitch_ids
  enable_autoscale = true
}

module "observability" {
  source                = "./modules/observability"
  project_name          = var.observability_project_name
  monitor_group_name    = var.monitor_group_name
  contact_group_name    = var.contact_group_name
  contact_points        = var.alert_contacts
  alarms                = var.cloudmonitor_alarms
  tags = {
    Environment = var.cluster_name
  }
}
