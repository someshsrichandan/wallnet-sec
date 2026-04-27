"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
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
  MoreVertical,
  BarChart3,
  History,
  TrendingUp,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import TiptapEditor from "@/components/tiptap-editor";

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
import { Separator } from "@/components/ui/separator";
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
  const [actionType, setActionType] = useState<"activate" | "deactivate" | "suspend" | "extend-trial" | "edit-account" | "email" | "details" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePartnerDetails, setActivePartnerDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<any[]>([]);
  const [detailsRange, setDetailsRange] = useState("30d");

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("superAdminToken");
      if (!token) return;

      let url = "/api/super-admin/partners?limit=100";
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
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

  const fetchPartnerDetails = async (partner: Partner, rangeToUse?: string) => {
    try {
      setLoadingDetails(true);
      if (!rangeToUse) {
        setActionPartner(partner);
        setActionType("details");
      }
      const r = rangeToUse || detailsRange;
      const token = localStorage.getItem("superAdminToken");
      const result = await requestJson(`/api/super-admin/partners/${partner.id}?range=${r}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivePartnerDetails(result);
    } catch (error) {
      toast.error("Failed to load partner details");
    } finally {
      setLoadingDetails(false);
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
        body.attachments = emailAttachments;
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
    setEmailAttachments([]);
    setActivePartnerDetails(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Content = (event.target?.result as string).split(',')[1];
        setEmailAttachments(prev => [...prev, {
          filename: file.name,
          content: base64Content,
          contentType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== index));
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

  const filteredPartners = partners; // Using server-side filter now

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
            <div className="flex items-center gap-2 max-w-md w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchPartners()}
                />
              </div>
              <Button onClick={fetchPartners} size="sm" className="bg-red-600 hover:bg-red-700">
                Search
              </Button>
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
          ) : partners.length === 0 ? (
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
                  {partners.map((partner) => (
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
                                fetchPartnerDetails(partner);
                              }}>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                View Analytics
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => {
                                setActionPartner(partner);
                                setActionType("email");
                                setEmailSubject("Notice from WallNet-Sec Admin");
                                setEmailMessage("");
                              }}>
                                <Mail className="mr-2 h-4 w-4 text-emerald-500" />
                                Send Email
                              </DropdownMenuItem>

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
      <Dialog open={!!actionPartner && actionType !== "details"} onOpenChange={(open) => !open && closeModal()}>
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
                  <label className="text-sm font-medium">Message (Professional Editor)</label>
                  <TiptapEditor 
                    content={emailMessage}
                    onChange={setEmailMessage}
                  />
                </div>

                  {/* Attachment Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> Attachments
                      </label>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => document.getElementById('email-file-upload')?.click()}>
                        Add File
                      </Button>
                      <input 
                        id="email-file-upload"
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </div>
                    
                    {emailAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {emailAttachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md border border-border group">
                            {file.contentType.startsWith('image') ? <ImageIcon className="w-3 h-3 text-red-500" /> : <FileText className="w-3 h-3 text-blue-500" />}
                            <span className="text-[10px] font-medium max-w-[120px] truncate">{file.filename}</span>
                            <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground italic">PDFs and Images are supported as attachments.</p>
                </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            {actionType !== "details" && (
              <Button 
                variant={actionType === "activate" ? "default" : "destructive"}
                className={actionType === "activate" ? "bg-emerald-600 hover:bg-emerald-700" : (actionType === "email" ? "bg-red-600 hover:bg-red-700" : "")}
                onClick={handleAction} 
                disabled={isSubmitting || ((actionType === "deactivate" || actionType === "suspend") && !actionReason)}
              >
                {isSubmitting ? "Processing..." : `Confirm ${actionType}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog (Large) */}
      <Dialog open={actionType === "details"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                Partner Performance: {actionPartner?.name}
              </DialogTitle>
              <DialogDescription>
                Detailed API usage history and security audit logs for this account.
              </DialogDescription>
            </div>
            <div className="flex bg-muted p-1 rounded-md mr-8">
              {[
                { label: "1D", value: "1d" },
                { label: "7D", value: "7d" },
                { label: "30D", value: "30d" },
                { label: "1Y", value: "1y" },
                { label: "ALL", value: "total" }
              ].map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => {
                    setDetailsRange(btn.value);
                    if (actionPartner) fetchPartnerDetails(actionPartner, btn.value);
                  }}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all ${
                    detailsRange === btn.value 
                      ? "bg-background text-red-600 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="h-10 w-10 animate-pulse text-red-500/50 mb-4" />
              Loading analytics data...
            </div>
          ) : (
            activePartnerDetails && (
              <div className="space-y-8 py-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Total Usage</p>
                    <p className="text-2xl font-bold">{(activePartnerDetails.partner?.apiUsage || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">out of {(activePartnerDetails.partner?.apiLimit || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Active Keys</p>
                    <p className="text-2xl font-bold">{activePartnerDetails.apiKeys.filter((k: any) => k.active).length}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Total {activePartnerDetails.apiKeys.length} generated</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Account Status</p>
                    <Badge variant={activePartnerDetails.partner.status === "active" ? "default" : "secondary"}>
                      {activePartnerDetails.partner.status.toUpperCase()}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">Created {format(parseISO(activePartnerDetails.partner.createdAt), "MMM d, yyyy")}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Usage Chart */}
                <div>
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Top Keys by Usage
                  </h4>
                  <div className="h-[200px] w-full bg-muted/20 rounded-lg p-4 border border-border/50">
                    {activePartnerDetails.keyUsageStats?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activePartnerDetails.keyUsageStats} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                          <XAxis type="number" fontSize={10} hide />
                          <YAxis dataKey="name" type="category" fontSize={10} width={60} axisLine={false} tickLine={false} />
                          <ChartTooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="usage" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-[10px]">No key activity.</div>
                    )}
                  </div>
                </div>

                {/* Security Severity Chart */}
                <div>
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Alert Severity Distribution
                  </h4>
                  <div className="h-[200px] w-full bg-muted/20 rounded-lg p-4 border border-border/50">
                    {activePartnerDetails.logStats?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={activePartnerDetails.logStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {activePartnerDetails.logStats.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name === 'high' ? '#ef4444' : (entry.name === 'medium' ? '#f59e0b' : '#3b82f6')} 
                              />
                            ))}
                          </Pie>
                          <ChartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-[10px]">No security logs.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div>
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Security & Activity Audit
                </h4>
                <div className="border border-border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-medium">Action</th>
                        <th className="p-2 text-left font-medium">Severity</th>
                        <th className="p-2 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePartnerDetails.recentLogs.length > 0 ? (
                        activePartnerDetails.recentLogs.map((log: any) => (
                          <tr key={log._id} className="border-t border-border hover:bg-muted/20">
                            <td className="p-2 font-medium">{log.action.replace(/_/g, ' ')}</td>
                            <td className="p-2">
                              <Badge variant={log.severity === "high" ? "destructive" : (log.severity === "medium" ? "outline" : "secondary")} className="text-[9px] h-4">
                                {log.severity}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted-foreground">{format(parseISO(log.createdAt), "MMM d, HH:mm")}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-muted-foreground">No recent activity logs.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
          
          <DialogFooter>
            <Button onClick={closeModal}>Close Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
