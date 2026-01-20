import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, XCircle, AlertCircle, 
  Upload, FileText, Eye, RefreshCw
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CampRenewalProcess() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("expiring");
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedRenewal, setSelectedRenewal] = useState(null);
  const [decisionData, setDecisionData] = useState({});
  const [renewalData, setRenewalData] = useState({});
  const [uploading, setUploading] = useState({});

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: renewalRequests = [] } = useQuery({
    queryKey: ['camp-renewal-requests'],
    queryFn: () => base44.entities.CampRenewalRequest.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const createRenewalMutation = useMutation({
    mutationFn: (data) => base44.entities.CampRenewalRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-renewal-requests'] });
    },
  });

  const updateRenewalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampRenewalRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-renewal-requests'] });
    },
  });

  const updateCampMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Camp.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camps'] });
    },
  });

  // Get camps expiring within 90 days
  const getExpiringCamps = () => {
    return camps.filter(camp => {
      if (!camp.contract_end_date) return false;
      const daysUntilExpiry = differenceInDays(parseISO(camp.contract_end_date), new Date());
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
    }).map(camp => {
      const daysUntilExpiry = differenceInDays(parseISO(camp.contract_end_date), new Date());
      const existingRequest = renewalRequests.find(r => r.camp_id === camp.id && r.renewal_decision === 'pending');
      const renewalInProgress = renewalRequests.find(r => r.camp_id === camp.id && r.renewal_decision === 'renew' && r.ejari_renewal_status !== 'completed');
      const renewalCompleted = renewalRequests.find(r => r.camp_id === camp.id && r.renewal_decision === 'renew' && r.ejari_renewal_status === 'completed');
      return { ...camp, daysUntilExpiry, existingRequest, renewalInProgress, renewalCompleted };
    }).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  // Get camps that are already expired
  const getExpiredCamps = () => {
    return camps.filter(camp => {
      if (!camp.contract_end_date) return false;
      const daysUntilExpiry = differenceInDays(parseISO(camp.contract_end_date), new Date());
      return daysUntilExpiry < 0;
    }).map(camp => {
      const daysOverdue = Math.abs(differenceInDays(parseISO(camp.contract_end_date), new Date()));
      return { ...camp, daysOverdue };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);
  };

  // Get pending renewal decisions
  const getPendingDecisions = () => {
    return renewalRequests.filter(r => r.renewal_decision === 'pending').map(request => {
      const camp = camps.find(c => c.id === request.camp_id);
      return { ...request, camp };
    });
  };

  // Get renewals in progress (decided to renew, Ejari process ongoing)
  const getRenewalsInProgress = () => {
    return renewalRequests.filter(r => 
      r.renewal_decision === 'renew' && r.ejari_renewal_status !== 'completed'
    ).map(request => {
      const camp = camps.find(c => c.id === request.camp_id);
      return { ...request, camp };
    });
  };

  // Get completed renewals
  const getCompletedRenewals = () => {
    return renewalRequests.filter(r => 
      r.ejari_renewal_status === 'completed' || r.renewal_decision === 'not_renew'
    ).map(request => {
      const camp = camps.find(c => c.id === request.camp_id);
      return { ...request, camp };
    });
  };

  const expiringCamps = getExpiringCamps();
  const expiredCamps = getExpiredCamps();
  const pendingDecisions = getPendingDecisions();
  const renewalsInProgress = getRenewalsInProgress();
  const completedRenewals = getCompletedRenewals();

  // Handle initiating renewal decision
  const handleInitiateRenewal = (camp) => {
    setSelectedCamp(camp);
    setDecisionData({});
    setShowDecisionDialog(true);
  };

  // Handle renewal decision submission
  const handleDecisionSubmit = async (decision) => {
    if (!decisionData.notes && decision === 'not_renew') {
      alert("Please provide notes explaining why renewal is not recommended");
      return;
    }

    // Check if request already exists for this camp (any status except completed not_renew)
    const existingRequest = renewalRequests.find(r => 
      r.camp_id === selectedCamp.id && 
      !(r.renewal_decision === 'not_renew' && r.ejari_renewal_status === 'completed')
    );
    
    let requestId = existingRequest?.id;

    if (!requestId) {
      // Create new renewal request
      const newRequest = await createRenewalMutation.mutateAsync({
        camp_id: selectedCamp.id,
        renewal_decision: decision,
        decision_by: currentUser?.id,
        decision_date: format(new Date(), 'yyyy-MM-dd'),
        decision_notes: decisionData.notes,
        ejari_renewal_status: decision === 'renew' ? 'not_started' : 'not_started'
      });
      requestId = newRequest.id;
    } else {
      // Update existing request
      await updateRenewalMutation.mutateAsync({
        id: requestId,
        data: {
          renewal_decision: decision,
          decision_by: currentUser?.id,
          decision_date: format(new Date(), 'yyyy-MM-dd'),
          decision_notes: decisionData.notes
        }
      });
    }

    setShowDecisionDialog(false);
    
    if (decision === 'not_renew') {
      // Redirect to create Camp Hiring Request
      alert("✅ Decision recorded: NOT RENEW. You will be redirected to create a Camp Hiring Request for a new camp.");
      setSelectedCamp(null);
      setDecisionData({});
      navigate(createPageUrl("CreateCampHiringRequest"));
    } else {
      // Open Ejari renewal dialog immediately
      const camp = camps.find(c => c.id === selectedCamp.id);
      setSelectedRenewal({
        id: requestId,
        camp_id: selectedCamp.id,
        camp: camp,
        new_contract_start_date: '',
        new_contract_end_date: '',
        new_ejari_number: '',
        new_ejari_expiry_date: '',
        new_monthly_rent: '',
        tenancy_contract_url: '',
        ejari_certificate_url: '',
        dewa_bill_url: '',
        trade_license_url: '',
        notes: ''
      });
      setRenewalData({
        new_contract_start_date: '',
        new_contract_end_date: '',
        new_ejari_number: '',
        new_ejari_expiry_date: '',
        new_monthly_rent: '',
        tenancy_contract_url: '',
        ejari_certificate_url: '',
        dewa_bill_url: '',
        trade_license_url: '',
        notes: ''
      });
      setSelectedCamp(null);
      setDecisionData({});
      setShowRenewalDialog(true);
    }
  };

  // Handle file upload
  const handleFileUpload = async (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploading({ ...uploading, [field]: true });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setRenewalData({ ...renewalData, [field]: file_url });
      } catch (error) {
        alert("Upload failed: " + error.message);
      }
      setUploading({ ...uploading, [field]: false });
    };
    input.click();
  };

  // Handle opening Ejari renewal dialog
  const handleOpenEjariRenewal = (renewal) => {
    setSelectedRenewal(renewal);
    setRenewalData({
      new_contract_start_date: renewal.new_contract_start_date || '',
      new_contract_end_date: renewal.new_contract_end_date || '',
      new_ejari_number: renewal.new_ejari_number || '',
      new_ejari_expiry_date: renewal.new_ejari_expiry_date || '',
      new_monthly_rent: renewal.new_monthly_rent || '',
      tenancy_contract_url: renewal.tenancy_contract_url || '',
      ejari_certificate_url: renewal.ejari_certificate_url || '',
      dewa_bill_url: renewal.dewa_bill_url || '',
      trade_license_url: renewal.trade_license_url || '',
      notes: renewal.notes || ''
    });
    setShowRenewalDialog(true);
  };

  // Handle saving Ejari renewal progress
  const handleSaveRenewalProgress = async () => {
    const dataToSave = {
      ...renewalData,
      ejari_renewal_status: 'in_progress',
      new_monthly_rent: renewalData.new_monthly_rent ? parseFloat(renewalData.new_monthly_rent) : null
    };
    await updateRenewalMutation.mutateAsync({
      id: selectedRenewal.id,
      data: dataToSave
    });

    alert("✅ Renewal progress saved. You can continue later from the 'In Progress' tab.");
    setShowRenewalDialog(false);
    setSelectedRenewal(null);
    setRenewalData({});
  };

  // Handle completing Ejari renewal
  const handleCompleteRenewal = async () => {
    if (!renewalData.new_contract_end_date || !renewalData.ejari_certificate_url || !renewalData.tenancy_contract_url) {
      alert("Please provide: New Contract End Date, Ejari Certificate, and Tenancy Contract to complete renewal");
      return;
    }

    // Update renewal request
    const renewalDataToSave = {
      ...renewalData,
      ejari_renewal_status: 'completed',
      renewal_completed_date: format(new Date(), 'yyyy-MM-dd'),
      renewal_completed_by: currentUser?.id,
      new_monthly_rent: renewalData.new_monthly_rent ? parseFloat(renewalData.new_monthly_rent) : null
    };
    await updateRenewalMutation.mutateAsync({
      id: selectedRenewal.id,
      data: renewalDataToSave
    });

    // Update camp with new dates
    await updateCampMutation.mutateAsync({
      id: selectedRenewal.camp_id,
      data: {
        contract_start_date: renewalData.new_contract_start_date || undefined,
        contract_end_date: renewalData.new_contract_end_date,
        ejari_number: renewalData.new_ejari_number || undefined,
        ejari_expiry_date: renewalData.new_ejari_expiry_date || undefined,
        monthly_rent: renewalData.new_monthly_rent ? parseFloat(renewalData.new_monthly_rent) : undefined
      }
    });

    alert("✅ Camp renewal completed! Camp dates have been updated.");
    setShowRenewalDialog(false);
    setSelectedRenewal(null);
    setRenewalData({});
  };

  const getUrgencyBadge = (days) => {
    if (days <= 30) return <Badge className="bg-red-600 text-white">{days} days left - URGENT</Badge>;
    if (days <= 60) return <Badge className="bg-orange-500 text-white">{days} days left</Badge>;
    return <Badge className="bg-yellow-500 text-white">{days} days left</Badge>;
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <RefreshCw className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Camp Renewal Process</h1>
            <p className="text-gray-600 mt-1">Track contract expiry and manage Ejari renewals (90-day advance notice)</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-5 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium mb-1">Expired</p>
                  <p className="text-3xl font-bold text-red-900">{expiredCamps.length}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium mb-1">Expiring (90 days)</p>
                  <p className="text-3xl font-bold text-orange-900">{expiringCamps.length}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium mb-1">Pending Decision</p>
                  <p className="text-3xl font-bold text-yellow-900">{pendingDecisions.length}</p>
                </div>
                <FileText className="w-10 h-10 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium mb-1">Renewal In Progress</p>
                  <p className="text-3xl font-bold text-blue-900">{renewalsInProgress.length}</p>
                </div>
                <RefreshCw className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-900">{completedRenewals.length}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="expiring" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Expiring Soon ({expiringCamps.length})
            </TabsTrigger>
            <TabsTrigger value="expired" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Already Expired ({expiredCamps.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              In Progress ({renewalsInProgress.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({completedRenewals.length})
            </TabsTrigger>
          </TabsList>

          {/* Expiring Soon Tab */}
          <TabsContent value="expiring">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b">
                <CardTitle>Camps Expiring Within 90 Days</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {expiringCamps.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No camps expiring within the next 90 days</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-300 bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Camp</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Capacity</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contract End</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days Left</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiringCamps.map((camp, index) => (
                          <tr key={camp.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-semibold text-gray-900">{camp.name}</p>
                                <p className="text-xs text-gray-500">{camp.code}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{camp.location}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{camp.capacity} beds</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {format(parseISO(camp.contract_end_date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-4 py-3">
                              {getUrgencyBadge(camp.daysUntilExpiry)}
                            </td>
                            <td className="px-4 py-3">
                              {camp.renewalCompleted ? (
                                <Badge className="bg-green-100 text-green-700">Renewed</Badge>
                              ) : camp.renewalInProgress ? (
                                <Badge className="bg-blue-100 text-blue-700">Renewal In Progress</Badge>
                              ) : camp.existingRequest ? (
                                <Badge className="bg-yellow-100 text-yellow-700">Decision Pending</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700">Action Required</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {camp.renewalCompleted ? (
                                <Badge className="bg-green-600 text-white">✓ Completed</Badge>
                              ) : camp.renewalInProgress ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenEjariRenewal(camp.renewalInProgress)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Continue Renewal
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleInitiateRenewal(camp)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {camp.existingRequest ? 'Update Decision' : 'Take Decision'}
                                </Button>
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
          </TabsContent>

          {/* Already Expired Tab */}
          <TabsContent value="expired">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
                <CardTitle className="text-red-800">Camps Already Expired - Immediate Action Required</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {expiredCamps.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No expired camps</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-300 bg-red-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Camp</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Contract Ended</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Days Overdue</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiredCamps.map((camp, index) => (
                          <tr key={camp.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-red-50'}`}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-semibold text-gray-900">{camp.name}</p>
                                <p className="text-xs text-gray-500">{camp.code}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{camp.location}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {format(parseISO(camp.contract_end_date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-red-600 text-white">{camp.daysOverdue} days overdue</Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleInitiateRenewal(camp)}
                              >
                                Take Immediate Action
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* In Progress Tab */}
          <TabsContent value="in_progress">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <CardTitle>Ejari Renewal In Progress</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renewalsInProgress.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No renewals in progress</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-300 bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Camp</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Decision Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ejari Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Documents</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renewalsInProgress.map((renewal, index) => {
                          const docsUploaded = [
                            renewal.tenancy_contract_url,
                            renewal.ejari_certificate_url,
                            renewal.dewa_bill_url,
                            renewal.trade_license_url
                          ].filter(Boolean).length;

                          return (
                            <tr key={renewal.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-semibold text-gray-900">{renewal.camp?.name}</p>
                                  <p className="text-xs text-gray-500">{renewal.camp?.code}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {renewal.decision_date ? format(parseISO(renewal.decision_date), 'MMM dd, yyyy') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={`${
                                  renewal.ejari_renewal_status === 'in_progress' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {renewal.ejari_renewal_status?.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {docsUploaded}/4 uploaded
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenEjariRenewal(renewal)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Upload className="w-4 h-4 mr-1" />
                                  Continue Renewal
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle>Completed Renewals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {completedRenewals.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No completed renewals yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-300 bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Camp</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Decision</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Completed Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">New Contract End</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedRenewals.map((renewal, index) => (
                          <tr key={renewal.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-semibold text-gray-900">{renewal.camp?.name}</p>
                                <p className="text-xs text-gray-500">{renewal.camp?.code}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`${
                                renewal.renewal_decision === 'renew' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {renewal.renewal_decision === 'renew' ? 'Renewed' : 'Not Renewed'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {renewal.renewal_completed_date 
                                ? format(parseISO(renewal.renewal_completed_date), 'MMM dd, yyyy')
                                : renewal.decision_date 
                                  ? format(parseISO(renewal.decision_date), 'MMM dd, yyyy')
                                  : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {renewal.new_contract_end_date 
                                ? format(parseISO(renewal.new_contract_end_date), 'MMM dd, yyyy')
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                              {renewal.decision_notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Decision Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Renewal Decision - {selectedCamp?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>Contract End Date:</strong> {selectedCamp?.contract_end_date && format(parseISO(selectedCamp.contract_end_date), 'MMMM dd, yyyy')}
                <br />
                <strong>Location:</strong> {selectedCamp?.location}
                <br />
                <strong>Capacity:</strong> {selectedCamp?.capacity} beds
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Decision Notes*</Label>
              <Textarea
                value={decisionData.notes || ''}
                onChange={(e) => setDecisionData({ ...decisionData, notes: e.target.value })}
                placeholder="Provide rationale for your decision..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDecisionSubmit('not_renew')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Not Renew (Find New Camp)
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleDecisionSubmit('renew')}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Renew (Ejari Process)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ejari Renewal Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ejari Renewal - {selectedRenewal?.camp?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Decision: RENEW</strong> - Complete the Ejari renewal process by uploading required documents.
              </AlertDescription>
            </Alert>

            {/* New Contract Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">New Contract Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Contract Start Date</Label>
                  <Input
                    type="date"
                    value={renewalData.new_contract_start_date || ''}
                    onChange={(e) => setRenewalData({ ...renewalData, new_contract_start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Contract End Date*</Label>
                  <Input
                    type="date"
                    required
                    value={renewalData.new_contract_end_date || ''}
                    onChange={(e) => setRenewalData({ ...renewalData, new_contract_end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Ejari Number</Label>
                  <Input
                    value={renewalData.new_ejari_number || ''}
                    onChange={(e) => setRenewalData({ ...renewalData, new_ejari_number: e.target.value })}
                    placeholder="e.g., 123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Ejari Expiry Date</Label>
                  <Input
                    type="date"
                    value={renewalData.new_ejari_expiry_date || ''}
                    onChange={(e) => setRenewalData({ ...renewalData, new_ejari_expiry_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Monthly Rent (AED)</Label>
                  <Input
                    type="number"
                    value={renewalData.new_monthly_rent || ''}
                    onChange={(e) => setRenewalData({ ...renewalData, new_monthly_rent: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                </div>
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Required Documents</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Tenancy Contract */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">Tenancy Contract*</Label>
                    {renewalData.tenancy_contract_url && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFileUpload('tenancy_contract_url')}
                      disabled={uploading.tenancy_contract_url}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading.tenancy_contract_url ? 'Uploading...' : 'Upload'}
                    </Button>
                    {renewalData.tenancy_contract_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(renewalData.tenancy_contract_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>

                {/* Ejari Certificate */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">Ejari Certificate*</Label>
                    {renewalData.ejari_certificate_url && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFileUpload('ejari_certificate_url')}
                      disabled={uploading.ejari_certificate_url}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading.ejari_certificate_url ? 'Uploading...' : 'Upload'}
                    </Button>
                    {renewalData.ejari_certificate_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(renewalData.ejari_certificate_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>

                {/* DEWA Bill */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">DEWA Bill</Label>
                    {renewalData.dewa_bill_url && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFileUpload('dewa_bill_url')}
                      disabled={uploading.dewa_bill_url}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading.dewa_bill_url ? 'Uploading...' : 'Upload'}
                    </Button>
                    {renewalData.dewa_bill_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(renewalData.dewa_bill_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>

                {/* Trade License */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">Trade License</Label>
                    {renewalData.trade_license_url && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFileUpload('trade_license_url')}
                      disabled={uploading.trade_license_url}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading.trade_license_url ? 'Uploading...' : 'Upload'}
                    </Button>
                    {renewalData.trade_license_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(renewalData.trade_license_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={renewalData.notes || ''}
                onChange={(e) => setRenewalData({ ...renewalData, notes: e.target.value })}
                placeholder="Any additional notes about the renewal..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveRenewalProgress}
              className="border-blue-600 text-blue-600"
            >
              Save Progress
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCompleteRenewal}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}