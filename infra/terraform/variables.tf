variable "region" {
  description = "Alibaba Cloud region"
  type        = string
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
}

variable "public_subnet_cidr" {
  type        = string
  description = "Public subnet for ingress"
}

variable "app_subnet_cidr" {
  type        = string
  description = "Private subnet for application pods"
}

variable "data_subnet_cidr" {
  type        = string
  description = "Private subnet for data services"
}

variable "cluster_name" {
  type        = string
  description = "ACK cluster name"
}

variable "observability_project_name" {
  type        = string
  description = "SLS project name for consolidated logs"
}

variable "monitor_group_name" {
  type        = string
  description = "CloudMonitor monitor group name"
}

variable "contact_group_name" {
  type        = string
  description = "Alert contact group name"
}

variable "alert_contacts" {
  description = "Alert contact list"
  type = list(object({
    name  = string
    email = string
  }))
  default = []
}

variable "cloudmonitor_alarms" {
  description = "Critical CloudMonitor alarms"
  type = list(object({
    name                = string
    project             = string
    metric              = string
    statistics          = string
    comparison_operator = string
    threshold           = number
    times               = number
    period              = number
    effective_interval  = string
    silence_time        = number
    metric_dimensions   = string
  }))
  default = []
}
