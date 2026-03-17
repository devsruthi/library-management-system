import { Menu } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { NotificationBell } from "./NotificationBell";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/books": "Books",
  "/books/new": "Add New Book",
  "/members": "Members",
  "/borrowing": "Borrow & Return",
  "/reservations": "Waitlists & Reservations",
  "/my-borrows": "My Borrows",
  "/my-reservations": "My Reservations",
  "/profile": "My Profile",
};

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname.startsWith("/books/") && location.pathname !== "/books/new") {
      if (location.pathname.endsWith("/edit")) return "Edit Book";
      return "Book Details";
    }
    if (location.pathname.startsWith("/members/")) return "Member Details";
    return pageTitles[location.pathname] ?? "Library";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{getTitle()}</h1>
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
