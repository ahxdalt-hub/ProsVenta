import { Badge } from "@/components/ui/Badge";
import { ROLE_DEFINITIONS } from "@/features/collaboration/permissions";
import type { OrganizationRole } from "@/types/database";

interface RoleBadgeProps {
  role: OrganizationRole | null | undefined;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (!role) return null;
  const definition = ROLE_DEFINITIONS[role];
  if (!definition) return null;

  return (
    <Badge variant={definition.badgeVariant} className={`capitalize ${className ?? ""}`}>
      {definition.label}
    </Badge>
  );
}