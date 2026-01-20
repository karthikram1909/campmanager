import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Upload, Download, Trash2, FileText, Activity, 
  Hospital, Calendar, Clock, AlertCircle, DollarSign, 
  Plus, Pencil, Save, Plane, User
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MedicalRecordDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const recordId = urlParams.get('id');
  
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showAddVisitDialog, setShowAddVisitDialog] = useState(false);
  const [showAddClaimDialog, setShowAddClaimDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [visitFormData, setVisitFormData] = useState({});
  const [claimFormData, setClaimFormData] = useState({});
  const [editFormData, setEditFormData] = useState({});

  const queryClient = useQueryClient();

  const { data: record } = useQuery({
    queryKey: ['medical-record', recordId],
    queryFn: async () => {
      const records = await base44.entities.MedicalRecord.list();
      return records.find(r => r.id === recordId);
    },
    enabled: !!recordId,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['medical-visits', recordId],
    queryFn: async () => {
      const allVisits = await base44.entities.MedicalVisit.list('-visit_date');
      return allVisits.filter(v => v.medical_record_id === recordId);
    },
    enabled: !!recordId,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['insurance-claims', recordId],
    queryFn: async () => {
      const allClaims = await base44.entities.InsuranceClaim.list('-claim_date');
      return allClaims.filter(c => c.medical_record_id === recordId);
    },
    enabled: !!recordId,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: () => base44.entities.HealthInsurancePolicy.list(),
  });

  const { data: actionTypes = [] } = useQuery({
    queryKey: ['disciplinary-action-types'],
    queryFn: () => base44.entities.DisciplinaryActionType.list(),
  });

  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list(),
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MedicalRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', recordId] });
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
  });

  const createDisciplinaryMutation = useMutation({
    mutationFn: (data) => base44.entities.DisciplinaryAction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary'] });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: (data) => base44.entities.TransferRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalVisit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-visits', recordId] });
      setShowAddVisitDialog(false);
      setVisitFormData({});
    },
  });

  const createClaimMutation = useMutation({
    mutationFn: (data) => base44.entities.InsuranceClaim.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims', recordId] });
      setShowAddClaimDialog(false);
      setClaimFormData({});
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(result => result.file_url);
      
      const currentAttachments = record.attachments_urls ? record.attachments_urls.split(',').filter(url => url.trim()) : [];
      const updatedAttachments = [...currentAttachments, ...newUrls].join(',');
      
      await updateRecordMutation.mutateAsync({
        id: recordId,
        data: { 
          attachments_urls: updatedAttachments,
          last_update_date: format(new Date(), 'yyyy-MM-dd')
        }
      });
      
      alert(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      alert('Error uploading files: ' + error.message);
    }
    
    setUploadingFiles(false);
  };

  const handleRemoveAttachment = async (urlToRemove) => {
    if (!confirm('Remove this attachment?')) return;

    const currentAttachments = record.attachments_urls ? record.attachments_urls.split(',').filter(url => url.trim()) : [];
    const updatedAttachments = currentAttachments.filter(url => url !== urlToRemove).join(',');
    
    await updateRecordMutation.mutateAsync({
      id: recordId,
      data: { 
        attachments_urls: updatedAttachments,
        last_update_date: format(new Date(), 'yyyy-MM-dd')
      }
    });
  };

  const handleAddVisit = async (e) => {
    e.preventDefault();
    await createVisitMutation.mutateAsync({
      ...visitFormData,
      medical_record_id: recordId
    });
  };

  const handleAddClaim = async (e) => {
    e.preventDefault();
    await createClaimMutation.mutateAsync({
      ...claimFormData,
      medical_record_id: recordId
    });
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    
    const updateData = {
      ...editFormData,
      last_update_date: format(new Date(), 'yyyy-MM-dd')
    };
    
    await updateRecordMutation.mutateAsync({
      id: recordId,
      data: updateData
    });
    
    // Auto-create disciplinary action and transfer for unfit status
    if (editFormData.current_medical_status === 'closed_unfit_for_work' && record.technician_id) {
      try {
        // Find termination action type
        const terminationActionType = actionTypes.find(at => at.name?.toLowerCase() === 'termination');
        
        // Create disciplinary action
        await createDisciplinaryMutation.mutateAsync({
          technician_id: record.technician_id,
          date: format(new Date(), 'yyyy-MM-dd'),
          action_type_id: terminationActionType?.id,
          action_type: 'termination',
          severity: 'critical',
          violation: `Medical unfit for work - Medical Record ID: ${recordId}`,
          action_taken: 'Termination due to medical unfitness',
          reported_by: 'Medical Department',
          notes: `Auto-generated from Medical Record (Status: Unfit for Work). Medical incident date: ${record.incident_date || 'N/A'}`,
          termination_reason: 'other'
        });
        
        // Create transfer to Sonapur Exit Camp
        const sonapurExitCamp = camps.find(c => 
          c.camp_type === 'exit_camp' || 
          (c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit'))
        );
        
        const tech = technicians.find(t => t.id === record.technician_id);
        
        if (tech?.camp_id && sonapurExitCamp && tech.camp_id !== sonapurExitCamp.id) {
          const existingTransfer = transferRequests.find(tr => 
            tr.technician_ids?.includes(record.technician_id) &&
            tr.target_camp_id === sonapurExitCamp.id &&
            tr.status !== 'cancelled'
          );
          
          if (!existingTransfer) {
            await createTransferMutation.mutateAsync({
              source_camp_id: tech.camp_id,
              target_camp_id: sonapurExitCamp.id,
              request_date: format(new Date(), 'yyyy-MM-dd'),
              reason_for_movement: 'exit_case',
              technician_ids: [tech.id],
              external_personnel_ids: [],
              status: 'pending_allocation',
              notes: `Auto-generated from Medical Record (Unfit for Work) - Medical Record ID: ${recordId}`
            });
            
            alert('✅ Disciplinary action logged and transfer to Sonapur Exit Camp initiated automatically.');
          }
        }
      } catch (error) {
        console.error('Auto-creation error:', error);
        alert('⚠️ Medical record updated, but automatic disciplinary/transfer creation failed. Please create manually.');
      }
    }
    
    setShowEditDialog(false);
  };

  if (!record) {
    return (
      <div className="p-6 md:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading medical record...</p>
        </div>
      </div>
    );
  }

  const technician = technicians.find(t => t.id === record.technician_id);
  const camp = camps.find(c => c.id === record.camp_id);
  const hospital = hospitals.find(h => h.id === record.hospital_id);
  const attachments = record.attachments_urls ? record.attachments_urls.split(',').filter(url => url.trim()) : [];
  const techPolicy = policies.find(p => p.technician_id === record.technician_id && p.status === 'active');

  const getStatusBadge = (status) => {
    const statusConfig = {
      'open_on_site': { variant: 'secondary', label: 'On-Site Treatment', color: 'bg-blue-100 text-blue-700' },
      'open_hospitalized': { variant: 'destructive', label: 'Hospitalized', color: 'bg-red-100 text-red-700' },
      'open_repatriation_pending': { variant: 'destructive', label: 'Repatriation Pending', color: 'bg-orange-100 text-orange-700' },
      'closed_recovered': { variant: 'default', label: 'Recovered', color: 'bg-green-100 text-green-700' },
      'closed_repatriated': { variant: 'outline', label: 'Repatriated', color: 'bg-purple-100 text-purple-700' },
      'closed_demise': { variant: 'destructive', label: 'Demise', color: 'bg-gray-800 text-white' },
      'closed_unfit_for_work': { variant: 'destructive', label: 'Unfit for Work', color: 'bg-red-100 text-red-700' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', label: status, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      'minor': { color: 'bg-green-100 text-green-700', label: 'Minor' },
      'moderate': { color: 'bg-yellow-100 text-yellow-700', label: 'Moderate' },
      'serious': { color: 'bg-orange-100 text-orange-700', label: 'Serious' },
      'critical': { color: 'bg-red-100 text-red-700', label: 'Critical' }
    };
    
    const config = severityConfig[severity] || { color: 'bg-gray-100 text-gray-700', label: severity };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("MedicalManagement")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Medical Record</h1>
            </div>
          </div>
          <Button 
            onClick={() => {
              setEditFormData({...record});
              setShowEditDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit Record
          </Button>
        </div>

        {/* Technician Info Card */}
        <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Technician</p>
                  <p className="text-2xl font-bold text-blue-900">{technician?.full_name}</p>
                  <p className="text-sm text-blue-700">
                    {technician?.employee_id} • {technician?.nationality} • {camp?.name}
                  </p>
                </div>
              </div>
              <Link to={createPageUrl(`TechnicianMedicalHistory?technician_id=${technician?.id}`)}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Activity className="w-4 h-4 mr-2" />
                  View Full Medical History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Current Status</p>
              {getStatusBadge(record.current_medical_status)}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Severity</p>
              {getSeverityBadge(record.severity)}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Incident Date</p>
              <p className="text-lg font-bold text-gray-900">
                {record.incident_date ? format(parseISO(record.incident_date), 'dd/MM/yyyy') : '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Attachments</p>
              <p className="text-lg font-bold text-gray-900">{attachments.length} files</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="visits">Treatment History ({visits.length})</TabsTrigger>
            <TabsTrigger value="insurance">Insurance & Claims ({claims.length})</TabsTrigger>
            <TabsTrigger value="attachments">Documents ({attachments.length})</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle>Incident Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Technician</Label>
                    <p className="font-medium text-gray-900">{technician?.full_name}</p>
                    <p className="text-sm text-gray-600">{technician?.employee_id}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Camp</Label>
                    <p className="font-medium text-gray-900">{camp?.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Incident Date & Time</Label>
                    <p className="font-medium text-gray-900">
                      {record.incident_date ? format(parseISO(record.incident_date), 'dd/MM/yyyy') : '-'}
                      {record.incident_time && ` at ${record.incident_time}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Incident Type</Label>
                    <p className="font-medium text-gray-900 capitalize">
                      {record.incident_type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600">Initial Symptoms & Diagnosis</Label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {record.initial_symptoms_diagnosis || 'No information provided'}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600">Camp Doctor Notes</Label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {record.camp_doctor_notes || 'No notes available'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Hospital Treatment Section */}
            {record.referred_to_hospital && (
              <Card className="border-none shadow-lg border-l-4 border-l-red-600">
                <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Hospital className="w-5 h-5 text-red-600" />
                    Hospital Treatment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Hospital</Label>
                      <p className="font-medium text-gray-900">{hospital?.name || 'Not specified'}</p>
                      <p className="text-sm text-gray-600">{hospital?.location}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Admission Date</Label>
                      <p className="font-medium text-gray-900">
                        {record.hospital_admission_date ? format(parseISO(record.hospital_admission_date), 'dd/MM/yyyy') : 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Discharge Date</Label>
                      <p className="font-medium text-gray-900">
                        {record.hospital_discharge_date ? format(parseISO(record.hospital_discharge_date), 'dd/MM/yyyy') : 'Still hospitalized'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Repatriation Section */}
            {record.repatriation_required && (
              <Card className="border-none shadow-lg border-l-4 border-l-purple-600">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-purple-600" />
                    Repatriation for Treatment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Status</Label>
                      <Badge className="mt-1 capitalize">
                        {record.repatriation_status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-gray-600">Departure Date</Label>
                      <p className="font-medium text-gray-900">
                        {record.repatriation_departure_date ? format(parseISO(record.repatriation_departure_date), 'dd/MM/yyyy') : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Expected Return</Label>
                      <p className="font-medium text-gray-900">
                        {record.expected_return_date ? format(parseISO(record.expected_return_date), 'dd/MM/yyyy') : 'TBD'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Actual Return</Label>
                      <p className="font-medium text-gray-900">
                        {record.actual_return_date ? format(parseISO(record.actual_return_date), 'dd/MM/yyyy') : 'Not returned yet'}
                      </p>
                    </div>
                  </div>
                  {record.repatriation_flight_details && (
                    <div>
                      <Label className="text-gray-600">Flight Details</Label>
                      <p className="text-gray-900">{record.repatriation_flight_details}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Demise Section */}
            {record.demise_occurred && (
              <Card className="border-none shadow-lg border-l-4 border-l-gray-800 bg-gray-50">
                <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Demise Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Date of Demise</Label>
                      <p className="font-medium text-gray-900">
                        {record.date_of_demise ? format(parseISO(record.date_of_demise), 'dd/MM/yyyy') : '-'}
                        {record.time_of_demise && ` at ${record.time_of_demise}`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Location</Label>
                      <p className="font-medium text-gray-900">{record.demise_location || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-gray-600">Cause of Demise</Label>
                      <p className="font-medium text-gray-900">{record.cause_of_demise || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Next of Kin</Label>
                      <p className="font-medium text-gray-900">{record.next_of_kin_name || '-'}</p>
                      <p className="text-sm text-gray-600">{record.next_of_kin_relationship}</p>
                      <p className="text-sm text-gray-600">{record.next_of_kin_contact}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Government Formalities</Label>
                      <Badge className="mt-1 capitalize">
                        {record.govt_formalities_status?.replace(/_/g, ' ') || 'Not started'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-gray-600">Transport Agent</Label>
                      <p className="font-medium text-gray-900">{record.transport_agent_name || '-'}</p>
                      <p className="text-sm text-gray-600">{record.transport_agent_contact}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Remains Repatriation Date</Label>
                      <p className="font-medium text-gray-900">
                        {record.remains_repatriation_date ? format(parseISO(record.remains_repatriation_date), 'dd/MM/yyyy') : 'Pending'}
                      </p>
                    </div>
                  </div>
                  {record.death_certificate_url && (
                    <div>
                      <Label className="text-gray-600">Death Certificate</Label>
                      <a 
                        href={record.death_certificate_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-2 mt-1"
                      >
                        <FileText className="w-4 h-4" />
                        View Document
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cost Summary */}
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Estimated Cost</Label>
                    <p className="text-2xl font-bold text-gray-900">
                      AED {record.estimated_cost?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Actual Total Cost</Label>
                    <p className="text-2xl font-bold text-green-600">
                      AED {record.actual_total_cost?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatment History Tab */}
          <TabsContent value="visits" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Treatment History & Visits</CardTitle>
                  <Button onClick={() => setShowAddVisitDialog(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Visit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {visits.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No treatment visits recorded yet</p>
                    <Button 
                      onClick={() => setShowAddVisitDialog(true)} 
                      className="mt-4"
                      variant="outline"
                    >
                      Add First Visit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visits.map((visit) => (
                      <Card key={visit.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {visit.visit_date ? format(parseISO(visit.visit_date), 'dd/MM/yyyy') : '-'}
                                {visit.visit_time && ` at ${visit.visit_time}`}
                              </p>
                              <Badge className="mt-1 capitalize">
                                {visit.location?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            {visit.cost_amount && (
                              <p className="text-lg font-bold text-green-600">
                                {visit.currency || 'AED'} {visit.cost_amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                          
                          {visit.provider_name && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Provider:</strong> {visit.provider_name}
                            </p>
                          )}
                          
                          {visit.diagnosis && (
                            <p className="text-sm text-gray-900 mb-2">
                              <strong>Diagnosis:</strong> {visit.diagnosis}
                            </p>
                          )}
                          
                          {visit.treatment_details && (
                            <p className="text-sm text-gray-900 mb-2">
                              <strong>Treatment:</strong> {visit.treatment_details}
                            </p>
                          )}
                          
                          {visit.next_steps && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Next Steps:</strong> {visit.next_steps}
                            </p>
                          )}
                          
                          {visit.duration_days && (
                            <p className="text-sm text-gray-600">
                              <strong>Duration:</strong> {visit.duration_days} days
                            </p>
                          )}
                          
                          <div className="flex gap-2 mt-3">
                            {visit.billing_document_url && (
                              <a 
                                href={visit.billing_document_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Bill
                              </a>
                            )}
                            {visit.prescription_url && (
                              <a 
                                href={visit.prescription_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Prescription
                              </a>
                            )}
                            {visit.medical_report_url && (
                              <a 
                                href={visit.medical_report_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Report
                              </a>
                            )}
                          </div>
                          
                          {visit.notes && (
                            <p className="text-sm text-gray-500 mt-3 italic">
                              {visit.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insurance & Claims Tab */}
          <TabsContent value="insurance" className="space-y-6">
            {/* Insurance Policy Info */}
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-100 border-b">
                <CardTitle>Health Insurance Policy</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {techPolicy ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Provider</Label>
                      <p className="font-medium text-gray-900">{techPolicy.policy_provider}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Policy Number</Label>
                      <p className="font-medium text-gray-900">{techPolicy.policy_number}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Plan Type</Label>
                      <p className="font-medium text-gray-900">{techPolicy.plan_type || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Coverage Period</Label>
                      <p className="font-medium text-gray-900">
                        {techPolicy.coverage_start_date ? format(parseISO(techPolicy.coverage_start_date), 'dd/MM/yyyy') : '-'} to{' '}
                        {techPolicy.coverage_end_date ? format(parseISO(techPolicy.coverage_end_date), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Sum Insured</Label>
                      <p className="text-xl font-bold text-green-600">
                        AED {techPolicy.sum_insured?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Deductible</Label>
                      <p className="font-medium text-gray-900">
                        AED {techPolicy.deductible_amount?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                    <p className="text-gray-600">No active insurance policy found for this technician</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insurance Claims */}
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Insurance Claims</CardTitle>
                  <Button 
                    onClick={() => setShowAddClaimDialog(true)} 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!techPolicy}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    File Claim
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {claims.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No insurance claims filed yet</p>
                    {techPolicy && (
                      <Button 
                        onClick={() => setShowAddClaimDialog(true)} 
                        className="mt-4"
                        variant="outline"
                      >
                        File First Claim
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {claims.map((claim) => (
                      <Card key={claim.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                Claim #{claim.claim_reference_number || claim.id.slice(0, 8)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Filed: {claim.claim_date ? format(parseISO(claim.claim_date), 'dd/MM/yyyy') : '-'}
                              </p>
                              <Badge className={`mt-2 capitalize ${
                                ['approved', 'closed_paid'].includes(claim.claim_status) ? 'bg-green-100 text-green-700' :
                                ['rejected', 'closed_rejected'].includes(claim.claim_status) ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {claim.claim_status?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <Label className="text-xs text-gray-600">Total Bill</Label>
                              <p className="font-semibold text-gray-900">
                                AED {claim.total_bill_amount?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Claimed</Label>
                              <p className="font-semibold text-blue-600">
                                AED {claim.claimed_amount?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Insurance Paid</Label>
                              <p className="font-semibold text-green-600">
                                AED {claim.paid_by_insurance?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Company Paid</Label>
                              <p className="font-semibold text-orange-600">
                                AED {claim.paid_by_company?.toLocaleString() || '0'}
                              </p>
                            </div>
                          </div>
                          
                          {claim.rejection_reason && (
                            <p className="text-sm text-red-600 mb-2">
                              <strong>Rejection Reason:</strong> {claim.rejection_reason}
                            </p>
                          )}
                          
                          {claim.approval_date && (
                            <p className="text-sm text-gray-600">
                              <strong>Approved:</strong> {format(parseISO(claim.approval_date), 'dd/MM/yyyy')}
                            </p>
                          )}
                          
                          {claim.payment_date && (
                            <p className="text-sm text-gray-600">
                              <strong>Payment:</strong> {format(parseISO(claim.payment_date), 'dd/MM/yyyy')}
                            </p>
                          )}
                          
                          {claim.claim_documents_urls && (
                            <div className="mt-3">
                              <Label className="text-xs text-gray-600">Documents</Label>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {claim.claim_documents_urls.split(',').filter(url => url.trim()).map((url, idx) => (
                                  <a 
                                    key={idx}
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Doc {idx + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Medical Documents & Attachments</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploadingFiles}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <Label htmlFor="file-upload">
                      <Button 
                        as="span"
                        disabled={uploadingFiles}
                        className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingFiles ? 'Uploading...' : 'Upload Files'}
                      </Button>
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {attachments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No documents uploaded yet</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Upload medical bills, test reports, prescriptions, x-rays, etc.
                    </p>
                    <Label htmlFor="file-upload">
                      <Button as="span" variant="outline" className="cursor-pointer">
                        Upload First Document
                      </Button>
                    </Label>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attachments.map((url, index) => (
                      <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <FileText className="w-8 h-8 text-indigo-600" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAttachment(url)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-2 truncate">
                            Document {index + 1}
                          </p>
                          <div className="flex gap-2">
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <Button size="sm" variant="outline" className="w-full">
                                <Download className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Visit Dialog */}
      <Dialog open={showAddVisitDialog} onOpenChange={setShowAddVisitDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Treatment Visit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVisit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visit Date*</Label>
                <Input
                  type="date"
                  required
                  value={visitFormData.visit_date || ''}
                  onChange={(e) => setVisitFormData({...visitFormData, visit_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Visit Time*</Label>
                <Input
                  type="time"
                  required
                  value={visitFormData.visit_time || ''}
                  onChange={(e) => setVisitFormData({...visitFormData, visit_time: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Location*</Label>
                <Select
                  required
                  value={visitFormData.location || ''}
                  onValueChange={(value) => setVisitFormData({...visitFormData, location: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camp_clinic">Camp Clinic</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="external_clinic">External Clinic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Provider Name</Label>
                <Input
                  value={visitFormData.provider_name || ''}
                  onChange={(e) => setVisitFormData({...visitFormData, provider_name: e.target.value})}
                  placeholder="Doctor/Nurse name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Textarea
                value={visitFormData.diagnosis || ''}
                onChange={(e) => setVisitFormData({...visitFormData, diagnosis: e.target.value})}
                placeholder="Diagnosis made during this visit..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Treatment Details</Label>
              <Textarea
                value={visitFormData.treatment_details || ''}
                onChange={(e) => setVisitFormData({...visitFormData, treatment_details: e.target.value})}
                placeholder="Medication, procedures, etc..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Next Steps / Follow-up</Label>
              <Textarea
                value={visitFormData.next_steps || ''}
                onChange={(e) => setVisitFormData({...visitFormData, next_steps: e.target.value})}
                placeholder="Required follow-up actions..."
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={visitFormData.duration_days || ''}
                  onChange={(e) => setVisitFormData({...visitFormData, duration_days: parseFloat(e.target.value)})}
                  placeholder="For hospital stays"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={visitFormData.cost_amount || ''}
                  onChange={(e) => setVisitFormData({...visitFormData, cost_amount: parseFloat(e.target.value)})}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={visitFormData.currency || 'AED'}
                  onChange={(e) => setVisitFormData({...visitFormData, currency: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={visitFormData.notes || ''}
                onChange={(e) => setVisitFormData({...visitFormData, notes: e.target.value})}
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddVisitDialog(false);
                setVisitFormData({});
              }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                Add Visit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Claim Dialog */}
      <Dialog open={showAddClaimDialog} onOpenChange={setShowAddClaimDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>File Insurance Claim</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddClaim} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance Policy*</Label>
                <Select
                  required
                  value={claimFormData.health_insurance_policy_id || ''}
                  onValueChange={(value) => setClaimFormData({...claimFormData, health_insurance_policy_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.filter(p => p.technician_id === record.technician_id).map(policy => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.policy_provider} - {policy.policy_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Claim Date*</Label>
                <Input
                  type="date"
                  required
                  value={claimFormData.claim_date || ''}
                  onChange={(e) => setClaimFormData({...claimFormData, claim_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Claim Reference Number</Label>
                <Input
                  value={claimFormData.claim_reference_number || ''}
                  onChange={(e) => setClaimFormData({...claimFormData, claim_reference_number: e.target.value})}
                  placeholder="From insurance provider"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Bill Amount*</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={claimFormData.total_bill_amount || ''}
                  onChange={(e) => setClaimFormData({...claimFormData, total_bill_amount: parseFloat(e.target.value)})}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Claimed Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={claimFormData.claimed_amount || ''}
                  onChange={(e) => setClaimFormData({...claimFormData, claimed_amount: parseFloat(e.target.value)})}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Claim Status</Label>
                <Select
                  value={claimFormData.claim_status || 'submitted'}
                  onValueChange={(value) => setClaimFormData({...claimFormData, claim_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="partially_approved">Partially Approved</SelectItem>
                    <SelectItem value="closed_paid">Closed - Paid</SelectItem>
                    <SelectItem value="closed_rejected">Closed - Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={claimFormData.notes || ''}
                onChange={(e) => setClaimFormData({...claimFormData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddClaimDialog(false);
                setClaimFormData({});
              }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                File Claim
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medical Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRecord} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Status*</Label>
                <Select
                  required
                  value={editFormData.current_medical_status || ''}
                  onValueChange={(value) => setEditFormData({...editFormData, current_medical_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_on_site">On-Site Treatment</SelectItem>
                    <SelectItem value="open_hospitalized">Hospitalized</SelectItem>
                    <SelectItem value="open_repatriation_pending">Repatriation Pending</SelectItem>
                    <SelectItem value="closed_recovered">Recovered</SelectItem>
                    <SelectItem value="closed_repatriated">Repatriated</SelectItem>
                    <SelectItem value="closed_demise">Demise</SelectItem>
                    <SelectItem value="closed_unfit_for_work">Unfit for Work (Termination)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity*</Label>
                <Select
                  required
                  value={editFormData.severity || ''}
                  onValueChange={(value) => setEditFormData({...editFormData, severity: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Camp Doctor Notes</Label>
              <Textarea
                value={editFormData.camp_doctor_notes || ''}
                onChange={(e) => setEditFormData({...editFormData, camp_doctor_notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.estimated_cost || ''}
                  onChange={(e) => setEditFormData({...editFormData, estimated_cost: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Total Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.actual_total_cost || ''}
                  onChange={(e) => setEditFormData({...editFormData, actual_total_cost: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>General Notes</Label>
              <Textarea
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}