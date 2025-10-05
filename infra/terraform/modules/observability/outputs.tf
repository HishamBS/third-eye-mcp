output "project_name" {
  description = "SLS project name"
  value       = alicloud_log_project.this.project_name
}

output "logstores" {
  description = "Logstore names"
  value       = { for name, store in alicloud_log_store.this : name => store.logstore_name }
}

output "alarm_contact_group" {
  description = "CloudMonitor contact group name"
  value       = length(alicloud_cms_alarm_contact_group.this) > 0 ? alicloud_cms_alarm_contact_group.this[0].alarm_contact_group_name : null
}

output "monitor_group_id" {
  description = "CloudMonitor monitor group ID"
  value       = alicloud_cms_monitor_group.this.id
}
