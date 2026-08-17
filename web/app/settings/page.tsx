"use client";

import { LocationsManager } from "@/components/settings/locations-manager";
import { ModelOptionsManager } from "@/components/settings/model-options-manager";
import { PmChecklistManager } from "@/components/settings/pm-checklist-manager";
import { PmDueSetting } from "@/components/settings/pm-due-setting";
import { PmScheduleSetting } from "@/components/settings/pm-schedule-setting";
import { UnitSpecsTable } from "@/components/settings/unit-specs-table";
import { useUnits } from "@/lib/hooks/use-units";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mb-4 mt-1 text-[13px] font-semibold text-slate-500">{description}</p>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { data: units = [] } = useUnits();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-[28px] font-black tracking-tight text-slate-900">Settings</h2>
        <p className="mt-1 text-[13px] font-semibold text-slate-500">
          App-wide configuration for hotel operations.
        </p>
      </div>

      <SettingsSection
        title="Routine PM Schedule"
        description="How often each unit is due for preventative maintenance."
      >
        <PmScheduleSetting />
      </SettingsSection>

      <SettingsSection
        title="PM Checklist"
        description="The items technicians complete for each PM. All enabled items are required."
      >
        <PmChecklistManager />
      </SettingsSection>

      <SettingsSection
        title="Flag a Unit for PM"
        description="Manually mark a specific unit as due for maintenance."
      >
        <PmDueSetting />
      </SettingsSection>

      <SettingsSection
        title="Unit Models"
        description="PTAC models offered when registering a new unit."
      >
        <ModelOptionsManager />
      </SettingsSection>

      <SettingsSection
        title="Locations"
        description="Generic dashboard locations units can be assigned to."
      >
        <LocationsManager units={units} />
      </SettingsSection>

      <SettingsSection
        title="Unit Specifications"
        description="Edit each unit's model and serial number in one place."
      >
        <UnitSpecsTable />
      </SettingsSection>
    </div>
  );
}
