import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, Building2, Briefcase, FileText, Activity, AlertTriangle,
  ArrowLeftRight, Calendar, Phone, MapPin, Printer,
  ArrowLeft, Shield, Heart, Plane, CheckCircle2
} from "lucide-react";
import { format, parseISO, differenceInDays, isValid } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TechnicianDetailReport() {
  const urlParams = new URLSearchParams(window.location.search);
  const technicianId = urlParams.get('technician_id');

  const { data: technician } = useQuery({
    queryKey: ['technician', technicianId],
    queryFn: async () => {
      const techs = await base44.entities.Technician.list();
      return techs.find(t => t.id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
  });

  const { data: medicalRecords = [] } = useQuery({
    queryKey: ['medical-records', technicianId],
    queryFn: async () => {
      const records = await base44.entities.MedicalRecord.list('-incident_date');
      return records.filter(r => r.technician_id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: disciplinaryActions = [] } = useQuery({
    queryKey: ['disciplinary', technicianId],
    queryFn: async () => {
      const actions = await base44.entities.DisciplinaryAction.list('-date');
      return actions.filter(a => a.technician_id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: transferLogs = [] } = useQuery({
    queryKey: ['transfer-logs', technicianId],
    queryFn: async () => {
      const logs = await base44.entities.TechnicianTransferLog.list('-transfer_date');
      return logs.filter(l => l.technician_id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', technicianId],
    queryFn: async () => {
      const docs = await base44.entities.TechnicianDocument.list('-expiry_date');
      return docs.filter(d => d.technician_id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests', technicianId],
    queryFn: async () => {
      const leaves = await base44.entities.LeaveRequest.list('-start_date');
      return leaves.filter(l => l.technician_id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: dailyStatus = [] } = useQuery({
    queryKey: ['daily-status', technicianId],
    queryFn: async () => {
      const status = await base44.entities.DailyStatus.list('-date');
      return status.filter(s => s.technician_id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: actionTypes = [] } = useQuery({
    queryKey: ['disciplinary-action-types'],
    queryFn: () => base44.entities.DisciplinaryActionType.list(),
  });

  const safeFormatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'dd/MM/yyyy') : '-';
    } catch {
      return '-';
    }
  };

  const safeDaysDiff = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? differenceInDays(date, new Date()) : null;
    } catch {
      return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (!technician) {
    return (
      <div className="p-6 md:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading technician report...</p>
        </div>
      </div>
    );
  }

  const camp = camps.find(c => c.id === technician.camp_id);
  const project = projects.find(p => p.id === technician.project_id);
  const bed = beds.find(b => b.id === technician.bed_id);
  const room = bed ? rooms.find(r => r.id === bed.room_id) : null;
  const floor = room ? floors.find(f => f.id === room.floor_id) : null;
  const mealPref = mealPreferences.find(m => m.id === technician.meal_preference_id);

  const expiringDocs = documents.filter(d => {
    const daysLeft = safeDaysDiff(d.expiry_date);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
  });

  const expiredDocs = documents.filter(d => {
    const daysLeft = safeDaysDiff(d.expiry_date);
    return daysLeft !== null && daysLeft < 0;
  });

  const openMedicalCases = medicalRecords.filter(r => r.current_medical_status?.startsWith('open_'));
  const totalLeaves = leaveRequests.length;
  const approvedLeaves = leaveRequests.filter(l => l.status === 'approved').length;

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; }
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6 print-full-width">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Technicians")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Technician Detailed Report</h1>
              <p className="text-gray-600">Comprehensive profile and history</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePrint} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Print Header - only visible when printing */}
        <div className="hidden print:block mb-6 border-b-2 border-gray-300 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">TECHNICIAN DETAILED REPORT</h1>
          <p className="text-sm text-gray-600">Generated on: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        {/* Profile Header Card */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <User className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">{technician.full_name}</h2>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-white/20 text-white border-white/30 text-sm">
                      {technician.employee_id}
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30 text-sm">
                      {technician.nationality}
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30 text-sm">
                      {technician.trade}
                    </Badge>
                    <Badge className={`text-sm ${technician.status === 'active' ? 'bg-green-500 text-white' :
                      technician.status === 'pending_arrival' ? 'bg-yellow-500 text-white' :
                        technician.status === 'on_leave' ? 'bg-blue-500 text-white' :
                          'bg-red-500 text-white'
                      }`}>
                      {technician.status?.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-red-600" />
                <Badge className="bg-red-100 text-red-700">{openMedicalCases.length}</Badge>
              </div>
              <p className="text-xs text-gray-600 mb-1">Open Medical Cases</p>
              <p className="text-lg font-bold text-gray-900">{medicalRecords.length} Total</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                <Badge className="bg-orange-100 text-orange-700">{disciplinaryActions.length}</Badge>
              </div>
              <p className="text-xs text-gray-600 mb-1">Disciplinary Actions</p>
              <p className="text-lg font-bold text-gray-900">Total Cases</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <ArrowLeftRight className="w-8 h-8 text-purple-600" />
                <Badge className="bg-purple-100 text-purple-700">{transferLogs.length}</Badge>
              </div>
              <p className="text-xs text-gray-600 mb-1">Camp Transfers</p>
              <p className="text-lg font-bold text-gray-900">History</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-100 text-green-700">{approvedLeaves}</Badge>
              </div>
              <p className="text-xs text-gray-600 mb-1">Approved Leaves</p>
              <p className="text-lg font-bold text-gray-900">{totalLeaves} Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Document Expiry Alerts */}
        {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
          <Alert className="border-l-4 border-l-red-600 bg-red-50 no-print">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription>
              <p className="font-semibold text-red-900">Document Expiry Alerts:</p>
              {expiredDocs.length > 0 && (
                <p className="text-sm text-red-700">{expiredDocs.length} expired document(s)</p>
              )}
              {expiringDocs.length > 0 && (
                <p className="text-sm text-orange-700">{expiringDocs.length} expiring within 30 days</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="bg-white shadow-sm no-print">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="medical">Medical ({medicalRecords.length})</TabsTrigger>
            <TabsTrigger value="disciplinary">Disciplinary ({disciplinaryActions.length})</TabsTrigger>
            <TabsTrigger value="transfers">Transfers ({transferLogs.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="leaves">Leaves ({leaveRequests.length})</TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Full Name</p>
                    <p className="font-semibold text-gray-900">{technician.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Employee ID</p>
                    <p className="font-semibold text-blue-600">{technician.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Date of Birth</p>
                    <p className="font-semibold text-gray-900">{safeFormatDate(technician.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Nationality</p>
                    <p className="font-semibold text-gray-900">{technician.nationality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Ethnicity</p>
                    <p className="font-semibold text-gray-900">{technician.ethnicity || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Religion</p>
                    <p className="font-semibold text-gray-900">{technician.religion || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Gender</p>
                    <p className="font-semibold text-gray-900 capitalize">{technician.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Marital Status</p>
                    <p className="font-semibold text-gray-900 capitalize">{technician.marital_status || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">State/Province</p>
                    <p className="font-semibold text-gray-900">{technician.state || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Phone</p>
                    <p className="font-semibold text-gray-900">{technician.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">WhatsApp</p>
                    <p className="font-semibold text-gray-900">{technician.whatsapp_mobile || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{technician.email || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Language Preference</p>
                    <p className="font-semibold text-gray-900">{technician.language_preference || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      Secondary WhatsApp
                      {technician.secondary_whatsapp && <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">NEW</Badge>}
                    </p>
                    <p className="font-semibold text-gray-900">{technician.secondary_whatsapp || '-'}</p>
                  </div>
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-6 bg-red-50 p-4 rounded-lg border border-red-100">
                    <div>
                      <p className="text-xs text-red-800 mb-1 font-semibold">Emergency Contact 1</p>
                      <p className="font-semibold text-gray-900">{technician.emergency_contact_no || '-'}</p>
                      <p className="text-xs text-gray-500">{technician.emergency_contact_no_relationship || 'Relationship not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-800 mb-1 font-semibold">Emergency Contact 2</p>
                      <p className="font-semibold text-gray-900">{technician.emergency_contact_no_2 || '-'}</p>
                      <p className="text-xs text-gray-500">{technician.emergency_contact_no_2_relationship || 'Relationship not specified'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Legal Nominee
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Nominee Name</p>
                    <p className="font-semibold text-gray-900">{technician.legal_nominee_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Relationship</p>
                    <p className="font-semibold text-gray-900 capitalize">{technician.nominee_relationship || '-'}</p>
                  </div>
                  {technician.legal_nominee_attachment_url && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-600 mb-1">Declaration Form</p>
                      <a href={technician.legal_nominee_attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        View Attached Document
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Identity Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Passport Number</p>
                    <p className="font-semibold text-gray-900">{technician.passport_no || '-'}</p>
                    <p className="text-xs text-gray-500">Expires: {safeFormatDate(technician.passport_expiry_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Emirates ID</p>
                    <p className="font-semibold text-gray-900">{technician.eid_number || '-'}</p>
                    <p className="text-xs text-gray-500">Expires: {safeFormatDate(technician.eid_expiry_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Health Insurance</p>
                    <p className="font-semibold text-gray-900">{technician.health_insurance_no || '-'}</p>
                    <p className="text-xs text-gray-500">Expires: {safeFormatDate(technician.health_insurance_expiry_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employment Information */}
          <TabsContent value="employment" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Department</p>
                    <p className="font-semibold text-gray-900">{technician.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Trade/Skill</p>
                    <p className="font-semibold text-gray-900">{technician.trade || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Current Project</p>
                    <p className="font-semibold text-gray-900">{project?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Project Assigned Date</p>
                    <p className="font-semibold text-gray-900">{safeFormatDate(technician.project_assigned_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Status</p>
                    <Badge className={
                      technician.status === 'active' ? 'bg-green-100 text-green-700' :
                        technician.status === 'on_leave' ? 'bg-blue-100 text-blue-700' :
                          technician.status === 'pending_arrival' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                    }>
                      {technician.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Induction Status</p>
                    <Badge variant="outline" className="capitalize">
                      {technician.induction_status?.replace(/_/g, ' ') || 'Not started'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Current Accommodation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Camp</p>
                    <p className="font-semibold text-gray-900">{camp?.name || '-'}</p>
                    {camp?.location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {camp.location}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Room Assignment</p>
                    {bed && room && floor ? (
                      <div>
                        <p className="font-semibold text-gray-900">
                          Floor {floor.floor_number} - Room {room.room_number} - Bed {bed.bed_number}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Capacity: {room.capacity} | Gender: {room.gender_restriction}
                        </p>
                      </div>
                    ) : (
                      <p className="font-semibold text-red-600">No bed assigned</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Meal Preference</p>
                    <p className="font-semibold text-gray-900">{mealPref?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Last Transfer Date</p>
                    <p className="font-semibold text-gray-900">{safeFormatDate(technician.last_transfer_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {technician.status === 'pending_arrival' && (
              <Card className="border-none shadow-lg border-l-4 border-l-yellow-600">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-yellow-600" />
                    Arrival Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Expected Arrival Date</p>
                      <p className="font-semibold text-gray-900">{safeFormatDate(technician.expected_arrival_date)}</p>
                      {technician.expected_arrival_time && (
                        <p className="text-xs text-gray-500">Time: {technician.expected_arrival_time}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Flight Details</p>
                      <p className="font-semibold text-gray-900">{technician.flight_number || '-'}</p>
                      <p className="text-xs text-gray-500">{technician.airline || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Ticket Reference</p>
                      <p className="font-semibold text-gray-900">{technician.ticket_ref || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Pickup Status</p>
                      <Badge className={
                        technician.pickup_status === 'picked_up' ? 'bg-green-100 text-green-700' :
                          technician.pickup_status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                      }>
                        {technician.pickup_status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Medical History */}
          <TabsContent value="medical" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600" />
                  Medical Records History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {medicalRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No medical records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicalRecords.map((record) => {
                      const hospital = hospitals.find(h => h.id === record.hospital_id);
                      return (
                        <Card key={record.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {safeFormatDate(record.incident_date)}
                                  {record.incident_time && ` at ${record.incident_time}`}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <Badge className="capitalize">
                                    {record.incident_type?.replace(/_/g, ' ')}
                                  </Badge>
                                  <Badge className={
                                    record.severity === 'critical' ? 'bg-red-600 text-white' :
                                      record.severity === 'serious' ? 'bg-orange-600 text-white' :
                                        record.severity === 'moderate' ? 'bg-yellow-600 text-white' :
                                          'bg-green-600 text-white'
                                  }>
                                    {record.severity}
                                  </Badge>
                                  <Badge className={
                                    record.current_medical_status?.startsWith('open_') ? 'bg-red-100 text-red-700' :
                                      'bg-green-100 text-green-700'
                                  }>
                                    {record.current_medical_status?.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              </div>
                              {record.actual_total_cost && (
                                <p className="text-lg font-bold text-green-600">
                                  AED {record.actual_total_cost.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Diagnosis:</strong> {record.initial_symptoms_diagnosis || 'No details'}
                            </p>
                            {record.referred_to_hospital && hospital && (
                              <p className="text-sm text-gray-600">
                                <strong>Hospital:</strong> {hospital.name}
                              </p>
                            )}
                            {record.camp_doctor_notes && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Notes:</strong> {record.camp_doctor_notes}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disciplinary History */}
          <TabsContent value="disciplinary" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Disciplinary Action History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {disciplinaryActions.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">No disciplinary actions recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {disciplinaryActions.map((action) => {
                      const actionType = actionTypes.find(at => at.id === action.action_type_id);
                      return (
                        <Card key={action.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-semibold text-gray-900">{safeFormatDate(action.date)}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline">
                                    {actionType?.name || action.action_type?.replace(/_/g, ' ')}
                                  </Badge>
                                  <Badge className={
                                    action.severity === 'critical' ? 'bg-red-600 text-white' :
                                      action.severity === 'major' ? 'bg-red-500 text-white' :
                                        action.severity === 'moderate' ? 'bg-yellow-600 text-white' :
                                          'bg-blue-600 text-white'
                                  }>
                                    {action.severity}
                                  </Badge>
                                </div>
                              </div>
                              {action.follow_up_required && (
                                <Badge className="bg-yellow-100 text-yellow-700">Follow-up Required</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mb-2">
                              <strong>Violation:</strong> {action.violation}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Action Taken:</strong> {action.action_taken}
                            </p>
                            {action.reported_by && (
                              <p className="text-sm text-gray-600">
                                <strong>Reported By:</strong> {action.reported_by}
                              </p>
                            )}
                            {action.witness && (
                              <p className="text-sm text-gray-600">
                                <strong>Witness:</strong> {action.witness}
                              </p>
                            )}
                            {action.notes && (
                              <p className="text-sm text-gray-500 mt-2 italic">{action.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfer History */}
          <TabsContent value="transfers" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                  Transfer History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {transferLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No transfer history</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transferLogs.map((log) => {
                      const fromCamp = camps.find(c => c.id === log.from_camp_id);
                      const toCamp = camps.find(c => c.id === log.to_camp_id);
                      return (
                        <Card key={log.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-semibold text-gray-900">
                                {safeFormatDate(log.transfer_date)}
                                {log.transfer_time && ` at ${log.transfer_time}`}
                              </p>
                              <Badge className="capitalize">
                                {log.reason_for_movement?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex-1 p-3 bg-red-50 rounded border border-red-200">
                                <p className="text-xs text-red-600 mb-1">From</p>
                                <p className="font-medium text-gray-900">{fromCamp?.name || 'Unknown'}</p>
                              </div>
                              <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                              <div className="flex-1 p-3 bg-green-50 rounded border border-green-200">
                                <p className="text-xs text-green-600 mb-1">To</p>
                                <p className="font-medium text-gray-900">{toCamp?.name || 'Unknown'}</p>
                              </div>
                            </div>
                            {log.notes && (
                              <p className="text-sm text-gray-500 mt-3 italic">{log.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Document Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No documents on record</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Document Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Number</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Issue Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expiry Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days Until Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc, index) => {
                          const daysLeft = safeDaysDiff(doc.expiry_date);
                          return (
                            <tr key={doc.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                                {doc.document_type?.replace(/_/g, ' ')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{doc.document_number || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{safeFormatDate(doc.issue_date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{safeFormatDate(doc.expiry_date)}</td>
                              <td className="px-4 py-3 text-sm">
                                <Badge className={
                                  doc.status === 'expired' ? 'bg-red-600 text-white' :
                                    doc.status === 'expiring_soon' ? 'bg-yellow-600 text-white' :
                                      'bg-green-600 text-white'
                                }>
                                  {doc.status?.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {daysLeft !== null ? (
                                  <span className={
                                    daysLeft < 0 ? 'text-red-600 font-bold' :
                                      daysLeft <= 30 ? 'text-orange-600 font-bold' :
                                        'text-gray-700'
                                  }>
                                    {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days`}
                                  </span>
                                ) : '-'}
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

          {/* Leave Requests */}
          <TabsContent value="leaves" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Leave Request History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No leave requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaveRequests.map((leave) => (
                      <Card key={leave.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 capitalize">
                                {leave.leave_type?.replace(/_/g, ' ')} Leave
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {safeFormatDate(leave.start_date)} to {safeFormatDate(leave.end_date)}
                                {leave.duration_days && ` (${leave.duration_days} days)`}
                              </p>
                            </div>
                            <Badge className={
                              leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                                leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                            }>
                              {leave.status}
                            </Badge>
                          </div>
                          {leave.reason && (
                            <p className="text-sm text-gray-700">
                              <strong>Reason:</strong> {leave.reason}
                            </p>
                          )}
                          {leave.bed_action && (
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Bed Action:</strong> {leave.bed_action?.replace(/_/g, ' ')}
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
        </Tabs>

        {/* Summary Footer - Print Only */}
        <div className="hidden print:block mt-8 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900">Report Generated:</p>
              <p className="text-gray-700">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">Technician ID:</p>
              <p className="text-gray-700">{technician.employee_id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}