resource "alicloud_log_project" "this" {
  project_name = var.project_name
  description  = var.project_description
  tags         = var.tags
}

resource "alicloud_log_store" "this" {
  for_each       = var.logstores
  project_name   = alicloud_log_project.this.project_name
  logstore_name  = each.key
  shard_count    = each.value.shard_count
  ttl            = each.value.ttl
  auto_split     = true
  max_split_shard_count = 64
  append_meta    = true
}

resource "alicloud_cms_alarm_contact" "contacts" {
  for_each           = { for contact in var.contact_points : contact.name => contact }
  alarm_contact_name = each.value.name
  describe           = "Managed by Terraform"
  channels_mail      = each.value.email
  lifecycle {
    ignore_changes = [channels_mail]
  }
}

resource "alicloud_cms_alarm_contact_group" "this" {
  count                      = length(var.contact_points) > 0 ? 1 : 0
  alarm_contact_group_name   = var.contact_group_name
  contacts                   = [for contact in alicloud_cms_alarm_contact.contacts : contact.alarm_contact_name]
}

resource "alicloud_cms_monitor_group" "this" {
  monitor_group_name = var.monitor_group_name
  tags               = var.tags
}

resource "alicloud_cms_alarm" "this" {
  for_each           = { for alarm in var.alarms : alarm.name => alarm }
  name               = each.value.name
  project            = each.value.project
  metric             = each.value.metric
  period             = each.value.period
  effective_interval = each.value.effective_interval
  silence_time       = each.value.silence_time
  contact_groups     = length(var.contact_points) > 0 ? [alicloud_cms_alarm_contact_group.this[0].alarm_contact_group_name] : []
  metric_dimensions  = each.value.metric_dimensions
  escalations_critical {
    statistics          = each.value.statistics
    comparison_operator = each.value.comparison_operator
    threshold           = each.value.threshold
    times               = each.value.times
  }
}
