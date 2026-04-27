"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Clock,
  Search,
  Activity,
  CheckCircle2,
  Mail,
  UserCog,
  MoreVertical
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestJson } from "@/lib/http";

type Partner = {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "trial" | "suspended";
  role: string;
  trialExpiresAt: string | null;
  approvedAt: string | null;
  deactivatedAt: string | null;
  deactivatedReason: string;
  createdAt: string;
  apiKeyCount: number;
  activeApiKeyCount: number;
  pendingApiKeyCount: number;
  totalApiUsage: number;
  isTrialExpired: boolean;
  apiLimit: number;
  apiUsage: number;
  trialStartDate: string;
};

type PartnersResponse = {
  items: Partner[];
  total: number;
};

export default function PartnersManagementPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Action Modal State
  const [actionPartner, setActionPartner] = useState<Partner | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [extendDays, setExtendDays] = useState("10");
  const [newApiLimit, setNewApiLimit] = useState("10000");
  const [trialStart, setTrialStart] = useState("");
  const [trialEnd, setTrialEnd] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [actionType, setActionType] = useState<"activate" | "deactivate" | "suspend" | "extend-trial" | "edit-account" | "email" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("superAdminToken");
      if (!token) return;

      let url = "/api/super-admin/partners?limit=100";
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      
      const result = await requestJson<PartnersResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPartners(result.items);
    } catch (error) {
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [statusFilter]);

  const handleAction = async () => {
    if (!actionPartner || !actionType) return;
    
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("superAdminToken");
      
      const body: any = {};
      let endpointAction = actionType as string;
      const method = (actionType === "edit-account") ? "PUT" : "POST";
      const endpoint = (actionType === "edit-account") ? "account" : (actionType === "email" ? "email" : endpointAction);

      if (actionType === "edit-account") {
        body.apiLimit = parseInt(newApiLimit, 10);
        body.status = actionPartner.status;
        body.trialStartDate = trialStart;
        body.trialExpiresAt = trialEnd;
      } else if (actionType === "email") {
        body.subject = emailSubject;
        body.message = emailMessage;
      }

      await requestJson(`/api/super-admin/partners/${actionPartner.id}/${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      toast.success(actionType === "edit-account" ? "Account updated" : (actionType === "email" ? "Email sent" : `Partner ${actionType}d`));
      fetchPartners();
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setActionPartner(null);
    setActionType(null);
    setActionReason("");
    setExtendDays("10");
    setNewApiLimit("10000");
    setTrialStart("");
    setTrialEnd("");
    setEmailSubject("");
    setEmailMessage("");
  };

  const getStatusBadge = (partner: Partner) => {
    switch (partner.status) {
      case "active":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Active</Badge>;
      case "trial":
        if (partner.isTrialExpired) {
          return <Badge variant="destructive"><Clock className="w-3 h-3 mr-1"/> Trial Expired</Badge>;
        }
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"><Clock className="w-3 h-3 mr-1"/> Trial</Badge>;
      case "inactive":
        return <Badge variant="outline" className="text-slate-500 border-slate-300"><Ban className="w-3 h-3 mr-1"/> Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-600"><ShieldAlert className="w-3 h-3 mr-1"/> Suspended</Badge>;
      default:
        return <Badge>{partner.status}</Badge>;
    }
  };

  const filteredPartners = partners.filter(p => 
    (p.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 w-full bg-background p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Partner Accounts
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage partner access, view usage, and control platform access.
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 max-w-sm w-full">
              <Search className="w-4 h-4 text-muted-foreground absolute ml-3" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <Activity className="h-8 w-8 animate-pulse mb-2 text-red-500/50" />
              Loading partners...
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No partners found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-3 px-4 font-medium text-muted-foreground">Partner</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">API Keys</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Total Usage</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Joined</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((partner) => (
                    <tr key={partner.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{partner.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{partner.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          {getStatusBadge(partner)}
                          {partner.status === "trial" && partner.trialExpiresAt && !partner.isTrialExpired && (
                            <span className="text-[10px] text-muted-foreground">
                              Ends {format(new Date(partner.trialExpiresAt), "MMM d")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{partner.activeApiKeyCount} active</span>
                          {partner.pendingApiKeyCount > 0 && (
                            <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                              {partner.pendingApiKeyCount} pending
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          out of {partner.apiKeyCount} total
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm">
                            {partner.apiUsage?.toLocaleString() || 0} / {partner.apiLimit?.toLocaleString() || 0}
                          </span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                ((partner.apiUsage || 0) / (partner.apiLimit || 1)) > 0.9 
                                  ? 'bg-red-500' 
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(((partner.apiUsage || 0) / (partner.apiLimit || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {format(new Date(partner.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            
                            {partner.status !== "active" && (
                              <DropdownMenuItem onClick={() => {
                                setActionPartner(partner);
                                setActionType("activate");
                              }}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                Activate Partner
                              </DropdownMenuItem>
                            )}

                             <DropdownMenuItem onClick={() => {
                                setActionPartner(partner);
                                setNewApiLimit((partner.apiLimit || 10000).toString());
                                setTrialStart(partner.trialStartDate ? partner.trialStartDate.split('T')[0] : "");
                                setTrialEnd(partner.trialExpiresAt ? partner.trialExpiresAt.split('T')[0] : "");
                                setActionType("edit-account");
                              }}>
                                <UserCog className="mr-2 h-4 w-4 text-indigo-500" />
                                Edit Account
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => {
                                setActionPartner(partner);
                                setActionType("email");
                                setEmailSubject("Notice from WallNet-Sec Admin");
                                setEmailMessage("");
                              }}>
                                <Mail className="mr-2 h-4 w-4 text-emerald-500" />
                                Send Email
                              </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            
                            {partner.status !== "inactive" && (
                              <DropdownMenuItem onClick={() => {
                                setActionPartner(partner);
                                setActionType("deactivate");
                              }}>
                                <Ban className="mr-2 h-4 w-4 text-slate-500" />
                                Deactivate Account
                              </DropdownMenuItem>
                            )}
                            
                            {partner.status !== "suspended" && (
                              <DropdownMenuItem 
                                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                onClick={() => {
                                  setActionPartner(partner);
                                  setActionType("suspend");
                                }}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Suspend (Security Issue)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog open={!!actionPartner} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
               {actionType === "activate" && "Activate Partner Account"}
              {actionType === "deactivate" && "Deactivate Partner Account"}
              {actionType === "suspend" && "Suspend Partner Account"}
              {actionType === "extend-trial" && "Extend Trial Period"}
              {actionType === "edit-account" && "Edit Partner Account"}
              {actionType === "email" && "Send Email to Partner"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "activate" && `You are about to activate ${actionPartner?.name}. Their approved API keys will become active immediately.`}
              {actionType === "deactivate" && `Deactivating will prevent ${actionPartner?.name} from logging in and disable ALL their API keys.`}
              {actionType === "suspend" && `Suspension is for security violations. It immediately locks ${actionPartner?.name} out and kills all API access.`}
              {actionType === "extend-trial" && `Add more days to ${actionPartner?.name}'s trial period.`}
              {actionType === "edit-account" && `Manage API limits, trial periods, and account status for ${actionPartner?.name}.`}
              {actionType === "email" && `Send a direct email notification to ${actionPartner?.email}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {(actionType === "deactivate" || actionType === "suspend") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for {actionType}</label>
                <Input 
                  placeholder={`Why is this account being ${actionType}d?`}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>
            )}
            
            {actionType === "extend-trial" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Days</label>
                <Input 
                  type="number"
                  min="1"
                  max="365"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                />
              </div>
            )}

            {actionType === "edit-account" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trial Start Date</label>
                    <Input 
                      type="date"
                      value={trialStart}
                      onChange={(e) => setTrialStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trial End Date</label>
                    <Input 
                      type="date"
                      value={trialEnd}
                      onChange={(e) => setTrialEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Limit</label>
                  <Input 
                    type="number"
                    value={newApiLimit}
                    onChange={(e) => setNewApiLimit(e.target.value)}
                  />
                </div>
              </div>
            )}

            {actionType === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input 
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message (Rich Text Editor)</label>
                  <div className="border border-border rounded-md overflow-hidden bg-background">
                    <div className="bg-muted/50 p-1.5 border-b border-border flex flex-wrap gap-1 items-center">
                      <Button variant="outline" size="sm" className="h-7 px-2 font-bold text-xs" onClick={() => document.execCommand('bold', false)}>B</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 italic text-xs font-serif" onClick={() => document.execCommand('italic', false)}>I</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 underline text-xs" onClick={() => document.execCommand('underline', false)}>U</Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] uppercase font-bold" onClick={() => document.execCommand('insertUnorderedList', false)}>List</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] uppercase font-bold" onClick={() => {
                        const url = prompt("Enter URL:");
                        if (url) document.execCommand('createLink', false, url);
                      }}>Link</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] uppercase font-bold" onClick={() => document.execCommand('removeFormat', false)}>Clear</Button>
                    </div>
                    <div 
                      contentEditable
                      onInput={(e) => setEmailMessage(e.currentTarget.innerHTML)}
                      className="min-h-[200px] p-4 outline-none text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none focus:ring-0"
                      dangerouslySetInnerHTML={{ __html: emailMessage }}
                      onBlur={(e) => setEmailMessage(e.currentTarget.innerHTML)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Formatting is converted to HTML for professional email delivery.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button 
              variant={actionType === "suspend" ? "destructive" : "default"}
              className={actionType === "activate" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              onClick={handleAction} 
              disabled={isSubmitting || ((actionType === "deactivate" || actionType === "suspend") && !actionReason)}
            >
              {isSubmitting ? "Processing..." : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
