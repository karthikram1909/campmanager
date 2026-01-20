import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Clock, AlertTriangle, Plus, Edit, Trash2, Play, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SlaManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState({
    request_type: "transfer_request",
    policy_name: "",
    target_completion_hours: 24,
    escalation_level_1_hours: 18,
    escalation_level_2_hours: 30,
    escalation_level_1_emails: "",
    escalation_level_2_emails: "",
    is_active: true,
    auto_send_emails: false,
    description: ""
  });

  const queryClient = useQueryClient();

  const { data: slaPolicies = [] } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_policies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: slaLogs = [] } = useQuery({
    queryKey: ['sla-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (data) => {
      const { data: newPolicy, error } = await supabase
        .from('sla_policies')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return newPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      alert(`Error creating policy: ${error.message}`);
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('sla_policies')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      alert(`Error updating policy: ${error.message}`);
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('sla_policies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
    },
  });

  const runSlaCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('checkSlaAndEscalate', {});
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setFormData({
      request_type: "transfer_request",
      policy_name: "",
      target_completion_hours: 24,
      escalation_level_1_hours: 18,
      escalation_level_2_hours: 30,
      escalation_level_1_emails: "",
      escalation_level_2_emails: "",
      is_active: true,
      auto_send_emails: false,
      description: ""
    });
    setEditingPolicy(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPolicy) {
      updatePolicyMutation.mutate({ id: editingPolicy.id, data: formData });
    } else {
      createPolicyMutation.mutate(formData);
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      request_type: policy.request_type,
      policy_name: policy.policy_name,
      target_completion_hours: policy.target_completion_hours,
      escalation_level_1_hours: policy.escalation_level_1_hours || 0,
      escalation_level_2_hours: policy.escalation_level_2_hours || 0,
      escalation_level_1_emails: policy.escalation_level_1_emails || "",
      escalation_level_2_emails: policy.escalation_level_2_emails || "",
      is_active: policy.is_active ?? true,
      auto_send_emails: policy.auto_send_emails ?? false,
      description: policy.description || ""
    });
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this SLA policy?")) {
      deletePolicyMutation.mutate(id);
    }
  };

  const handleRunCheck = async () => {
    try {
      const result = await runSlaCheckMutation.mutateAsync();
      alert(`SLA check completed:\n\nChecked: ${result.data.results.checked}\nEscalated: ${result.data.results.escalated}\nBreached: ${result.data.results.breached}`);
      queryClient.invalidateQueries({ queryKey: ['sla-logs'] });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const breachedCount = slaLogs.filter(log => log.is_breached && !log.completed_date).length;
  const escalatedCount = slaLogs.filter(log => log.escalation_level > 0 && !log.completed_date).length;

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SLA Management</h1>
            <p className="text-gray-600 mt-1">Define and monitor service level agreements</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRunCheck} variant="outline" disabled={runSlaCheckMutation.isPending}>
              <Play className="w-4 h-4 mr-2" />
              {runSlaCheckMutation.isPending ? 'Running...' : 'Run SLA Check'}
            </Button>
            <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add SLA Policy
            </Button>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Note:</strong> Set <code>auto_send_emails</code> to false to monitor SLAs without sending automatic escalation emails. Enable it when ready to enforce.
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-blue-100 to-blue-50">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-10 h-10 text-blue-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-900">{slaPolicies.filter(p => p.is_active).length}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Active Policies</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-orange-100 to-orange-50">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-10 h-10 text-orange-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-orange-900">{escalatedCount}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Escalated</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-400 to-red-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-red-100 to-red-50">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-10 h-10 text-red-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-900">{breachedCount}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">SLA Breached</p>
            </CardContent>
          </Card>
        </div>

        {/* Policies List */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle>SLA Policies</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {slaPolicies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No SLA policies defined yet</p>
                </div>
              ) : (
                slaPolicies.map(policy => (
                  <Card key={policy.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{policy.policy_name}</h3>
                            <Badge className={policy.is_active ? 'bg-green-600' : 'bg-gray-400'}>
                              {policy.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {policy.auto_send_emails && (
                              <Badge className="bg-blue-600">Auto Email ON</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">Request Type</p>
                              <p className="font-medium">{policy.request_type.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Target Completion</p>
                              <p className="font-medium">{policy.target_completion_hours}h</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Level 1 Escalation</p>
                              <p className="font-medium">{policy.escalation_level_1_hours || '-'}h</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Level 2 Escalation</p>
                              <p className="font-medium">{policy.escalation_level_2_hours || '-'}h</p>
                            </div>
                          </div>
                          {policy.description && (
                            <p className="text-sm text-gray-600 mt-2">{policy.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(policy.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit SLA Policy' : 'Add SLA Policy'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Request Type*</Label>
                <Select value={formData.request_type} onValueChange={(value) => setFormData({ ...formData, request_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer_request">Transfer Request</SelectItem>
                    <SelectItem value="leave_request">Leave Request</SelectItem>
                    <SelectItem value="maintenance_request">Maintenance Request</SelectItem>
                    <SelectItem value="meal_preference_change">Meal Preference Change</SelectItem>
                    <SelectItem value="document_renewal">Document Renewal</SelectItem>
                    <SelectItem value="visitor_request">Visitor Request</SelectItem>
                    <SelectItem value="onboarding_technician">Onboarding Technician</SelectItem>
                    <SelectItem value="airport_pickup">Airport Pickup</SelectItem>
                    <SelectItem value="sajja_induction">Sajja Induction</SelectItem>
                    <SelectItem value="camp_induction">Camp Induction</SelectItem>
                    <SelectItem value="disciplinary_action">Disciplinary Action</SelectItem>
                    <SelectItem value="medical_record">Medical Record</SelectItem>
                    <SelectItem value="event_registration">Event Registration</SelectItem>
                    <SelectItem value="appointment_management">Appointment Management</SelectItem>
                    <SelectItem value="camp_hiring_request">Camp Hiring Request</SelectItem>
                    <SelectItem value="camp_renewal_request">Camp Renewal Request</SelectItem>
                    <SelectItem value="camp_audit">Camp Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Policy Name*</Label>
                <Input
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  placeholder="e.g., Standard Transfer SLA"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Target Completion (hours)*</Label>
                <Input
                  type="number"
                  value={formData.target_completion_hours}
                  onChange={(e) => setFormData({ ...formData, target_completion_hours: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Level 1 Escalation (hours)</Label>
                <Input
                  type="number"
                  value={formData.escalation_level_1_hours}
                  onChange={(e) => setFormData({ ...formData, escalation_level_1_hours: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Level 2 Escalation (hours)</Label>
                <Input
                  type="number"
                  value={formData.escalation_level_2_hours}
                  onChange={(e) => setFormData({ ...formData, escalation_level_2_hours: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Level 1 Escalation Emails (comma-separated)</Label>
              <Input
                value={formData.escalation_level_1_emails}
                onChange={(e) => setFormData({ ...formData, escalation_level_1_emails: e.target.value })}
                placeholder="manager@example.com, supervisor@example.com"
              />
            </div>

            <div>
              <Label>Level 2 Escalation Emails (comma-separated)</Label>
              <Input
                value={formData.escalation_level_2_emails}
                onChange={(e) => setFormData({ ...formData, escalation_level_2_emails: e.target.value })}
                placeholder="director@example.com, admin@example.com"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this SLA policy..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label>Active Policy</Label>
                <p className="text-xs text-gray-600">Enable this SLA policy</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div>
                <Label className="text-yellow-900">Auto Send Escalation Emails</Label>
                <p className="text-xs text-yellow-700">Enable to automatically send emails when SLA is breached</p>
              </div>
              <Switch
                checked={formData.auto_send_emails}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_send_emails: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPolicyMutation.isPending || updatePolicyMutation.isPending}>
                {editingPolicy ? 'Update Policy' : 'Create Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}