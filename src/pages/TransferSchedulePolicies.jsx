import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function TransferSchedulePolicies() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState({
    season_name: "",
    policy_type: "dispatch_schedule",
    start_date: "",
    end_date: "",
    allowed_days: [],
    allowed_time_slots: [],
    allowed_transfer_reasons: [],
    is_active: true
  });
  const [daySelections, setDaySelections] = useState({
    Sunday: false,
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false
  });
  const [timeSlotInput, setTimeSlotInput] = useState("");

  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['schedule-policies'],
    queryFn: () => base44.entities.TransferSchedulePolicy.list('-start_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TransferSchedulePolicy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-policies'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransferSchedulePolicy.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-policies'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TransferSchedulePolicy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-policies'] });
    },
  });

  const resetForm = () => {
    setFormData({
      season_name: "",
      policy_type: "dispatch_schedule",
      start_date: "",
      end_date: "",
      allowed_days: [],
      allowed_time_slots: [],
      allowed_transfer_reasons: [],
      is_active: true
    });
    setDaySelections({
      Sunday: false,
      Monday: false,
      Tuesday: false,
      Wednesday: false,
      Thursday: false,
      Friday: false,
      Saturday: false
    });
    setTimeSlotInput("");
    setEditingPolicy(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      season_name: policy.season_name || "",
      policy_type: policy.policy_type || "dispatch_schedule",
      start_date: policy.start_date || "",
      end_date: policy.end_date || "",
      allowed_days: policy.allowed_days || [],
      allowed_time_slots: policy.allowed_time_slots || [],
      allowed_transfer_reasons: policy.allowed_transfer_reasons || [],
      is_active: policy.is_active !== false
    });
    
    const newDaySelections = {
      Sunday: false,
      Monday: false,
      Tuesday: false,
      Wednesday: false,
      Thursday: false,
      Friday: false,
      Saturday: false
    };
    (policy.allowed_days || []).forEach(day => {
      newDaySelections[day] = true;
    });
    setDaySelections(newDaySelections);
    
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this schedule policy?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleDayToggle = (day) => {
    setDaySelections(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleAddTimeSlot = () => {
    if (timeSlotInput && !formData.allowed_time_slots.includes(timeSlotInput)) {
      setFormData(prev => ({
        ...prev,
        allowed_time_slots: [...prev.allowed_time_slots, timeSlotInput].sort()
      }));
      setTimeSlotInput("");
    }
  };

  const handleRemoveTimeSlot = (slot) => {
    setFormData(prev => ({
      ...prev,
      allowed_time_slots: prev.allowed_time_slots.filter(s => s !== slot)
    }));
  };

  const handleSubmit = async () => {
    const selectedDays = Object.keys(daySelections).filter(day => daySelections[day]);
    
    const submitData = {
      ...formData,
      allowed_days: selectedDays
    };

    if (!submitData.season_name || !submitData.start_date || !submitData.end_date || selectedDays.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    // Time slots only required for dispatch schedule
    if (submitData.policy_type === 'dispatch_schedule' && submitData.allowed_time_slots.length === 0) {
      alert("Please add at least one time slot for dispatch schedule policy");
      return;
    }

    if (editingPolicy) {
      await updateMutation.mutateAsync({ id: editingPolicy.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  // Determine which policy is currently active
  const getActivePolicyId = () => {
    const today = new Date();
    const currentMonthDay = format(today, 'MM-dd');
    
    const activePolicy = policies.find(policy => {
      if (!policy.is_active) return false;
      
      const startDate = policy.start_date.substring(5);
      const endDate = policy.end_date.substring(5);
      
      if (startDate <= endDate) {
        return currentMonthDay >= startDate && currentMonthDay <= endDate;
      } else {
        return currentMonthDay >= startDate || currentMonthDay <= endDate;
      }
    });
    
    return activePolicy?.id;
  };

  const activePolicyId = getActivePolicyId();

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedule policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transfer Schedule Policies</h1>
            <p className="text-gray-600 mt-1">Manage seasonal transfer schedules (days and time slots)</p>
          </div>
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Schedule Policy
          </Button>
        </div>

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>How it works:</strong> Define different transfer policies for different seasons (e.g., Summer, Winter). 
            The system automatically applies the correct policy based on the current date.<br/>
            <strong>Dispatch Schedule:</strong> Controls when transfers can be dispatched (date/time restrictions).<br/>
            <strong>Initiation Control:</strong> Blocks transfer request creation outside allowed days/times.
          </AlertDescription>
        </Alert>

        {/* Policies List */}
        <div className="grid gap-4">
          {policies.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">No Schedule Policies</p>
                <p className="text-sm text-gray-500 mt-2">Create your first schedule policy to get started</p>
              </CardContent>
            </Card>
          ) : (
            policies.map(policy => {
              const isCurrentlyActive = policy.id === activePolicyId;
              
              return (
                <Card key={policy.id} className={`border-none shadow-lg ${isCurrentlyActive ? 'border-l-4 border-l-green-600' : ''}`}>
                  <CardHeader className={`${isCurrentlyActive ? 'bg-green-50' : 'bg-gray-50'} border-b`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className={`w-5 h-5 ${isCurrentlyActive ? 'text-green-600' : 'text-gray-600'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{policy.season_name}</CardTitle>
                            <Badge variant="outline" className={policy.policy_type === 'initiation_control' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}>
                              {policy.policy_type === 'initiation_control' ? 'Initiation Control' : 'Dispatch Schedule'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {format(new Date(policy.start_date), 'MMM dd')} - {format(new Date(policy.end_date), 'MMM dd')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentlyActive && (
                          <Badge className="bg-green-600">Currently Active</Badge>
                        )}
                        {!policy.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(policy)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(policy.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Allowed Days</Label>
                        <div className="flex flex-wrap gap-2">
                          {(policy.allowed_days || []).map(day => (
                            <Badge key={day} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {day}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Time Slots</Label>
                        <div className="flex flex-wrap gap-2">
                          {(policy.allowed_time_slots || []).map(slot => (
                            <Badge key={slot} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {slot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Allowed Transfer Reasons</Label>
                      <div className="flex flex-wrap gap-2">
                        {(policy.allowed_transfer_reasons || []).length === 0 ? (
                          <span className="text-sm text-gray-500">All reasons allowed</span>
                        ) : (
                          (policy.allowed_transfer_reasons || []).map(reason => (
                            <Badge key={reason} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {reason.replace(/_/g, ' ')}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Edit Schedule Policy' : 'Add Schedule Policy'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Season Name */}
            <div>
              <Label htmlFor="season_name">Season Name*</Label>
              <Input
                id="season_name"
                placeholder="e.g., Summer Schedule, Winter Schedule"
                value={formData.season_name}
                onChange={(e) => setFormData(prev => ({ ...prev, season_name: e.target.value }))}
              />
            </div>

            {/* Policy Type */}
            <div>
              <Label htmlFor="policy_type">Policy Type*</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  type="button"
                  variant={formData.policy_type === "dispatch_schedule" ? "default" : "outline"}
                  className={formData.policy_type === "dispatch_schedule" ? "bg-blue-600" : ""}
                  onClick={() => setFormData(prev => ({ ...prev, policy_type: "dispatch_schedule" }))}
                >
                  📅 Dispatch Schedule
                </Button>
                <Button
                  type="button"
                  variant={formData.policy_type === "initiation_control" ? "default" : "outline"}
                  className={formData.policy_type === "initiation_control" ? "bg-orange-600" : ""}
                  onClick={() => setFormData(prev => ({ ...prev, policy_type: "initiation_control" }))}
                >
                  🚫 Initiation Control
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.policy_type === "dispatch_schedule" 
                  ? "Controls when transfers can be dispatched (date/time restrictions)"
                  : "Controls when transfer requests can be initiated (blocks creation outside allowed times)"}
              </p>
            </div>

            {/* Date Range */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date (MM-DD)*</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Use any year, only month-day matters</p>
              </div>
              <div>
                <Label htmlFor="end_date">End Date (MM-DD)*</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Can wrap around year (e.g., Dec to Feb)</p>
              </div>
            </div>

            {/* Allowed Days */}
            <div>
              <Label className="mb-2 block">Allowed Days*</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(daySelections).map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={daySelections[day] ? "default" : "outline"}
                    className={daySelections[day] ? "bg-blue-600" : ""}
                    onClick={() => handleDayToggle(day)}
                  >
                    {day.substring(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Slots - Only for dispatch schedule */}
            {formData.policy_type === "dispatch_schedule" && (
              <div>
                <Label className="mb-2 block">Time Slots*</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="time"
                    placeholder="e.g., 14:30"
                    value={timeSlotInput}
                    onChange={(e) => setTimeSlotInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTimeSlot()}
                  />
                  <Button type="button" onClick={handleAddTimeSlot}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.allowed_time_slots.map(slot => (
                    <Badge key={slot} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {slot}
                      <button
                        onClick={() => handleRemoveTimeSlot(slot)}
                        className="ml-2 text-purple-900 hover:text-purple-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Allowed Transfer Reasons */}
            <div>
              <Label className="mb-2 block">Allowed Transfer Reasons (optional - leave empty to allow all)</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'onboarding_transfer', label: 'Onboarding Transfer' },
                  { value: 'project_transfer', label: 'Project Transfer' },
                  { value: 'roommate_issue', label: 'Roommate Issue' },
                  { value: 'camp_environment', label: 'Camp Environment' },
                  { value: 'urgent_requirement', label: 'Urgent Requirement' },
                  { value: 'camp_closure', label: 'Camp Closure' },
                  { value: 'skill_requirement', label: 'Skill Requirement' },
                  { value: 'personal_request', label: 'Personal Request' },
                  { value: 'disciplinary', label: 'Disciplinary' },
                  { value: 'exit_case', label: 'Exit Case' }
                ].map(reason => (
                  <Button
                    key={reason.value}
                    type="button"
                    variant={formData.allowed_transfer_reasons.includes(reason.value) ? "default" : "outline"}
                    className={`text-xs ${formData.allowed_transfer_reasons.includes(reason.value) ? "bg-green-600" : ""}`}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        allowed_transfer_reasons: prev.allowed_transfer_reasons.includes(reason.value)
                          ? prev.allowed_transfer_reasons.filter(r => r !== reason.value)
                          : [...prev.allowed_transfer_reasons, reason.value]
                      }));
                    }}
                  >
                    {reason.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (policy will be applied when dates match)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}