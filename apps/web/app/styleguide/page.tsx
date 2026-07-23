"use client"

import { useState } from "react"
import {
  RiAddLine,
  RiMoreLine,
  RiSearchLine,
  RiUserLine,
} from "@remixicon/react"
import { toast } from "sonner"

import { cn } from "@workspace/ui/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Progress } from "@workspace/ui/components/progress"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  )
}

export default function StyleguidePage() {
  const [progress] = useState(66)

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight">Styleguide</h1>
        <p className="text-sm text-muted-foreground">
          Every UI element from the shadcn preset. Press{" "}
          <kbd className="rounded bg-muted px-1 font-mono text-xs">d</kbd> to
          toggle dark mode.
        </p>
      </header>

      <Section title="Buttons" description="Variants and sizes.">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button size="icon" aria-label="Add">
          <RiAddLine />
        </Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Button sizes">
        <Button size="xs">XS</Button>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </Section>

      <Section title="Badges">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </Section>

      <Section title="Inputs" description="Text fields and form controls.">
        <div className="grid w-full max-w-sm gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <RiSearchLine className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="search" className="pl-8" placeholder="Search…" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us about yourself" />
          </div>
        </div>
      </Section>

      <Section title="Selection controls">
        <div className="grid gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox defaultChecked /> Accept terms
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch defaultChecked /> Notifications
          </label>
          <RadioGroup defaultValue="one" className="grid gap-2">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="one" /> Option one
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="two" /> Option two
            </label>
          </RadioGroup>
          <div className="grid w-64 gap-2">
            <Label>Volume</Label>
            <Slider defaultValue={[50]} max={100} step={1} />
          </div>
        </div>
      </Section>

      <Section title="Select">
        <Select defaultValue="apple">
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Pick a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Cards">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Project</CardTitle>
            <CardDescription>Deploy in one click.</CardDescription>
            <CardAction>
              <Button size="icon-sm" variant="ghost" aria-label="More">
                <RiMoreLine />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Card body content goes here with supporting detail.
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Save</Button>
            <Button size="sm" variant="outline">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Alerts">
        <div className="grid w-full max-w-xl gap-4">
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              This is a default informational alert.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Something went wrong.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="account" className="w-96">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="text-sm text-muted-foreground">
            Manage your account settings.
          </TabsContent>
          <TabsContent value="password" className="text-sm text-muted-foreground">
            Change your password here.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Accordion">
        <Accordion className="w-96">
          <AccordionItem value="1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>Yes. It follows WAI-ARIA.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>Yes, with the preset theme.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Overlays" description="Dialog, alert dialog, dropdown, popover, tooltip.">
        <Dialog>
          <DialogTrigger className={buttonVariants({ variant: "outline" })}>
            Open dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="Ada Lovelace" />
            </div>
            <DialogFooter>
              <DialogClose className={buttonVariants({ variant: "outline" })}>
                Cancel
              </DialogClose>
              <DialogClose className={buttonVariants()}>Save</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger
            className={buttonVariants({ variant: "destructive" })}
          >
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: "outline" })}
          >
            Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger className={buttonVariants({ variant: "outline" })}>
            Popover
          </PopoverTrigger>
          <PopoverContent className="text-sm text-muted-foreground">
            Popover content with extra detail.
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger className={buttonVariants({ variant: "outline" })}>
            Hover me
          </TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>

        <Button
          variant="outline"
          onClick={() =>
            toast("Event created", { description: "Sunday, Dec 3 at 9:00 AM" })
          }
        >
          Show toast
        </Button>
      </Section>

      <Section title="Avatar">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>
            <RiUserLine className="size-4" />
          </AvatarFallback>
        </Avatar>
      </Section>

      <Section title="Progress & Skeleton">
        <div className="grid w-80 gap-6">
          <Progress value={progress} />
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Table">
        <Table className="w-full max-w-xl">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Ada Lovelace</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">Active</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Alan Turing</TableCell>
              <TableCell>Editor</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline">Invited</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Navigation">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Docs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Styleguide</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      <Section title="Separator">
        <div className={cn("flex h-5 items-center gap-3 text-sm")}>
          <span>Docs</span>
          <Separator orientation="vertical" />
          <span>Guides</span>
          <Separator orientation="vertical" />
          <span>API</span>
        </div>
      </Section>

      <Section title="Calendar">
        <Calendar mode="single" className="rounded-md border" />
      </Section>
    </main>
  )
}
