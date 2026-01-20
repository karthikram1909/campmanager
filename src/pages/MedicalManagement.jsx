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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus, Search, Activity, AlertCircle, Hospital, FileText,
  DollarSign, TrendingUp, Users, Ambulance, X, Eye, CheckCircle2, Clock
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MedicalManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [sickLeaveRequired, setSickLeaveRequired] = useState(false);
  const [sickLeaveFromDate, setSickLeaveFromDate] = useState('');
  const [sickLeaveToDate, setSickLeaveToDate] = useState('');

  const queryClient = useQueryClient();

  const { data: medicalRecords = [] } = useQuery({
    queryKey: ['medical-records'],
    queryFn: () => base44.entities.MedicalRecord.list('-incident_date'),
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

  const { data: insuranceClaims = [] } = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: () => base44.entities.InsuranceClaim.list(),
  });

  const { data: insurancePolicies = [] } = useQuery({
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

  const createRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      setShowAddRecordDialog(false);
      setFormData({});
      setAttachments([]);
      alert("Medical record added successfully!");
    },
    onError: (error) => {
      console.error("Error creating medical record:", error);
      alert(`Error creating record: ${error.message}`);
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

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  // Calculate statistics
  const openCases = medicalRecords.filter(r => r.current_medical_status?.startsWith('open_')).length;
  const hospitalized = medicalRecords.filter(r => r.current_medical_status === 'open_hospitalized').length;
  const repatriated = medicalRecords.filter(r => r.current_medical_status === 'closed_repatriated').length;
  const demises = medicalRecords.filter(r => r.demise_occurred === true).length;

  // Claims statistics
  const totalClaimsSubmitted = insuranceClaims.length;
  const claimsPending = insuranceClaims.filter(c => ['submitted', 'processing'].includes(c.claim_status)).length;
  const claimsRejected = insuranceClaims.filter(c => ['rejected', 'closed_rejected'].includes(c.claim_status)).length;

  const totalBillAmount = insuranceClaims.reduce((sum, c) => sum + (c.total_bill_amount || 0), 0);
  const totalPaidByInsurance = insuranceClaims.reduce((sum, c) => sum + (c.paid_by_insurance || 0), 0);
  const totalPaidByCompany = insuranceClaims.reduce((sum, c) => sum + (c.paid_by_company || 0), 0);

  // Policy statistics
  const activePolicies = insurancePolicies.filter(p => p.status === 'active').length;
  const expiringPolicies = insurancePolicies.filter(p => {
    if (p.status !== 'active' || !p.coverage_end_date) return false;
    const daysUntilExpiry = differenceInDays(parseISO(p.coverage_end_date), new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }).length;

  // Filter medical records
  let filteredRecords = medicalRecords.filter(record => {
    const tech = technicians.find(t => t.id === record.technician_id);
    const matchesSearch = !searchQuery ||
      tech?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || record.current_medical_status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || record.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
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

      setAttachments(prev => [...prev, ...newUrls]);
    } catch (error) {
      alert('Error uploading files: ' + error.message);
    }

    setUploadingFiles(false);
  };

  const removeAttachment = (urlToRemove) => {
    setAttachments(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dataToSubmit = {
      ...formData,
      last_update_date: format(new Date(), 'yyyy-MM-dd'),
      attachments_urls: attachments.join(',')
    };

    const createdRecord = await createRecordMutation.mutateAsync(dataToSubmit);

    // Update technician's current_medical_record_id if case is open
    if (dataToSubmit.current_medical_status?.startsWith('open_')) {
      const latestRecord = await base44.entities.MedicalRecord.list('-created_date', 1);
      if (latestRecord[0]) {
        await updateTechnicianMutation.mutateAsync({
          id: dataToSubmit.technician_id,
          data: { current_medical_record_id: latestRecord[0].id }
        });
      }
    }

    // Auto-create disciplinary action and transfer for unfit status
    if (dataToSubmit.current_medical_status === 'closed_unfit_for_work' && dataToSubmit.technician_id) {
      try {
        const latestRecord = await base44.entities.MedicalRecord.list('-created_date', 1);
        const recordId = latestRecord[0]?.id;

        const terminationActionType = actionTypes.find(at => at.name?.toLowerCase() === 'termination');

        await createDisciplinaryMutation.mutateAsync({
          technician_id: dataToSubmit.technician_id,
          date: format(new Date(), 'yyyy-MM-dd'),
          action_type_id: terminationActionType?.id,
          action_type: 'termination',
          severity: 'critical',
          violation: `Medical unfit for work - Medical Record ID: ${recordId || 'N/A'}`,
          action_taken: 'Termination due to medical unfitness',
          reported_by: 'Medical Department',
          notes: `Auto-generated from Medical Record (Status: Unfit for Work). Medical incident date: ${dataToSubmit.incident_date || 'N/A'}`,
          termination_reason: 'other'
        });

        const sonapurExitCamp = camps.find(c =>
          c.camp_type === 'exit_camp' ||
          (c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit'))
        );

        const tech = technicians.find(t => t.id === dataToSubmit.technician_id);

        if (tech?.camp_id && sonapurExitCamp && tech.camp_id !== sonapurExitCamp.id) {
          const existingTransfer = transferRequests.find(tr =>
            tr.technician_ids?.includes(dataToSubmit.technician_id) &&
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
              notes: `Auto-generated from Medical Record (Unfit for Work) - Medical Record ID: ${recordId || 'N/A'}`
            });

            alert('✅ Disciplinary action logged and transfer to Sonapur Exit Camp initiated automatically.');
          }
        }
      } catch (error) {
        console.error('Auto-creation error:', error);
      }
    }

    // If sick leave is required, create daily activity logs and update technician status
    if (sickLeaveRequired && sickLeaveFromDate && sickLeaveToDate) {
      const fromDate = new Date(sickLeaveFromDate);
      const toDate = new Date(sickLeaveToDate);

      // Create daily status entries for each day
      const dailyStatusRecords = [];
      for (let date = new Date(fromDate); date <= toDate; date.setDate(date.getDate() + 1)) {
        dailyStatusRecords.push({
          technician_id: dataToSubmit.technician_id,
          date: format(date, 'yyyy-MM-dd'),
          status_type: 'on_leave_sick',
          notes: 'Sick Leave Reason: Dr approved'
        });
      }

      // Bulk create daily status entries
      if (dailyStatusRecords.length > 0) {
        await base44.entities.DailyStatus.bulkCreate(dailyStatusRecords);
      }

      // Update technician status to on_leave
      await updateTechnicianMutation.mutateAsync({
        id: dataToSubmit.technician_id,
        data: { status: 'on_leave' }
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'open_on_site': { variant: 'secondary', label: 'On-Site Treatment' },
      'open_hospitalized': { variant: 'destructive', label: 'Hospitalized' },
      'open_repatriation_pending': { variant: 'destructive', label: 'Repatriation Pending' },
      'closed_recovered': { variant: 'default', label: 'Recovered' },
      'closed_repatriated': { variant: 'outline', label: 'Repatriated' },
      'closed_demise': { variant: 'destructive', label: 'Demise' },
      'closed_unfit_for_work': { variant: 'destructive', label: 'Unfit for Work' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      'minor': { color: 'text-green-700 bg-green-100', label: 'Minor' },
      'moderate': { color: 'text-yellow-700 bg-yellow-100', label: 'Moderate' },
      'serious': { color: 'text-orange-700 bg-orange-100', label: 'Serious' },
      'critical': { color: 'text-red-700 bg-red-100', label: 'Critical' }
    };

    const config = severityConfig[severity] || { color: 'text-gray-700 bg-gray-100', label: severity };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Medical Management</h1>
              <p className="text-gray-600">Track medical cases, insurance, and claims</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Hospitals")}>
              <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                <Hospital className="w-4 h-4 mr-2" />
                Manage Hospitals
              </Button>
            </Link>
            <Button onClick={() => setShowAddRecordDialog(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              New Medical Record
            </Button>
          </div>
        </div>

        {/* Summary Cards - Medical Cases */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Open Cases</p>
                  <p className="text-3xl font-bold text-blue-900">{openCases}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Currently Hospitalized</p>
                  <p className="text-3xl font-bold text-red-900">{hospitalized}</p>
                </div>
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                  <Ambulance className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">Repatriated</p>
                  <p className="text-3xl font-bold text-orange-900">{repatriated}</p>
                </div>
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-gray-50 to-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Demise Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{demises}</p>
                </div>
                <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards - Insurance & Claims */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Total Claims</p>
                  <p className="text-3xl font-bold text-purple-900">{totalClaimsSubmitted}</p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">Claims Pending</p>
                  <p className="text-3xl font-bold text-yellow-900">{claimsPending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Active Policies</p>
                  <p className="text-3xl font-bold text-green-900">{activePolicies}</p>
                  <p className="text-xs text-green-600 mt-1">{expiringPolicies} expiring soon</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-cyan-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-600 mb-1">Paid by Insurance</p>
                  <p className="text-2xl font-bold text-cyan-900">AED {totalPaidByInsurance.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-pink-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-pink-600 mb-1">Company Paid</p>
                  <p className="text-2xl font-bold text-pink-900">AED {totalPaidByCompany.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by technician name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open_on_site">On-Site Treatment</SelectItem>
                  <SelectItem value="open_hospitalized">Hospitalized</SelectItem>
                  <SelectItem value="open_repatriation_pending">Repatriation Pending</SelectItem>
                  <SelectItem value="closed_recovered">Recovered</SelectItem>
                  <SelectItem value="closed_repatriated">Repatriated</SelectItem>
                  <SelectItem value="closed_demise">Demise</SelectItem>
                  <SelectItem value="closed_unfit_for_work">Unfit for Work</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="serious">Serious</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Medical Records Table */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
            <CardTitle>Medical Records ({filteredRecords.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Technician</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Incident Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Hospital</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Insurance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Attachments</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No medical records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => {
                    const tech = technicians.find(t => t.id === record.technician_id);
                    const camp = camps.find(c => c.id === record.camp_id);
                    const hospital = hospitals.find(h => h.id === record.hospital_id);
                    const recordClaims = insuranceClaims.filter(c => c.medical_record_id === record.id);
                    const recordAttachments = record.attachments_urls ? record.attachments_urls.split(',').filter(url => url.trim()) : [];

                    return (
                      <tr
                        key={record.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{tech?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-600">{tech?.employee_id}</p>
                            <p className="text-xs text-gray-500">{camp?.name}</p>
                            {tech?.id && (
                              <Link to={createPageUrl(`TechnicianMedicalHistory?technician_id=${tech.id}`)}>
                                <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  View Full Medical History →
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.incident_date ? format(parseISO(record.incident_date), 'dd/MM/yyyy') : '-'}
                          {record.incident_time && <p className="text-xs text-gray-500">{record.incident_time}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {record.incident_type?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3">
                          {getSeverityBadge(record.severity)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(record.current_medical_status)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.referred_to_hospital ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <Hospital className="w-4 h-4" />
                              <span>{hospital?.name || 'Hospital'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Camp clinic</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {recordClaims.length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {recordClaims.length} claim{recordClaims.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">No claims</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {recordAttachments.length > 0 ? (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              {recordAttachments.length} file{recordAttachments.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">No files</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link to={createPageUrl(`MedicalRecordDetail?id=${record.id}`)}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add Medical Record Dialog */}
      <Dialog open={showAddRecordDialog} onOpenChange={setShowAddRecordDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Medical Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Technician*</Label>
                <Select
                  required
                  value={formData.technician_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, technician_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians
                      .filter(tech => tech.status === 'active')
                      .map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.full_name} ({tech.employee_id})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Camp*</Label>
                <Select
                  required
                  value={formData.camp_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, camp_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select camp" />
                  </SelectTrigger>
                  <SelectContent>
                    {camps.map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Incident Date*</Label>
                <Input
                  type="date"
                  required
                  value={formData.incident_date || ''}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Incident Time*</Label>
                <Input
                  type="time"
                  required
                  value={formData.incident_time || ''}
                  onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Incident Type*</Label>
                <Select
                  required
                  value={formData.incident_type || ''}
                  onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="illness">Illness</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="pre_existing_condition">Pre-existing Condition</SelectItem>
                    <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity*</Label>
                <Select
                  required
                  value={formData.severity || ''}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
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
              <Label>Initial Symptoms & Diagnosis</Label>
              <Textarea
                value={formData.initial_symptoms_diagnosis || ''}
                onChange={(e) => setFormData({ ...formData, initial_symptoms_diagnosis: e.target.value })}
                placeholder="Describe symptoms and initial diagnosis..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Camp Doctor Notes</Label>
              <Textarea
                value={formData.camp_doctor_notes || ''}
                onChange={(e) => setFormData({ ...formData, camp_doctor_notes: e.target.value })}
                placeholder="Notes from camp medical staff..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Current Medical Status</Label>
              <Select
                value={formData.current_medical_status || 'open_on_site'}
                onValueChange={(value) => setFormData({ ...formData, current_medical_status: value })}
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

            {/* Sick Leave Section */}
            <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-orange-900">Sick Leave Required?</Label>
                  <Select
                    value={sickLeaveRequired ? 'yes' : 'no'}
                    onValueChange={(value) => {
                      setSickLeaveRequired(value === 'yes');
                      if (value === 'no') {
                        setSickLeaveFromDate('');
                        setSickLeaveToDate('');
                      }
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sickLeaveRequired && (
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>From Date*</Label>
                      <Input
                        type="date"
                        required
                        value={sickLeaveFromDate}
                        onChange={(e) => setSickLeaveFromDate(e.target.value)}
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To Date*</Label>
                      <Input
                        type="date"
                        required
                        value={sickLeaveToDate}
                        onChange={(e) => setSickLeaveToDate(e.target.value)}
                        min={sickLeaveFromDate}
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {sickLeaveRequired && sickLeaveFromDate && sickLeaveToDate && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-sm text-blue-900">
                      <strong>Note:</strong> This will automatically:
                      <ul className="list-disc ml-5 mt-1">
                        <li>Create daily activity log entries for sick leave (Dr approved)</li>
                        <li>Update technician status to "On Leave"</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload Documents/Attachments</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploadingFiles}
                  className="mb-2"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                {uploadingFiles && (
                  <p className="text-sm text-blue-600 mb-2">Uploading files...</p>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium text-gray-700">Uploaded Files ({attachments.length}):</p>
                    {attachments.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate flex-1"
                        >
                          File {idx + 1}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(url)}
                          className="ml-2"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload medical reports, bills, prescriptions, x-rays, etc. (PDF, JPG, PNG, DOC)
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddRecordDialog(false);
                setFormData({});
                setAttachments([]);
                setSickLeaveRequired(false);
                setSickLeaveFromDate('');
                setSickLeaveToDate('');
              }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={uploadingFiles}>
                Create Medical Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}