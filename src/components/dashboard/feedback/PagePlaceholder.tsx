import { DashboardEmptyState } from "./PageStates";
import type { IconName } from "../navigation/icons";

interface DashboardPagePlaceholderProps {
  title: string;
  description: string;
  icon: IconName;
}

export function DashboardPagePlaceholder({
  title,
  description,
  icon,
}: DashboardPagePlaceholderProps) {
  return (
    <section className="dashboard-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      <DashboardEmptyState
        title={`${title} coming soon`}
        description={`The ${title.toLowerCase()} experience is part of an upcoming phase. The workspace shell is ready for it.`}
        icon={icon}
      />
    </section>
  );
}