import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Utensils, CheckCircle2, AlertCircle, User, Clock, FileText, Plus } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function MyMealPreferences() {
  const [showRequestChangeDialog, setShowRequestChangeDialog] = useState(false);
  const [selectedNewPreference, setSelectedNewPreference] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
  });

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['meal-preference-change-requests'],
    queryFn: () => base44.entities.MealPreferenceChangeRequest.list('-request_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createChangeRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.MealPreferenceChangeRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-preference-change-requests'] });
      setShowRequestChangeDialog(false);
      setSelectedNewPreference("");
      setChangeReason("");
      alert("✅ Change request submitted successfully! Your camp boss will review it.");
    },
  });

  // Find current person by email
  const myTechnician = technicians.find(t => t.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const myExternal = externalPersonnel.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const myPerson = myTechnician || myExternal;
  const personType = myTechnician ? 'technician' : 'external';

  // Get current meal preference
  const currentMealPreference = mealPreferences.find(mp => mp.id === myPerson?.meal_preference_id);
  const myCamp = camps.find(c => c.id === myPerson?.camp_id);

  // Get all my change requests
  const myChangeRequests = changeRequests.filter(req => 
    (personType === 'technician' && req.technician_id === myPerson?.id) ||
    (personType === 'external' && req.external_personnel_id === myPerson?.id)
  );

  // Find pending request
  const pendingRequest = myChangeRequests.find(req => req.status === 'pending_approval');

  // Get approved change history
  const myChangeHistory = myChangeRequests.filter(req => req.status === 'approved');

  // Check if last approved change was within 30 days
  const canRequestChange = () => {
    if (pendingRequest) return false; // Already has pending request
    
    if (myChangeHistory.length === 0) return true; // No previous changes
    
    const lastApprovalDate = myChangeHistory[0]?.approval_date;
    if (!lastApprovalDate) return true;
    
    const daysSinceLastChange = differenceInDays(new Date(), parseISO(lastApprovalDate));
    return daysSinceLastChange >= 30;
  };

  const getDaysUntilNextChange = () => {
    if (myChangeHistory.length === 0) return 0;
    
    const lastApprovalDate = myChangeHistory[0]?.approval_date;
    if (!lastApprovalDate) return 0;
    
    const daysSinceLastChange = differenceInDays(new Date(), parseISO(lastApprovalDate));
    return Math.max(0, 30 - daysSinceLastChange);
  };

  const handleSubmitChangeRequest = async () => {
    if (!selectedNewPreference) {
      alert("Please select a new meal preference");
      return;
    }

    if (!changeReason.trim()) {
      alert("Please provide a reason for the change");
      return;
    }

    if (selectedNewPreference === myPerson?.meal_preference_id) {
      alert("Selected preference is the same as your current preference");
      return;
    }

    const requestData = {
      current_meal_preference_id: myPerson?.meal_preference_id,
      requested_meal_preference_id: selectedNewPreference,
      request_date: format(new Date(), 'yyyy-MM-dd'),
      reason: changeReason,
      status: 'pending_approval'
    };

    if (personType === 'technician') {
      requestData.technician_id = myPerson.id;
    } else {
      requestData.external_personnel_id = myPerson.id;
    }

    createChangeRequestMutation.mutate(requestData);
  };

  const availablePreferences = mealPreferences.filter(mp => mp.is_active);

  if (isLoadingUser) {
    return (
      <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-green-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading your information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!myPerson) {
    return (
      <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-green-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Your Profile</h2>
              <p className="text-gray-600 mb-6">
                We couldn't find your personnel record in the system. This could be because:
              </p>
              <ul className="text-left max-w-md mx-auto space-y-2 text-gray-700 mb-6">
                <li>• Your email ({currentUser?.email}) is not linked to a personnel record</li>
                <li>• Your account hasn't been set up yet</li>
                <li>• There's a mismatch between your login email and your personnel email</li>
              </ul>
              <p className="text-gray-600">
                Please contact your administrator or camp boss to resolve this issue.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ backgroundColor: '#F8F9FD' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3BB273' }}>
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#333333' }}>My Meal Preferences</h1>
              <p style={{ color: '#6C717C' }}>View and request meal preference changes</p>
            </div>
          </div>
          <Button
            onClick={() => setShowRequestChangeDialog(true)}
            disabled={!canRequestChange()}
            className="hover:opacity-90"
            style={{ backgroundColor: '#FFE7E1', color: '#333333' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Request Change
          </Button>
        </div>

        {/* Policy Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Meal Preference Change Policy:</strong> Changes are allowed once every 30 days. Submit your request, and your camp boss will approve it after collecting your old meal coupons.
          </AlertDescription>
        </Alert>

        {/* Pending Request Alert */}
        {pendingRequest && (
          <Alert className="bg-yellow-50 border-yellow-300">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Pending Change Request</strong><br/>
              You have a pending request to change from <strong>{mealPreferences.find(mp => mp.id === pendingRequest.current_meal_preference_id)?.name}</strong> to <strong>{mealPreferences.find(mp => mp.id === pendingRequest.requested_meal_preference_id)?.name}</strong>.<br/>
              Submitted on {format(parseISO(pendingRequest.request_date), 'MMM dd, yyyy')}. Waiting for camp boss approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Next Change Available Alert */}
        {!canRequestChange() && !pendingRequest && getDaysUntilNextChange() > 0 && (
          <Alert className="bg-orange-50 border-orange-300">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Change Restricted</strong><br/>
              You can request another meal preference change in <strong>{getDaysUntilNextChange()} day(s)</strong> (30-day waiting period).
            </AlertDescription>
          </Alert>
        )}

        {/* Current Preference Card */}
        <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
          <CardHeader className="rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '48px', display: 'flex', alignItems: 'center' }}>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Current Meal Preference
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Full Name</p>
                  <p className="font-semibold text-lg">{myPerson.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Camp</p>
                  <p className="font-semibold text-lg">{myCamp?.name || '-'}</p>
                </div>
                {personType === 'technician' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Employee ID</p>
                    <p className="font-semibold text-lg">{myPerson.employee_id}</p>
                  </div>
                )}
                {personType === 'external' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Company</p>
                    <p className="font-semibold text-lg">{myPerson.company_name}</p>
                  </div>
                )}
              </div>

              <div className="p-6 rounded-xl" style={{ backgroundColor: '#E4F1D2', border: '2px solid #3BB273' }}>
                <p className="text-sm mb-2" style={{ color: '#333333', fontWeight: '500' }}>Your Current Meal Preference</p>
                {currentMealPreference ? (
                  <div>
                    <h3 className="text-2xl font-bold mb-2" style={{ color: '#333333' }}>{currentMealPreference.name}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={currentMealPreference.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}>
                        {currentMealPreference.type === 'veg' ? '🥗 Vegetarian' : '🍗 Non-Vegetarian'}
                      </Badge>
                      <Badge variant="outline" className="bg-white">
                        {currentMealPreference.cuisine?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {currentMealPreference.description && (
                      <p className="text-sm mt-3" style={{ color: '#6C717C' }}>{currentMealPreference.description}</p>
                    )}
                  </div>
                ) : (
                  <p className="font-semibold" style={{ color: '#333333' }}>No meal preference set</p>
                )}
              </div>

              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>Important:</strong> When changing your meal preference, you must submit your old meal coupons to your camp boss and receive new coupons for {myCamp?.name || 'your camp'}.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Change History */}
        {myChangeHistory.length > 0 && (
          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
            <CardHeader className="rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '48px', display: 'flex', alignItems: 'center' }}>
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Change History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {myChangeHistory.map((change) => {
                  const oldPref = mealPreferences.find(mp => mp.id === change.current_meal_preference_id);
                  const newPref = mealPreferences.find(mp => mp.id === change.requested_meal_preference_id);
                  const approver = users.find(u => u.id === change.approved_by_id);

                  return (
                    <div key={change.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">
                              {change.approval_date ? format(parseISO(change.approval_date), 'MMM dd, yyyy') : 'Date unknown'}
                            </span>
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                              Approved
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            Changed from <strong>{oldPref?.name || 'Unknown'}</strong> to <strong>{newPref?.name || 'Unknown'}</strong>
                          </div>
                          {change.reason && (
                            <p className="text-xs text-gray-500 mt-1">Reason: {change.reason}</p>
                          )}
                          {approver && (
                            <p className="text-xs text-gray-500 mt-1">Approved by: {approver.full_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejected Requests */}
        {myChangeRequests.some(req => req.status === 'rejected') && (
          <Card className="border-none shadow-lg border-l-4 border-l-red-500">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Rejected Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {myChangeRequests.filter(req => req.status === 'rejected').map((change) => {
                  const oldPref = mealPreferences.find(mp => mp.id === change.current_meal_preference_id);
                  const newPref = mealPreferences.find(mp => mp.id === change.requested_meal_preference_id);
                  const approver = users.find(u => u.id === change.approved_by_id);

                  return (
                    <div key={change.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-gray-700">
                              {change.request_date ? format(parseISO(change.request_date), 'MMM dd, yyyy') : 'Date unknown'}
                            </span>
                            <Badge variant="destructive" className="text-xs">
                              Rejected
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            Requested change from <strong>{oldPref?.name || 'Unknown'}</strong> to <strong>{newPref?.name || 'Unknown'}</strong>
                          </div>
                          {change.rejection_reason && (
                            <p className="text-xs text-red-700 mt-2 font-medium">
                              Rejection reason: {change.rejection_reason}
                            </p>
                          )}
                          {approver && (
                            <p className="text-xs text-gray-500 mt-1">Reviewed by: {approver.full_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Change Dialog */}
      <Dialog open={showRequestChangeDialog} onOpenChange={setShowRequestChangeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Meal Preference Change</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Remember:</strong> After approval, visit your camp boss to submit your old meal coupons and receive new ones.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Current Preference</p>
              <p className="font-bold text-lg">{currentMealPreference?.name || 'Not set'}</p>
              {currentMealPreference && (
                <div className="flex gap-2 mt-2">
                  <Badge className={currentMealPreference.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}>
                    {currentMealPreference.type === 'veg' ? '🥗 Vegetarian' : '🍗 Non-Vegetarian'}
                  </Badge>
                  <Badge variant="outline">
                    {currentMealPreference.cuisine?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>New Meal Preference*</Label>
              <Select value={selectedNewPreference} onValueChange={setSelectedNewPreference}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new preference..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePreferences
                    .filter(mp => mp.id !== myPerson?.meal_preference_id)
                    .map(mp => (
                      <SelectItem key={mp.id} value={mp.id}>
                        {mp.name} - {mp.type === 'veg' ? '🥗 Veg' : '🍗 Non-Veg'} ({mp.cuisine?.replace(/_/g, ' ')})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Change*</Label>
              <Textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Please explain why you want to change your meal preference..."
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Example: Religious reasons, dietary restrictions, health concerns, personal preference, etc.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRequestChangeDialog(false);
                setSelectedNewPreference("");
                setChangeReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitChangeRequest}
              className="bg-green-600 hover:bg-green-700"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}