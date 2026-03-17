import { BookOpen, Calendar, User } from "lucide-react";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import type { Book } from "@/types";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  onClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function BookCard({ book, onClick, actions, className }: BookCardProps) {
  const isAvailable = book.is_available;

  return (
    <Card
      className={cn(
        "group flex flex-col overflow-hidden transition-all hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="h-16 w-16 text-primary/30" />
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={isAvailable ? "success" : "destructive"}>
            {isAvailable ? "Available" : "Unavailable"}
          </Badge>
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <User className="h-3 w-3" />
          <span className="line-clamp-1">{book.author}</span>
        </div>
        {book.publication_year && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Calendar className="h-3 w-3" />
            <span>{book.publication_year}</span>
          </div>
        )}
        {book.genre && (
          <Badge variant="secondary" className="text-xs w-fit mb-2">
            {book.genre.name}
          </Badge>
        )}
        {actions && <div className="mt-auto pt-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
