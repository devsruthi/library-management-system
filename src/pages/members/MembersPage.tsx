import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Mail, Phone, Calendar, ChevronRight } from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import { SearchBar } from "@/components/molecules/SearchBar";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { Badge } from "@/components/atoms/Badge";
import { formatDate, getInitials, MEMBERSHIP_CONFIG } from "@/lib/utils";
import type { Profile } from "@/types";

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function avatarColor(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

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

  const memberCount = filtered.filter((m) => m.role === "member").length;
  const librarianCount = filtered.filter((m) => m.role === "librarian").length;

  if (isLoading) return <PageLoader text="Loading members..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-none">Members</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {memberCount} member{memberCount !== 1 ? "s" : ""}
              {librarianCount > 0 && ` · ${librarianCount} librarian${librarianCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email or phone..."
          className="w-full sm:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No members found" description="Try adjusting your search." />
      ) : (
        <div className="rounded-xl border overflow-hidden divide-y">
          {filtered.map((member, i) => (
            <MemberRow
              key={member.id}
              member={member}
              index={i}
              onClick={() => navigate(`/members/${member.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  index,
  onClick,
}: {
  member: Profile;
  index: number;
  onClick: () => void;
}) {
  const initials = getInitials(member.full_name ?? member.email);
  const color = avatarColor(member.id);
  const membershipLabel =
    MEMBERSHIP_CONFIG[member.membership_type as keyof typeof MEMBERSHIP_CONFIG]?.label ??
    member.membership_type;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left group"
    >
      {/* Index number */}
      <span className="text-xs text-muted-foreground w-5 shrink-0 text-right tabular-nums">
        {index + 1}
      </span>

      {/* Avatar */}
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${color}`}
      >
        {initials}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
            {member.full_name || "Unnamed User"}
          </span>
          <Badge
            variant={member.role === "librarian" ? "default" : "secondary"}
            className="text-[10px] capitalize"
          >
            {member.role}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {membershipLabel}
          </Badge>
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
          {member.email && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              {member.email}
            </span>
          )}
          {member.phone && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              {member.phone}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            Joined {formatDate(member.created_at)}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
