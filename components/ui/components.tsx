// Re-export cn utility (kept for backward compat — existing imports from './ui/components' still work)
export { cn } from '@/lib/utils';

// Re-export all shadcn primitives
export { Button } from './button';
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './card';
export { Input } from './input';
export { Textarea } from './textarea';
export { Badge } from './badge';
export { Label } from './label';
export { Separator } from './separator';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Alert, AlertTitle, AlertDescription } from './alert';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
} from './dialog';
export { ScrollArea } from './scroll-area';
