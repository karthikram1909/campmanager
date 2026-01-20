import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Activity, Calendar, Hospital, 
  FileText, TrendingUp, Users, Eye, Filter
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TechnicianMedicalHistory() {
  const urlParams = new URLSearchParams(window.location.search);
  const technicianId = urlParams.get('technician_id');

  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const { data: technician } = useQuery({
    queryKey: ['technician', technicianId],
    queryFn: async () => {
      const techs = await base44.entities.Technician.list();
      return techs.find(t => t.id === technicianId);
    },
    enabled: !!technicianId,
  });

  const { data: allMedicalRecords = [] } = useQuery({
    queryKey: ['medical-records'],
    queryFn: () => base44.entities.MedicalRecord.list('-incident_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const { data: allVisits = [] } = useQuery({
    queryKey: ['medical-visits'],
    queryFn: () => base44.entities.MedicalVisit.list(),
  });

  const { data: allClaims = [] } = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: () => base44.entities.InsuranceClaim.list(),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: () => base44.entities.HealthInsurancePolicy.list(),
  });

  // Filter records for this technician
  const technicianRecords = allMedicalRecords.filter(r => r.technician_id === technicianId);

  // Get unique years from records
  const years = [...new Set(technicianRecords
    .map(r => r.incident_date ? new Date(r.incident_date).getFullYear() : null)
    .filter(y => y !== null)
  )].sort((a, b) => b - a);

  // Apply filters
  let filteredRecords = technicianRecords.filter(record => {
    const matchesStatus = statusFilter === 'all' || record.current_medical_status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || record.severity === severityFilter;
    const matchesYear = yearFilter === 'all' || 
      (record.incident_date && new Date(record.incident_date).getFullYear().toString() === yearFilter);
    
    return matchesStatus && matchesSeverity && matchesYear;
  });

  // Calculate statistics
  const totalIncidents = technicianRecords.length;
  const openCases = technicianRecords.filter(r => r.current_medical_status?.startsWith('open_')).length;
  const closedCases = technicianRecords.filter(r => r.current_medical_status?.startsWith('closed_')).length;
  const hospitalizations = technicianRecords.filter(r => r.referred_to_hospital).length;
  const repatriations = technicianRecords.filter(r => r.repatriation_required).length;

  // Calculate total costs
  const totalCosts = technicianRecords.reduce((sum, r) => sum + (r.actual_total_cost || 0), 0);

  // Get total visits
  const totalVisits = allVisits.filter(v => 
    technicianRecords.some(r => r.id === v.medical_record_id)
  ).length;

  // Get total claims
  const totalClaims = allClaims.filter(c => 
    technicianRecords.some(r => r.id === c.medical_record_id)
  ).length;

  // Get active insurance policy
  const activePolicy = policies.find(p => p.technician_id === technicianId && p.status === 'active');

  const getStatusBadge = (status) => {
    const statusConfig = {
      'open_on_site': { color: 'bg-blue-100 text-blue-700', label: 'On-Site' },
      'open_hospitalized': { color: 'bg-red-100 text-red-700', label: 'Hospitalized' },
      'open_repatriation_pending': { color: 'bg-orange-100 text-orange-700', label: 'Repatriation Pending' },
      'closed_recovered': { color: 'bg-green-100 text-green-700', label: 'Recovered' },
      'closed_repatriated': { color: 'bg-purple-100 text-purple-700', label: 'Repatriated' },
      'closed_demise': { color: 'bg-gray-800 text-white', label: 'Demise' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
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

  if (!technician) {
    return (
      <div className="p-6 md:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading technician data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">
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
              <h1 className="text-3xl font-bold text-gray-900">Complete Medical History</h1>
              <p className="text-gray-600 mt-1">
                {technician.full_name} ({technician.employee_id}) - {technician.nationality}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{totalIncidents}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Open Cases</p>
              <p className="text-2xl font-bold text-orange-900">{openCases}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Hospital className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Hospitalizations</p>
              <p className="text-2xl font-bold text-red-900">{hospitalizations}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Visits</p>
              <p className="text-2xl font-bold text-purple-900">{totalVisits}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Insurance Claims</p>
              <p className="text-2xl font-bold text-indigo-900">{totalClaims}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Costs</p>
              <p className="text-xl font-bold text-green-900">
                AED {totalCosts.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Insurance Policy */}
        {activePolicy && (
          <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Active Insurance Policy</p>
                  <p className="text-lg font-bold text-blue-900">{activePolicy.policy_provider}</p>
                  <p className="text-sm text-blue-700">
                    Policy: {activePolicy.policy_number} • 
                    Coverage: AED {activePolicy.sum_insured?.toLocaleString()} • 
                    Valid until: {activePolicy.coverage_end_date ? format(parseISO(activePolicy.coverage_end_date), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filter Medical Records</h3>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open_on_site">On-Site Treatment</SelectItem>
                  <SelectItem value="open_hospitalized">Hospitalized</SelectItem>
                  <SelectItem value="open_repatriation_pending">Repatriation Pending</SelectItem>
                  <SelectItem value="closed_recovered">Recovered</SelectItem>
                  <SelectItem value="closed_repatriated">Repatriated</SelectItem>
                  <SelectItem value="closed_demise">Demise</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="serious">Serious</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setYearFilter("all");
                  setStatusFilter("all");
                  setSeverityFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Medical Records Timeline */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
            <CardTitle>Medical Records Timeline ({filteredRecords.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {technicianRecords.length === 0 
                    ? 'No medical records found for this technician'
                    : 'No records match the selected filters'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map((record, index) => {
                  const camp = camps.find(c => c.id === record.camp_id);
                  const hospital = hospitals.find(h => h.id === record.hospital_id);
                  const recordVisits = allVisits.filter(v => v.medical_record_id === record.id);
                  const recordClaims = allClaims.filter(c => c.medical_record_id === record.id);
                  const attachments = record.attachments_urls ? record.attachments_urls.split(',').filter(url => url.trim()).length : 0;

                  return (
                    <Card 
                      key={record.id} 
                      className={`border-2 hover:shadow-md transition-all ${
                        index === 0 && record.current_medical_status?.startsWith('open_') 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              record.current_medical_status?.startsWith('open_') 
                                ? 'bg-red-100' 
                                : 'bg-green-100'
                            }`}>
                              <Activity className={`w-6 h-6 ${
                                record.current_medical_status?.startsWith('open_') 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                  {record.incident_type?.replace(/_/g, ' ').toUpperCase()}
                                </h3>
                                {getStatusBadge(record.current_medical_status)}
                                {getSeverityBadge(record.severity)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {record.incident_date ? format(parseISO(record.incident_date), 'dd MMM yyyy') : '-'}
                                    {record.incident_time && ` at ${record.incident_time}`}
                                  </span>
                                </div>
                                <span>•</span>
                                <span>{camp?.name}</span>
                                {record.referred_to_hospital && (
                                  <>
                                    <span>•</span>
                                    <div className="flex items-center gap-1 text-red-600">
                                      <Hospital className="w-4 h-4" />
                                      <span>{hospital?.name || 'Hospital'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Link to={createPageUrl(`MedicalRecordDetail?id=${record.id}`)}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                        </div>

                        {record.initial_symptoms_diagnosis && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Initial Symptoms & Diagnosis</p>
                            <p className="text-sm text-gray-900">{record.initial_symptoms_diagnosis}</p>
                          </div>
                        )}

                        {record.camp_doctor_notes && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Camp Doctor Notes</p>
                            <p className="text-sm text-blue-900">{record.camp_doctor_notes}</p>
                          </div>
                        )}

                        <div className="grid md:grid-cols-5 gap-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Visits</p>
                            <p className="font-semibold text-gray-900">{recordVisits.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Claims</p>
                            <p className="font-semibold text-gray-900">{recordClaims.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Documents</p>
                            <p className="font-semibold text-gray-900">{attachments}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Estimated Cost</p>
                            <p className="font-semibold text-gray-900">
                              AED {record.estimated_cost?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Actual Cost</p>
                            <p className="font-semibold text-green-700">
                              AED {record.actual_total_cost?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>

                        {record.notes && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-gray-600 italic">{record.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}