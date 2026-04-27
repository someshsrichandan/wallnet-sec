"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Activity,
  AlertCircle
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requestJson } from "@/lib/http";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ApiKey = {
  id: string;
  keyId: string;
  partnerId: string;
  mode: string;
  approvalStatus: "pending" | "approved" | "rejected";
  active: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  ownerStatus: string;
};

type ApiKeysResponse = {
  items: ApiKey[];
  total: number;
};

export default function ApiKeysApprovalPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  
  const [actionKey, setActionKey] = useState<ApiKey | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("superAdminToken");
      if (!token) return;

      let url = "/api/super-admin/api-keys?limit=100";
      if (statusFilter !== "all") url += `&approvalStatus=${statusFilter}`;
      
      const result = await requestJson<ApiKeysResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKeys(result.items);
    } catch (error) {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [statusFilter]);

  const handleAction = async () => {
    if (!actionKey || !actionType) return;
    
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("superAdminToken");
      
      const body: any = {};
      if (actionType === "reject") {
        body.reason = rejectReason;
      }

      await requestJson(`/api/super-admin/api-keys/${actionKey.id}/${actionType}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      toast.success(`API key ${actionType}d successfully`);
      fetchKeys();
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setActionKey(null);
    setActionType(null);
    setRejectReason("");
  };

  return (
    <div className="flex-1 w-full bg-background p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            API Key Approvals
          </h2>
          <p className="text-muted-foreground mt-2">
            Review and approve partner requests for production API access.
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Generated Keys</CardTitle>
            <select 
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Keys</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <Activity className="h-8 w-8 animate-pulse mb-2 text-red-500/50" />
              Loading API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No API keys found for the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-3 px-4 font-medium text-muted-foreground">Key ID</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Partner App</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Owner</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Mode</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Created</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs">{key.keyId}</td>
                      <td className="py-3 px-4 font-medium">{key.partnerId}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{key.ownerName}</div>
                        <div className="text-xs text-muted-foreground">Account: {key.ownerStatus}</div>
                      </td>
                      <td className="py-3 px-4">
                        {key.approvalStatus === "approved" && <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>}
                        {key.approvalStatus === "pending" && <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>}
                        {key.approvalStatus === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={key.mode === "live" ? "default" : "secondary"}>
                          {key.mode}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {format(new Date(key.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {key.approvalStatus === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 h-8"
                              onClick={() => {
                                setActionKey(key);
                                setActionType("approve");
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1"/> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="h-8"
                              onClick={() => {
                                setActionKey(key);
                                setActionType("reject");
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1"/> Reject
                            </Button>
                          </>
                        )}
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
      <Dialog open={!!actionKey} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve API Key" : "Reject API Key"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" ? 
                `Are you sure you want to approve this API key for ${actionKey?.partnerId}? It will become active immediately.` : 
                `Are you sure you want to reject this API key? It will remain permanently disabled.`
              }
            </DialogDescription>
          </DialogHeader>

          {actionType === "reject" && (
            <div className="py-4 space-y-2">
              <label className="text-sm font-medium">Reason for rejection (Optional)</label>
              <Input 
                placeholder="e.g., App does not meet security requirements"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button 
              variant={actionType === "reject" ? "destructive" : "default"}
              className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              onClick={handleAction} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
