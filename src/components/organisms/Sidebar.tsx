import { NavLink, useLocation } from "react-router-dom";
import {
  BookOpen,
  Users,
  LayoutDashboard,
  BookMarked,
  History,
  BookPlus,
  Clock,
  X,
  Library,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import { Separator } from "@/components/atoms/Separator";
import { Badge } from "@/components/atoms/Badge";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
}

const memberNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Browse Books", to: "/books", icon: BookOpen },
  { label: "My Borrows", to: "/my-borrows", icon: History },
  { label: "My Reservations", to: "/my-reservations", icon: BookMarked },
];

const librarianNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Books", to: "/books", icon: BookOpen },
  { label: "Add Book", to: "/books/new", icon: BookPlus },
  { label: "Members", to: "/members", icon: Users },
  { label: "Borrow & Return", to: "/borrowing", icon: BookMarked },
  { label: "Waitlists", to: "/reservations", icon: Clock },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, isLibrarian, signOut } = useAuth();
  const navItems = isLibrarian ? librarianNav : memberNav;

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Library className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">LibraryOS</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLibrarian ? "Librarian" : "Member"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <SidebarNavItem key={item.to} item={item} onNavigate={onClose} />
            ))}
          </div>
        </nav>

        <Separator />

        {/* User info & sign out */}
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 mb-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {(profile?.full_name ?? profile?.email ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {profile?.email}
              </p>
            </div>
            <Badge variant={isLibrarian ? "default" : "secondary"} className="shrink-0 text-[10px]">
              {isLibrarian ? "Librarian" : "Member"}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}

function SidebarNavItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const location = useLocation();
  const isActive =
    item.to === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(item.to);

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
      {item.badge && (
        <Badge className="ml-auto text-[10px] h-4 px-1.5" variant="destructive">
          {item.badge}
        </Badge>
      )}
    </NavLink>
  );
}
