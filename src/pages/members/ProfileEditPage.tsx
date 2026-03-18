import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/Card";
import { FormField } from "@/components/molecules/FormField";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/atoms/Select";
import { MEMBERSHIP_CONFIG } from "@/lib/utils";
import type { MembershipType, Profile } from "@/types";
import { toast } from "sonner";

interface EditForm {
  full_name: string;
  phone: string;
  address: string;
  membership_type: MembershipType;
}

export function ProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: authProfile, isLibrarian, refreshProfile } = useAuth();

  // If no :id in URL, the member is editing their own profile
  const targetId = id ?? authProfile?.id ?? "";
  const isSelf = targetId === authProfile?.id;

  const [member, setMember] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    full_name: "",
    phone: "",
    address: "",
    membership_type: "standard",
  });

  useEffect(() => {
    if (!targetId) return;
    memberService.getMemberById(targetId)
      .then((m) => {
        if (m) {
          setMember(m);
          setForm({
            full_name: m.full_name ?? "",
            phone: m.phone ?? "",
            address: m.address ?? "",
            membership_type: (m.membership_type as MembershipType) ?? "standard",
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [targetId]);

  const set = (field: keyof EditForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (form.phone && !/^\d+$/.test(form.phone.replace(/[\s\-\+]/g, ""))) {
      toast.error("Phone number must contain only digits");
      return;
    }
    setIsSaving(true);
    try {
      await memberService.updateProfile(targetId, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        membership_type: form.membership_type,
      });
      if (isSelf) await refreshProfile();
      toast.success("Profile updated successfully");
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader text="Loading profile..." />;
  if (!member) return <div className="py-10 text-center text-muted-foreground">Member not found</div>;

  const selectedConfig = MEMBERSHIP_CONFIG[form.membership_type];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isSelf ? "Edit My Profile" : `Edit Profile — ${member.full_name ?? member.email}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Full name" htmlFor="fullName" required>
              <Input
                id="fullName"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Jane Doe"
              />
            </FormField>

            <FormField label="Phone number" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[\d\s\+\-]*$/.test(val)) set("phone", val);
                }}
                placeholder="+91 98765 43210"
              />
            </FormField>

            <FormField label="Address" htmlFor="address">
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, City"
              />
            </FormField>

            {/* Membership type — librarians can change anyone's, members can only change their own */}
            {(isLibrarian || isSelf) && (
              <FormField label="Membership type" htmlFor="membershipType">
                <Select
                  value={form.membership_type}
                  onValueChange={(v) => set("membership_type", v as MembershipType)}
                >
                  <SelectTrigger id="membershipType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{MEMBERSHIP_CONFIG.standard.label}</SelectItem>
                    <SelectItem value="public">{MEMBERSHIP_CONFIG.public.label}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5 rounded-lg bg-muted/60 px-3 py-2">
                  {selectedConfig.description}
                </p>
              </FormField>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
