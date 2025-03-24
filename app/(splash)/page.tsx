// file: /app/setup/page.tsx
// feature: Setup - Initial platform setup and system overview

import ComponentPreview from "@/components/app/ComponentsPreview";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

// Color palette for charts
const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8'
];

export default function SetupPage() {

  return (
    <main className="flex grow flex-col">
      <div className="container mx-auto p-4 space-y-8">
        <PageHeader
          title="WebApp Template"
          description="Powered by NextJS / Convex / Tailwind / ShadCN"
        />
      </div>
      <ComponentPreview />
    </main>
  )
}