variable "project_name" {
  description = "Name of the Log Service project hosting Third Eye logs"
  type        = string
}

variable "project_description" {
  description = "Description applied to the SLS project"
  type        = string
  default     = "Third Eye MCP observability"
}

variable "logstores" {
  description = "Logstore definitions keyed by name"
  type = map(object({
    ttl         = number
    shard_count = number
  }))
  default = {
    api_events   = { ttl = 30, shard_count = 2 }
    audit_events = { ttl = 180, shard_count = 2 }
  }
}

variable "monitor_group_name" {
  description = "Name of the CloudMonitor logical group"
  type        = string
}

variable "contact_group_name" {
  description = "CloudMonitor contact group for alerts"
  type        = string
}

variable "contact_group_description" {
  description = "Human readable description for the contact group"
  type        = string
  default     = "Third Eye MCP on-call"
}

variable "contact_points" {
  description = "List of alert recipients"
  type = list(object({
    name  = string
    email = string
  }))
  default = []
}

variable "alarms" {
  description = "CloudMonitor alarm definitions"
  type = list(object({
    name                 = string
    project              = string
    metric               = string
    statistics           = string
    comparison_operator  = string
    threshold            = number
    times                = number
    period               = number
    effective_interval   = string
    silence_time         = number
    metric_dimensions    = string
  }))
  default = []
}

variable "tags" {
  description = "Common tags applied to resources"
  type        = map(string)
  default     = {}
}
