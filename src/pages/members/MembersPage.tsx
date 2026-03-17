import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Mail, Phone, Calendar } from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import { SearchBar } from "@/components/molecules/SearchBar";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { Avatar, AvatarFallback } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import { formatDate, getInitials } from "@/lib/utils";
import type { Profile } from "@/types";

export function MembersPage() {
  const navigate = useNavigate();
  const { members, isLoading } = useMembers();
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(s) ||
      m.email?.toLowerCase().includes(s) ||
      m.phone?.toLowerCase().includes(s)
    );
  });

  if (isLoading) return <PageLoader text="Loading members..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {filtered.length} {filtered.length === 1 ? "member" : "members"}
        </p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, or phone..."
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No members found" description="Try adjusting your search." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={() => navigate(`/members/${member.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, onClick }: { member: Profile; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(member.full_name ?? member.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {member.full_name || "Unnamed User"}
              </p>
              <Badge
                variant={member.role === "librarian" ? "default" : "secondary"}
                className="text-[10px] shrink-0"
              >
                {member.role}
              </Badge>
            </div>
            {member.email && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Phone className="h-3 w-3" />
                <span>{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span>Joined {formatDate(member.created_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
