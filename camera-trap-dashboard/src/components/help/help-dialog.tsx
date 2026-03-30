"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appOverview, gettingStarted, glossary } from "@/lib/help-content";

interface HelpDialogProps {
  children: React.ReactNode;
}

/**
 * Modal help dialog with Overview, Getting Started, and Glossary tabs.
 * Wrap a trigger button as children.
 */
export function HelpDialog({ children }: HelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{appOverview.title}</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="overview"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="flex-1 overflow-y-auto pr-2"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {appOverview.description}
              </p>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Features</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {appOverview.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="getting-started"
            className="flex-1 overflow-y-auto pr-2"
          >
            <div className="space-y-4">
              {gettingStarted.map((step) => (
                <div key={step.step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent
            value="glossary"
            className="flex-1 overflow-y-auto pr-2"
          >
            <dl className="space-y-3">
              {glossary.map((entry) => (
                <div key={entry.term}>
                  <dt className="text-sm font-semibold">{entry.term}</dt>
                  <dd className="text-sm text-muted-foreground">
                    {entry.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
