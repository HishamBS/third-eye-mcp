# Infrastructure Baseline

Terraform modules under `infra/terraform` define the Alibaba Cloud SCCC footprint for Third Eye MCP.

## Modules
- `modules/networking` – VPC, vswitches, security groups
- `modules/ack` – ACK cluster scaffold (worker autoscaling enabled)
- `modules/observability` – Simple Log Service project, logstores, CloudMonitor contacts/groups/alarms

## Usage
1. Copy `infra/terraform/terraform.tfvars.example` (to be created per environment) and populate:
   - `region`, `vpc_cidr`, subnet CIDRs
   - `cluster_name`
   - Observability inputs (`observability_project_name`, `monitor_group_name`, alarm contacts, alarms)
2. Run validation:
   ```bash
   make terraform-validate
   ```
   The helper script uses the local Terraform binary if present or a pinned `hashicorp/terraform:1.6.6` Docker image.
3. Integrate with CI once backend state bucket/OSS is provisioned.

All changes should pass `terraform validate` before commit.
