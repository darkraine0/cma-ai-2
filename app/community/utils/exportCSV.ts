import { Plan } from "../types";

export function exportToCSV(plans: Plan[], communityName: string): void {
  const header = [
    "Plan Name",
    "Price",
    "Sq Ft",
    "Stories",
    "$/Sq Ft",
    "Last Updated",
    "Company",
    "Community",
    "Type",
    "Price Changed Recently"
  ];

  const rows = plans.map((plan) => [
    plan.type === 'now' && plan.address ? plan.address : plan.plan_name,
    plan.price,
    plan.sqft,
    plan.stories,
    plan.price_per_sqft,
    plan.last_updated,
    plan.company,
    plan.community,
    plan.type,
    plan.price_changed_recently ? "Yes" : "No"
  ]);

  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${communityName}-plans.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
