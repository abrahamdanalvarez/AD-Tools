// Development-only component gallery (open /#styleguide on `npm run dev`).
// Never included in production builds.
import { FileText, FolderOpen, Image } from "lucide-react";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { CategoryCard, ToolCard } from "@/components/cards";
import { EmptyState } from "@/components/empty-state";
import { PrivacyBadges } from "@/components/privacy";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, Badge, Progress, Skeleton, Spinner } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const swatches = [
  "background", "surface", "surface-muted", "foreground", "muted-foreground", "border", "input",
  "primary", "primary-hover", "primary-text", "primary-soft", "secondary", "accent",
  "success", "success-text", "warning", "warning-text", "error", "error-text",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border py-8">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function Styleguide() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map((s) => (
            <li key={s} className="text-xs">
              <div className="h-10 rounded-md border border-border" style={{ background: `var(--${s})` }} />
              <code className="mt-1 block">--{s}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <h1 className="text-4xl font-bold">Heading — Plus Jakarta Sans</h1>
        <p className="mt-2">Body text — Inter. The quick brown fox jumps over the lazy dog.</p>
        <p className="mt-2 text-muted-foreground">Muted text for secondary information.</p>
        <code className="mt-2 block text-sm">const code = "JetBrains Mono";</code>
      </Section>

      <Section title="Logo">
        <div className="flex items-center gap-6">
          <Logo />
          <LogoMark className="size-12" />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Inputs, select, tabs">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sg-input">Page range</Label>
            <Input id="sg-input" placeholder="e.g. 1-3, 5" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-select">Output format</Label>
            <Select defaultValue="png">
              <SelectTrigger id="sg-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Tabs defaultValue="a" className="mt-6">
          <TabsList>
            <TabsTrigger value="a">Settings</TabsTrigger>
            <TabsTrigger value="b">Advanced</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="text-sm text-muted-foreground">Basic settings.</TabsContent>
          <TabsContent value="b" className="text-sm text-muted-foreground">Advanced settings.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-3">
          <ToolCard icon={FileText} name="Merge PDF" description="Combine PDFs into one file." href="#styleguide" />
          <ToolCard icon={Image} name="Resize image" description="Change image dimensions." badge={<Badge tone="primary">New</Badge>} />
          <CategoryCard icon={FileText} name="PDF" description="Work with PDFs." count={0} />
        </div>
      </Section>

      <Section title="Feedback">
        <div className="grid gap-3">
          <Alert tone="info" title="Processing happens on your device">Nothing is uploaded.</Alert>
          <Alert tone="success" title="Done">Your file is ready to download.</Alert>
          <Alert tone="warning" title="Large file">This may take a while on older devices.</Alert>
          <Alert tone="error" title="Could not read this PDF">The file may be damaged or password-protected.</Alert>
        </div>
        <div className="mt-6 grid gap-3">
          <Progress value={64} aria-label="Progress" />
          <Progress aria-label="Working" />
          <Spinner label="Loading tool" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <div className="flex gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="primary">Primary</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
          </div>
        </div>
      </Section>

      <Section title="Privacy indicators and empty state">
        <PrivacyBadges />
        <EmptyState className="mt-6" icon={FolderOpen} title="No file selected" description="Choose a file to get started." />
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Remove file?</DialogTitle>
            <DialogDescription>It is only in your browser's memory, so it disappears for good.</DialogDescription>
            <div className="flex justify-end gap-2">
              <Button variant="outline">Cancel</Button>
              <Button variant="destructive">Remove</Button>
            </div>
          </DialogContent>
        </Dialog>
      </Section>
    </main>
  );
}
