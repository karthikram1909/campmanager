import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, User, FileText, DollarSign, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CampHiringRequestDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('request_id');

  const [showManpowerDialog, setShowManpowerDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [showProcurementDialog, setShowProcurementDialog] = useState(false);
  const [showCPODialog, setShowCPODialog] = useState(false);
  const [showCreateCampDialog, setShowCreateCampDialog] = useState(false);

  const [manpowerData, setManpowerData] = useState({});
  const [approvalData, setApprovalData] = useState({});
  const [auditData, setAuditData] = useState({});
  const [procurementData, setProcurementData] = useState({});
  const [cpoData, setCpoData] = useState({});
  const [campData, setCampData] = useState({});
  const [currentAuditTeam, setCurrentAuditTeam] = useState('');

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['camp-hiring-request', requestId],
    queryFn: async () => {
      const list = await base44.entities.CampHiringRequest.list();
      return list.find(r => r.id === requestId);
    },
    enabled: !!requestId,
    retry: 2,
    staleTime: 0,
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['camp-audits', requestId],
    queryFn: () => base44.entities.CampAudit.filter({ camp_hiring_request_id: requestId }),
    enabled: !!requestId,
  });

  const { data: procurement } = useQuery({
    queryKey: ['procurement-decision', requestId],
    queryFn: () => base44.entities.ProcurementDecision.filter({ camp_hiring_request_id: requestId }).then(list => list[0]),
    enabled: !!requestId,
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampHiringRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-hiring-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['camp-hiring-requests'] });
    },
  });

  const createAuditMutation = useMutation({
    mutationFn: (data) => base44.entities.CampAudit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-audits', requestId] });
    },
  });

  const updateAuditMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampAudit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-audits', requestId] });
    },
  });

  const createProcurementMutation = useMutation({
    mutationFn: (data) => base44.entities.ProcurementDecision.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-decision', requestId] });
    },
  });

  const createCampMutation = useMutation({
    mutationFn: (data) => base44.entities.Camp.create(data),
    onSuccess: async (newCamp) => {
      await updateRequestMutation.mutateAsync({
        id: requestId,
        data: {
          created_camp_id: newCamp.id,
          status: 'camp_created'
        }
      });
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      alert(`✅ Camp "${newCamp.name}" created successfully!`);
      setShowCreateCampDialog(false);
    },
  });

  // Manpower Control Review
  const handleManpowerDecision = async (approved) => {
    if (!manpowerData.notes && !approved) {
      alert("Please provide notes for rejection");
      return;
    }

    await updateRequestMutation.mutateAsync({
      id: requestId,
      data: {
        status: approved ? 'pending_initial_approval' : 'rejected_by_manpower_control',
        manpower_control_reviewed_by: currentUser?.id,
        manpower_control_decision_date: format(new Date(), 'yyyy-MM-dd'),
        manpower_control_notes: manpowerData.notes,
        manpower_control_projected_increase: manpowerData.projected_increase || null
      }
    });

    alert(approved ? "✅ Approved - Forwarded to Initial Approval" : "❌ Request Rejected");
    setShowManpowerDialog(false);
    setManpowerData({});
  };

  // Initial Approval
  const handleInitialApproval = async (approved) => {
    if (!approvalData.notes && !approved) {
      alert("Please provide notes for rejection");
      return;
    }

    let newStatus = approved ? 'pending_be_audit' : 'rejected_initial_approval';

    await updateRequestMutation.mutateAsync({
      id: requestId,
      data: {
        status: newStatus,
        initial_approval_by: currentUser?.id,
        initial_approval_date: format(new Date(), 'yyyy-MM-dd'),
        initial_approval_notes: approvalData.notes
      }
    });

    // Create BE audit record if approved
    if (approved) {
      await createAuditMutation.mutateAsync({
        camp_hiring_request_id: requestId,
        audit_team: 'BE',
        status: 'pending'
      });
    }

    alert(approved ? "✅ Approved - Forwarded to BE Team Audit" : "❌ Request Rejected");
    setShowApprovalDialog(false);
    setApprovalData({});
  };

  // Audit Team Decision
  const handleAuditDecision = async (approved) => {
    const audit = audits.find(a => a.audit_team === currentAuditTeam);
    
    if (!auditData.notes && !approved) {
      alert("Please provide notes/reason for rejection");
      return;
    }

    const updateData = {
      status: approved ? 'approved' : 'rejected',
      audited_by_user_id: currentUser?.id,
      audit_date: format(new Date(), 'yyyy-MM-dd'),
      audit_time: format(new Date(), 'HH:mm'),
      notes: auditData.notes,
      rejection_reason: !approved ? auditData.notes : null,
      checklist_data: JSON.stringify(auditData.checklist || {})
    };

    await updateAuditMutation.mutateAsync({
      id: audit.id,
      data: updateData
    });

    // Update request status
    let newRequestStatus;
    if (!approved) {
      newRequestStatus = `rejected_by_${currentAuditTeam.toLowerCase()}_audit`;
    } else {
      // Move to next stage
      if (currentAuditTeam === 'BE') {
        // Create BOTH LFT and HSSE audit records in parallel
        newRequestStatus = 'pending_lft_hsse_audits';
        await Promise.all([
          createAuditMutation.mutateAsync({
            camp_hiring_request_id: requestId,
            audit_team: 'LFT',
            status: 'pending'
          }),
          createAuditMutation.mutateAsync({
            camp_hiring_request_id: requestId,
            audit_team: 'HSSE',
            status: 'pending'
          })
        ]);
      } else if (currentAuditTeam === 'LFT' || currentAuditTeam === 'HSSE') {
        // Check if the other audit is also approved
        const otherTeam = currentAuditTeam === 'LFT' ? 'HSSE' : 'LFT';
        
        // Invalidate and re-fetch audits to get the most up-to-date state after the mutation
        await queryClient.invalidateQueries({ queryKey: ['camp-audits', requestId] });
        const updatedAudits = await queryClient.fetchQuery({
            queryKey: ['camp-audits', requestId],
            queryFn: () => base44.entities.CampAudit.filter({ camp_hiring_request_id: requestId }),
        });
        const otherAudit = updatedAudits.find(a => a.audit_team === otherTeam);
        
        if (otherAudit?.status === 'approved') {
          // Both audits approved - move to procurement
          newRequestStatus = 'pending_procurement_comparison';
        } else {
          // Still waiting for the other audit
          newRequestStatus = 'pending_lft_hsse_audits';
        }
      }
    }

    await updateRequestMutation.mutateAsync({
      id: requestId,
      data: { status: newRequestStatus }
    });

    const nextStepMessage = 
      currentAuditTeam === 'BE' ? ' - LFT and HSSE audits can now proceed in parallel' :
      newRequestStatus === 'pending_procurement_comparison' ? ' - Both LFT & HSSE approved, forwarded to Procurement' :
      newRequestStatus === 'pending_lft_hsse_audits' ? ' - Waiting for other audit team to complete' :
      '';

    alert(approved ? `✅ ${currentAuditTeam} Audit Approved${nextStepMessage}` : `❌ ${currentAuditTeam} Audit Rejected`);
    setShowAuditDialog(false);
    setAuditData({});
    setCurrentAuditTeam('');
  };

  // Procurement Decision
  const handleProcurementDecision = async (recommended) => {
    if (!procurementData.recommendation) {
      alert("Please provide procurement recommendation");
      return;
    }

    await createProcurementMutation.mutateAsync({
      camp_hiring_request_id: requestId,
      camps_compared_data: JSON.stringify(procurementData.compared_camps || []),
      recommended_camp_name: procurementData.recommended_name || null,
      recommended_camp_location: procurementData.recommended_location || null,
      recommended_camp_price: procurementData.recommended_price ? parseFloat(procurementData.recommended_price) : null,
      procurement_recommendation: procurementData.recommendation,
      procurement_status: recommended ? 'recommended' : 'not_recommended',
      procurement_decision_by: currentUser?.id,
      decision_date: format(new Date(), 'yyyy-MM-dd')
    });

    await updateRequestMutation.mutateAsync({
      id: requestId,
      data: {
        status: recommended ? 'pending_cpo_decision' : 'rejected_by_procurement'
      }
    });

    alert(recommended ? "✅ Procurement Recommendation Submitted - Forwarded to CPO" : "❌ Not Recommended by Procurement");
    setShowProcurementDialog(false);
    setProcurementData({});
  };

  // CPO Final Decision
  const handleCPODecision = async (approved) => {
    if (!cpoData.notes && !approved) {
      alert("Please provide notes for rejection");
      return;
    }

    await updateRequestMutation.mutateAsync({
      id: requestId,
      data: {
        status: approved ? 'approved_for_hiring' : 'rejected_by_cpo',
        cpo_decision_by: currentUser?.id,
        cpo_decision_date: format(new Date(), 'yyyy-MM-dd'),
        cpo_decision_notes: cpoData.notes
      }
    });

    alert(approved ? "✅ APPROVED by CPO - Ready for Camp Creation" : "❌ Rejected by CPO");
    setShowCPODialog(false);
    setCpoData({});
  };

  // Create Camp from Request
  const handleCreateCamp = async (e) => {
    e.preventDefault();

    if (!campData.name || !campData.code || !campData.location || !campData.camp_type) {
      alert("Please provide camp name, code, location, and camp type");
      return;
    }

    await createCampMutation.mutateAsync({
      name: campData.name,
      code: campData.code,
      location: campData.location,
      camp_type: campData.camp_type,
      capacity: request.required_capacity,
      status: 'active',
      latitude: campData.latitude ? parseFloat(campData.latitude) : null,
      longitude: campData.longitude ? parseFloat(campData.longitude) : null
    });
  };

  // Get BE audit
  const beAudit = audits.find(a => a.audit_team === 'BE');
  const lftAudit = audits.find(a => a.audit_team === 'LFT');
  const hsseAudit = audits.find(a => a.audit_team === 'HSSE');

  // Sample checklist items for each team
  const beChecklistItems = [
    "Site location verified and compliant",
    "Building permits and licenses validated",
    "Structural integrity assessment completed",
    "Electrical systems inspection passed",
    "Plumbing and water systems verified"
  ];

  const lftChecklistItems = [
    "Legal documentation complete",
    "Tenancy agreements reviewed",
    "Ownership verification completed",
    "Local authority approvals obtained",
    "Contract terms acceptable"
  ];

  const hsseChecklistItems = [
    "Fire safety systems installed and tested",
    "Emergency exits and evacuation routes clear",
    "First aid facilities available",
    "Safety signage in place",
    "HVAC and ventilation adequate",
    "Hazard assessment completed"
  ];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <Clock className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!request && !isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Request not found or you don't have access to view it.</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => navigate(createPageUrl("CampHiringRequests"))}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  const getStatusTimeline = () => {
    const timeline = [
      { label: 'Request Created', status: 'draft', completed: true, date: request.created_date },
    ];

    if (request.reason === 'manpower_increase') {
      timeline.push({
        label: 'Manpower Control',
        status: 'pending_manpower_control',
        completed: request.status !== 'pending_manpower_control' && request.status !== 'draft',
        rejected: request.status === 'rejected_by_manpower_control',
        date: request.manpower_control_decision_date
      });
    }

    timeline.push(
      {
        label: 'Initial Approval',
        status: 'pending_initial_approval',
        completed: !['draft', 'pending_manpower_control', 'pending_initial_approval', 'rejected_by_manpower_control'].includes(request.status),
        rejected: request.status === 'rejected_initial_approval',
        date: request.initial_approval_date
      },
      {
        label: 'BE Audit',
        status: 'pending_be_audit',
        completed: beAudit?.status === 'approved',
        rejected: beAudit?.status === 'rejected',
        date: beAudit?.audit_date
      },
      {
        label: 'LFT & HSSE Audits (Parallel)',
        status: 'pending_lft_hsse_audits',
        completed: lftAudit?.status === 'approved' && hsseAudit?.status === 'approved',
        rejected: lftAudit?.status === 'rejected' || hsseAudit?.status === 'rejected',
        date: lftAudit?.audit_date || hsseAudit?.audit_date,
        subItems: [
          {
            label: 'LFT',
            completed: lftAudit?.status === 'approved',
            rejected: lftAudit?.status === 'rejected'
          },
          {
            label: 'HSSE',
            completed: hsseAudit?.status === 'approved',
            rejected: hsseAudit?.status === 'rejected'
          }
        ]
      },
      {
        label: 'Procurement',
        status: 'pending_procurement_comparison',
        completed: procurement?.procurement_status === 'recommended',
        rejected: procurement?.procurement_status === 'not_recommended',
        date: procurement?.decision_date
      },
      {
        label: 'CPO Decision',
        status: 'pending_cpo_decision',
        completed: request.status === 'approved_for_hiring' || request.status === 'camp_created',
        rejected: request.status === 'rejected_by_cpo',
        date: request.cpo_decision_date
      },
      {
        label: 'Camp Created',
        status: 'camp_created',
        completed: request.status === 'camp_created',
        date: request.status === 'camp_created' ? request.updated_date : null
      }
    );

    return timeline;
  };

  const timeline = getStatusTimeline();

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("CampHiringRequests"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Camp Hiring Request</h1>
              <p className="text-sm text-gray-600">ID: {request.id?.substring(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle>Workflow Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {timeline.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex flex-col gap-1 px-4 py-2 rounded-lg border-2 ${
                    step.completed ? 'bg-green-50 border-green-500' :
                    step.rejected ? 'bg-red-50 border-red-500' :
                    request.status === step.status ? 'bg-blue-50 border-blue-500' :
                    'bg-gray-50 border-gray-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : step.rejected ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{step.label}</p>
                        {step.date && (
                          <p className="text-xs text-gray-500">{format(parseISO(step.date), 'MMM dd, yyyy')}</p>
                        )}
                      </div>
                    </div>
                    {step.subItems && (
                      <div className="flex gap-2 ml-6 mt-1">
                        {step.subItems.map((sub, subIdx) => (
                          <Badge key={subIdx} className={`text-xs ${
                            sub.completed ? 'bg-green-600 text-white' :
                            sub.rejected ? 'bg-red-600 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {sub.label}
                            {sub.completed ? ' ✓' : sub.rejected ? ' ✗' : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {index < timeline.length - 1 && (
                    <div className={`w-8 h-0.5 ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Request Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Requested By</p>
                <p className="font-medium text-gray-900">{request.created_by}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Required Capacity</p>
                <Badge variant="outline" className="text-blue-700 border-blue-300 text-lg">
                  {request.required_capacity} beds
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Period of Requirement</p>
                <p className="font-medium text-gray-900">
                  {format(parseISO(request.period_start_date), 'MMM dd, yyyy')} - {format(parseISO(request.period_end_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Reason</p>
                <Badge variant="secondary">{request.reason?.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Details</p>
                <p className="text-sm text-gray-700">{request.reason_details || '-'}</p>
              </div>
              {request.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Additional Notes</p>
                  <p className="text-sm text-gray-700">{request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <Badge className={`text-base px-4 py-2 ${
                  request.status?.includes('rejected') ? 'bg-red-600' :
                  request.status === 'approved_for_hiring' || request.status === 'camp_created' ? 'bg-green-600' :
                  'bg-blue-600'
                } text-white`}>
                  {request.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-sm font-medium">{format(parseISO(request.created_date), 'MMM dd, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="text-sm font-medium">{format(parseISO(request.updated_date), 'MMM dd, yyyy HH:mm')}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t space-y-2">
                {request.status === 'draft' && (
                  <Button
                    onClick={async () => {
                      if (!confirm('Submit this camp hiring request for review?')) return;
                      
                      const nextStatus = request.reason === 'manpower_increase' 
                        ? 'pending_manpower_control' 
                        : 'pending_initial_approval';
                      
                      await updateRequestMutation.mutateAsync({
                        id: requestId,
                        data: { status: nextStatus }
                      });
                      
                      alert(`✅ Request submitted for ${request.reason === 'manpower_increase' ? 'Manpower Control Review' : 'Initial Approval'}`);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit for Review
                  </Button>
                )}

                {request.status === 'pending_manpower_control' && (
                  <Button
                    onClick={() => setShowManpowerDialog(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Review (Manpower Control)
                  </Button>
                )}

                {request.status === 'pending_initial_approval' && (
                  <Button
                    onClick={() => setShowApprovalDialog(true)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Approve/Reject (Initial Approval)
                  </Button>
                )}

                {request.status === 'pending_be_audit' && beAudit?.status === 'pending' && (
                  <Button
                    onClick={() => {
                      setCurrentAuditTeam('BE');
                      setShowAuditDialog(true);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Conduct BE Audit
                  </Button>
                )}

                {request.status === 'pending_lft_hsse_audits' && lftAudit?.status === 'pending' && (
                  <Button
                    onClick={() => {
                      setCurrentAuditTeam('LFT');
                      setShowAuditDialog(true);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Conduct LFT Audit
                  </Button>
                )}

                {request.status === 'pending_lft_hsse_audits' && hsseAudit?.status === 'pending' && (
                  <Button
                    onClick={() => {
                      setCurrentAuditTeam('HSSE');
                      setShowAuditDialog(true);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Conduct HSSE Audit
                  </Button>
                )}

                {request.status === 'pending_lft_hsse_audits' && lftAudit?.status === 'approved' && hsseAudit?.status === 'pending' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>LFT Audit Approved ✓</strong> Waiting for HSSE audit to complete...
                    </AlertDescription>
                  </Alert>
                )}

                {request.status === 'pending_lft_hsse_audits' && hsseAudit?.status === 'approved' && lftAudit?.status === 'pending' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>HSSE Audit Approved ✓</strong> Waiting for LFT audit to complete...
                    </AlertDescription>
                  </Alert>
                )}

                {request.status === 'pending_procurement_comparison' && !procurement && (
                  <Button
                    onClick={() => setShowProcurementDialog(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Submit Procurement Decision
                  </Button>
                )}

                {request.status === 'pending_cpo_decision' && (
                  <Button
                    onClick={() => setShowCPODialog(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    CPO Final Decision
                  </Button>
                )}

                {request.status === 'approved_for_hiring' && !request.created_camp_id && (
                  <Button
                    onClick={() => {
                      setCampData({ capacity: request.required_capacity, camp_type: 'regular_camp' });
                      setShowCreateCampDialog(true);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Create Camp (TR)
                  </Button>
                )}

                {request.created_camp_id && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      <strong>Camp Created:</strong> {camps.find(c => c.id === request.created_camp_id)?.name}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Results */}
        {audits.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg">Audit Results</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                {[beAudit, lftAudit, hsseAudit].map((audit, idx) => {
                  const teamName = ['BE Team', 'LFT Team', 'HSSE Team'][idx];
                  if (!audit) return null;

                  return (
                    <div key={audit.id} className={`p-4 rounded-lg border-2 ${
                      audit.status === 'approved' ? 'bg-green-50 border-green-500' :
                      audit.status === 'rejected' ? 'bg-red-50 border-red-500' :
                      'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{teamName}</h4>
                        {audit.status === 'approved' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : audit.status === 'rejected' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <Badge className={`text-xs mb-2 ${
                        audit.status === 'approved' ? 'bg-green-600' :
                        audit.status === 'rejected' ? 'bg-red-600' :
                        'bg-gray-400'
                      } text-white`}>
                        {audit.status}
                      </Badge>
                      {audit.audit_date && (
                        <p className="text-xs text-gray-600 mt-2">
                          {format(parseISO(audit.audit_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                      {audit.notes && (
                        <p className="text-sm text-gray-700 mt-2">{audit.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Procurement Decision */}
        {procurement && (
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg">Procurement Decision</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${
                    procurement.procurement_status === 'recommended' ? 'bg-green-600' : 'bg-red-600'
                  } text-white`}>
                    {procurement.procurement_status}
                  </Badge>
                  {procurement.decision_date && (
                    <span className="text-sm text-gray-600">
                      {format(parseISO(procurement.decision_date), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>

                {procurement.recommended_camp_name && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Recommended Camp</p>
                    <p className="font-semibold text-lg text-gray-900">{procurement.recommended_camp_name}</p>
                    <p className="text-sm text-gray-700">{procurement.recommended_camp_location}</p>
                    {procurement.recommended_camp_price && (
                      <p className="text-sm font-medium text-blue-700 mt-2">
                        AED {procurement.recommended_camp_price.toLocaleString()}/month
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Recommendation</p>
                  <p className="text-sm text-gray-700">{procurement.procurement_recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decision History */}
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Decision History</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {request.manpower_control_notes && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <p className="font-semibold text-gray-900">Manpower Control</p>
                  {request.manpower_control_decision_date && (
                    <span className="text-xs text-gray-600">
                      {format(parseISO(request.manpower_control_decision_date), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{request.manpower_control_notes}</p>
                {request.manpower_control_projected_increase && (
                  <p className="text-sm text-blue-700 mt-2">
                    Projected Increase: {request.manpower_control_projected_increase} personnel
                  </p>
                )}
              </div>
            )}

            {request.initial_approval_notes && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                  <p className="font-semibold text-gray-900">Initial Approval</p>
                  {request.initial_approval_date && (
                    <span className="text-xs text-gray-600">
                      {format(parseISO(request.initial_approval_date), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{request.initial_approval_notes}</p>
              </div>
            )}

            {request.cpo_decision_notes && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <p className="font-semibold text-gray-900">CPO Decision</p>
                  {request.cpo_decision_date && (
                    <span className="text-xs text-gray-600">
                      {format(parseISO(request.cpo_decision_date), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{request.cpo_decision_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manpower Control Dialog */}
      <Dialog open={showManpowerDialog} onOpenChange={setShowManpowerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manpower Control Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                Review the projected manpower increase and provide your assessment.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Projected Manpower Increase</Label>
              <Input
                type="number"
                value={manpowerData.projected_increase || ''}
                onChange={(e) => setManpowerData({...manpowerData, projected_increase: e.target.value})}
                placeholder="Number of additional personnel expected"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes/Comments*</Label>
              <Textarea
                value={manpowerData.notes || ''}
                onChange={(e) => setManpowerData({...manpowerData, notes: e.target.value})}
                rows={4}
                placeholder="Your assessment and recommendations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManpowerDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleManpowerDecision(false)}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleManpowerDecision(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Initial Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Initial Approval Decision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Request Summary</p>
              <p className="font-semibold text-lg">{request.required_capacity} beds</p>
              <p className="text-sm text-gray-700">{request.reason_details}</p>
            </div>

            <div className="space-y-2">
              <Label>Decision Notes/Comments*</Label>
              <Textarea
                value={approvalData.notes || ''}
                onChange={(e) => setApprovalData({...approvalData, notes: e.target.value})}
                rows={4}
                placeholder="Provide your decision rationale..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleInitialApproval(false)}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleInitialApproval(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentAuditTeam} Team Audit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-purple-50 border-purple-200">
              <AlertDescription className="text-purple-900">
                Complete the {currentAuditTeam} team audit checklist for this camp hiring request.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Audit Checklist</Label>
              {(currentAuditTeam === 'BE' ? beChecklistItems :
                currentAuditTeam === 'LFT' ? lftChecklistItems :
                hsseChecklistItems
              ).map((item, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 border">
                  <Checkbox
                    id={`check-${index}`}
                    checked={auditData.checklist?.[`item_${index}`] || false}
                    onCheckedChange={(checked) => setAuditData({
                      ...auditData,
                      checklist: {
                        ...auditData.checklist,
                        [`item_${index}`]: checked
                      }
                    })}
                  />
                  <Label htmlFor={`check-${index}`} className="text-sm cursor-pointer flex-1">
                    {item}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Audit Notes/Comments*</Label>
              <Textarea
                value={auditData.notes || ''}
                onChange={(e) => setAuditData({...auditData, notes: e.target.value})}
                rows={4}
                placeholder="Provide detailed audit findings and recommendations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAuditDialog(false);
              setAuditData({});
              setCurrentAuditTeam('');
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleAuditDecision(false)}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAuditDecision(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procurement Dialog */}
      <Dialog open={showProcurementDialog} onOpenChange={setShowProcurementDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Procurement Price Comparison & Recommendation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-indigo-50 border-indigo-200">
              <AlertDescription className="text-indigo-900">
                <strong>All 3 audits approved!</strong> Provide price comparison and recommendation.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Recommended Camp Name</Label>
                <Input
                  value={procurementData.recommended_name || ''}
                  onChange={(e) => setProcurementData({...procurementData, recommended_name: e.target.value})}
                  placeholder="e.g., Al Quoz Camp TR"
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={procurementData.recommended_location || ''}
                  onChange={(e) => setProcurementData({...procurementData, recommended_location: e.target.value})}
                  placeholder="e.g., Al Quoz Industrial Area"
                />
              </div>

              <div className="space-y-2">
                <Label>Monthly Price (AED)</Label>
                <Input
                  type="number"
                  value={procurementData.recommended_price || ''}
                  onChange={(e) => setProcurementData({...procurementData, recommended_price: e.target.value})}
                  placeholder="e.g., 50000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Price Comparison Data (Optional)</Label>
              <Textarea
                value={procurementData.compared_camps || ''}
                onChange={(e) => setProcurementData({...procurementData, compared_camps: e.target.value})}
                rows={4}
                placeholder="List other camps compared, their prices, and pros/cons..."
              />
            </div>

            <div className="space-y-2">
              <Label>Procurement Recommendation*</Label>
              <Textarea
                value={procurementData.recommendation || ''}
                onChange={(e) => setProcurementData({...procurementData, recommendation: e.target.value})}
                rows={4}
                placeholder="Your detailed recommendation and justification..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcurementDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleProcurementDecision(false)}>
              <XCircle className="w-4 h-4 mr-2" />
              Not Recommended
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleProcurementDecision(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Recommend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CPO Decision Dialog */}
      <Dialog open={showCPODialog} onOpenChange={setShowCPODialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CPO Final Decision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertDescription className="text-orange-900">
                <strong>Final Authority:</strong> Make the final decision to approve or reject this camp hiring request.
              </AlertDescription>
            </Alert>

            {procurement && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Procurement Recommendation</p>
                <p className="text-sm text-gray-900">{procurement.procurement_recommendation}</p>
                {procurement.recommended_camp_name && (
                  <p className="text-sm font-medium text-blue-700 mt-2">
                    Camp: {procurement.recommended_camp_name} - AED {procurement.recommended_camp_price?.toLocaleString()}/month
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>CPO Decision Notes*</Label>
              <Textarea
                value={cpoData.notes || ''}
                onChange={(e) => setCpoData({...cpoData, notes: e.target.value})}
                rows={4}
                placeholder="Provide your final decision rationale..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCPODialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleCPODecision(false)}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleCPODecision(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve for Hiring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Camp Dialog */}
      <Dialog open={showCreateCampDialog} onOpenChange={setShowCreateCampDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Camp (TR)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCamp} className="space-y-4 p-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Approved for Hiring!</strong> Create the camp entity to complete this request.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Camp Name*</Label>
                <Input
                  required
                  value={campData.name || ''}
                  onChange={(e) => setCampData({...campData, name: e.target.value})}
                  placeholder="e.g., Al Quoz TR Camp"
                />
              </div>

              <div className="space-y-2">
                <Label>Camp Code*</Label>
                <Input
                  required
                  value={campData.code || ''}
                  onChange={(e) => setCampData({...campData, code: e.target.value})}
                  placeholder="e.g., ALQUOZ_TR"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Camp Type*</Label>
              <Select
                value={campData.camp_type || ''}
                onValueChange={(value) => setCampData({...campData, camp_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camp type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="induction_camp">Induction Camp</SelectItem>
                  <SelectItem value="regular_camp">Regular Camp</SelectItem>
                  <SelectItem value="exit_camp">Exit Camp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location*</Label>
              <Input
                required
                value={campData.location || ''}
                onChange={(e) => setCampData({...campData, location: e.target.value})}
                placeholder="Physical address"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={campData.latitude || ''}
                  onChange={(e) => setCampData({...campData, latitude: e.target.value})}
                  placeholder="25.2048"
                />
              </div>

              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={campData.longitude || ''}
                  onChange={(e) => setCampData({...campData, longitude: e.target.value})}
                  placeholder="55.2708"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capacity (From Request)</Label>
              <Input
                type="number"
                value={request.required_capacity}
                disabled
                className="bg-gray-100"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateCampDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Building2 className="w-4 h-4 mr-2" />
                Create Camp
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}