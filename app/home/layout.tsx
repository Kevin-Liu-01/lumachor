import { TooltipProvider } from "@/components/ui/tooltip";

export const experimental_ppr = true;

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
