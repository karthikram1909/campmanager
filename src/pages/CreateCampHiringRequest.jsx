import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowLeft, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CreateCampHiringRequest() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    required_capacity: '',
    period_start_date: '',
    period_end_date: '',
    reason: '',
    reason_details: '',
    notes: ''
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      // Try to get current user, default to Guest if not logged in
      let userId = null;
      let userName = 'Guest';
      try {
        const user = await base44.auth.me();
        userId = user.id;
        userName = user.email || 'Unknown User';
      } catch (err) {
        console.warn("User not authenticated, submitting as Guest");
      }

      // Determine initial status based on reason
      const initialStatus = data.reason === 'manpower_increase'
        ? 'pending_manpower_control'
        : 'pending_initial_approval';

      return base44.entities.CampHiringRequest.create({
        ...data,
        status: initialStatus,
        requested_by_user_id: userId,
        created_by: userName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-hiring-requests'] });
      alert("✅ Camp hiring request submitted successfully!");
      navigate(createPageUrl("CampHiringRequests"));
    },
    onError: (error) => {
      console.error("Error submitting request:", error);
      alert(`❌ Error submitting request: ${error.message || "Unknown error occurred"}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.required_capacity || formData.required_capacity <= 0) {
      alert("Please enter a valid capacity (greater than 0)");
      return;
    }

    if (!formData.period_start_date || !formData.period_end_date) {
      alert("Please provide both start and end dates for the requirement period");
      return;
    }

    if (new Date(formData.period_start_date) >= new Date(formData.period_end_date)) {
      alert("End date must be after start date");
      return;
    }

    if (!formData.reason) {
      alert("Please select a reason for this request");
      return;
    }

    createRequestMutation.mutate({
      ...formData,
      required_capacity: parseInt(formData.required_capacity)
    });
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("CampHiringRequests"))}
            className="border-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Camp Hiring Request</h1>
              <p className="text-gray-600 mt-1">Submit a request for temporary residence camp</p>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-900">
            <strong>Workflow:</strong> Your request will be routed based on the reason selected.
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              <li><strong>Manpower Increase:</strong> Goes to Manpower Control → Initial Approval → Audits → Procurement → CPO</li>
              <li><strong>Other Reasons:</strong> Goes directly to Initial Approval → Audits → Procurement → CPO</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Form */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Required Capacity (Beds)*</Label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={formData.required_capacity}
                    onChange={(e) => setFormData({ ...formData, required_capacity: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reason for Request*</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(val) => setFormData({ ...formData, reason: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manpower_increase">Manpower Increase</SelectItem>
                      <SelectItem value="expiry">Current Camp Expiry</SelectItem>
                      <SelectItem value="relocation">Relocation</SelectItem>
                      <SelectItem value="expansion">Project Expansion</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason Details*</Label>
                <Textarea
                  required
                  value={formData.reason_details}
                  onChange={(e) => setFormData({ ...formData, reason_details: e.target.value })}
                  placeholder="Provide detailed explanation for this camp hiring request..."
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Period Start Date*</Label>
                  <Input
                    type="date"
                    required
                    value={formData.period_start_date}
                    onChange={(e) => setFormData({ ...formData, period_start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Period End Date*</Label>
                  <Input
                    type="date"
                    required
                    value={formData.period_end_date}
                    onChange={(e) => setFormData({ ...formData, period_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information or special requirements..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("CampHiringRequests"))}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createRequestMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}