import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  UserPlus, Plane, CheckCircle2, ClipboardList, AlertTriangle, 
  Download, Printer, Search, Clock, MapPin, Bed, TrendingUp
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

export default function OnboardingPipelineReport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStage, setActiveStage] = useState("all");
  const [drillDownStage, setDrillDownStage] = useState(null);
  const [showDrillDown, setShowDrillDown] = useState(false);

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
  });

  // Get Sajja Camp
  const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));

  // Filter technicians in onboarding pipeline
  const onboardingTechs = technicians.filter(t => 
    t.status === 'pending_arrival' || 
    (t.status === 'active' && t.induction_status === 'pre_induction') ||
    (t.status === 'active' && !t.project_id && t.camp_id === sajjaCamp?.id)
  );

  // Categorize by stage
  const categorizeStage = (tech) => {
    if (tech.status === 'pending_arrival') {
      if (tech.pickup_status === 'picked_up' || tech.pickup_status === 'arrived_at_camp') {
        return 'in_transit';
      } else if (tech.pickup_status === 'driver_dispatched') {
        return 'pickup_dispatched';
      } else if (tech.pickup_status === 'scheduled') {
        return 'pickup_scheduled';
      }
      return 'registered';
    }
    
    if (tech.status === 'active') {
      if (tech.induction_status === 'pre_induction') {
        if (tech.pre_induction_checklist_completed) {
          return 'awaiting_allocation';
        }
        return 'sajja_induction';
      }
      if (!tech.project_id && tech.camp_id === sajjaCamp?.id) {
        return 'arrived_not_inducted';
      }
    }
    
    return 'other';
  };

  // Get checklist completion percentage
  const getChecklistProgress = (tech) => {
    const items = [
      tech.advance_payment_given,
      tech.safety_shoes_issued,
      tech.helmet_issued,
      tech.jacket_issued,
      tech.ppe_issued,
      tech.c3_card_issued,
      tech.hse_induction_completed,
      tech.training_induction_completed
    ];
    const completed = items.filter(Boolean).length;
    return Math.round((completed / 8) * 100);
  };

  // Enrich with stage and bed info
  const enrichedTechs = onboardingTechs.map(tech => {
    const stage = categorizeStage(tech);
    const bed = beds.find(b => b.technician_id === tech.id);
    const camp = camps.find(c => c.id === tech.camp_id);
    const checklistProgress = getChecklistProgress(tech);
    
    return {
      ...tech,
      stage,
      bed,
      camp,
      checklistProgress
    };
  });

  // Apply search filter
  const filteredTechs = enrichedTechs.filter(tech => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      tech.full_name?.toLowerCase().includes(searchLower) ||
      tech.employee_id?.toLowerCase().includes(searchLower);
    
    const matchesStage = activeStage === 'all' || tech.stage === activeStage;
    
    return matchesSearch && matchesStage;
  });

  // Sort by expected arrival date (earliest first)
  const sortedTechs = filteredTechs.sort((a, b) => {
    if (a.expected_arrival_date && b.expected_arrival_date) {
      return new Date(a.expected_arrival_date) - new Date(b.expected_arrival_date);
    }
    return 0;
  });

  // Stage counts
  const stageCounts = {
    all: enrichedTechs.length,
    registered: enrichedTechs.filter(t => t.stage === 'registered').length,
    pickup_scheduled: enrichedTechs.filter(t => t.stage === 'pickup_scheduled').length,
    pickup_dispatched: enrichedTechs.filter(t => t.stage === 'pickup_dispatched').length,
    in_transit: enrichedTechs.filter(t => t.stage === 'in_transit').length,
    arrived_not_inducted: enrichedTechs.filter(t => t.stage === 'arrived_not_inducted').length,
    sajja_induction: enrichedTechs.filter(t => t.stage === 'sajja_induction').length,
    awaiting_allocation: enrichedTechs.filter(t => t.stage === 'awaiting_allocation').length,
  };

  // Stage labels and colors
  const stageConfig = {
    registered: { label: '1. Registered', color: 'bg-gray-100 text-gray-700', icon: UserPlus },
    pickup_scheduled: { label: '2. Pickup Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
    pickup_dispatched: { label: '3. Driver Dispatched', color: 'bg-indigo-100 text-indigo-700', icon: Plane },
    in_transit: { label: '4. In Transit', color: 'bg-purple-100 text-purple-700', icon: Plane },
    arrived_not_inducted: { label: '5. Arrived (Not Inducted)', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
    awaiting_allocation: { label: '6. Awaiting Bed Allocation', color: 'bg-orange-100 text-orange-700', icon: Bed },
    sajja_induction: { label: '7. Sajja Pre-Induction', color: 'bg-green-100 text-green-700', icon: ClipboardList },
  };

  const safeFormatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MMM/yyyy');
    } catch {
      return '-';
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Name', 'Stage', 'Expected Arrival', 'Actual Arrival', 'Camp', 'Bed Allocated', 'Checklist Progress', 'Pickup Status'];
    const rows = sortedTechs.map(tech => {
      return [
        tech.employee_id || '-',
        tech.full_name || '-',
        stageConfig[tech.stage]?.label || tech.stage,
        safeFormatDate(tech.expected_arrival_date),
        safeFormatDate(tech.actual_arrival_date),
        tech.camp?.name || '-',
        tech.bed ? 'Yes' : 'No',
        tech.stage === 'sajja_induction' || tech.stage === 'awaiting_allocation' ? `${tech.checklistProgress}%` : '-',
        tech.pickup_status || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `onboarding_pipeline_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: landscape; margin: 1cm; }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Onboarding Pipeline Report</h1>
            <p className="text-gray-600 mt-1">Track technicians from registration to bed allocation</p>
          </div>
          <div className="flex gap-3 no-print">
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {Object.entries(stageCounts).map(([stage, count]) => {
            const config = stageConfig[stage] || { label: 'All', color: 'bg-blue-100 text-blue-700' };
            const Icon = config.icon || UserPlus;
            return (
              <Card key={stage} className="border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-gray-500" />
                    <Badge className={stage === 'all' ? 'bg-blue-600 text-white' : config.color}>
                      {count}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-gray-700">
                    {stage === 'all' ? 'Total in Pipeline' : config.label}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pipeline Visualizations */}
        <div className="grid md:grid-cols-2 gap-6 no-print">
          {/* Funnel Bar Chart */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Pipeline Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={[
                    { stage: 'Registered', stageKey: 'registered', count: stageCounts.registered, fill: '#9CA3AF' },
                    { stage: 'Pickup Scheduled', stageKey: 'pickup_scheduled', count: stageCounts.pickup_scheduled, fill: '#3B82F6' },
                    { stage: 'Driver Dispatched', stageKey: 'pickup_dispatched', count: stageCounts.pickup_dispatched, fill: '#6366F1' },
                    { stage: 'In Transit', stageKey: 'in_transit', count: stageCounts.in_transit, fill: '#8B5CF6' },
                    { stage: 'Arrived', stageKey: 'arrived_not_inducted', count: stageCounts.arrived_not_inducted, fill: '#EAB308' },
                    { stage: 'Awaiting Bed', stageKey: 'awaiting_allocation', count: stageCounts.awaiting_allocation, fill: '#F97316' },
                    { stage: 'Sajja Induction', stageKey: 'sajja_induction', count: stageCounts.sajja_induction, fill: '#22C55E' },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const clickedStage = data.activePayload[0].payload.stageKey;
                      setDrillDownStage(clickedStage);
                      setShowDrillDown(true);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={90} style={{ fontSize: '12px' }} />
                  <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} cursor="pointer">
                    {[
                      { stage: 'Registered', count: stageCounts.registered, fill: '#9CA3AF' },
                      { stage: 'Pickup Scheduled', count: stageCounts.pickup_scheduled, fill: '#3B82F6' },
                      { stage: 'Driver Dispatched', count: stageCounts.pickup_dispatched, fill: '#6366F1' },
                      { stage: 'In Transit', count: stageCounts.in_transit, fill: '#8B5CF6' },
                      { stage: 'Arrived', count: stageCounts.arrived_not_inducted, fill: '#EAB308' },
                      { stage: 'Awaiting Bed', count: stageCounts.awaiting_allocation, fill: '#F97316' },
                      { stage: 'Sajja Induction', count: stageCounts.sajja_induction, fill: '#22C55E' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-center text-gray-500 mt-2">💡 Click on any bar to see technicians in that stage</p>
            </CardContent>
          </Card>

          {/* Pie Chart Distribution */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                Stage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Registered', value: stageCounts.registered, fill: '#9CA3AF' },
                      { name: 'Pickup Scheduled', value: stageCounts.pickup_scheduled, fill: '#3B82F6' },
                      { name: 'Driver Dispatched', value: stageCounts.pickup_dispatched, fill: '#6366F1' },
                      { name: 'In Transit', value: stageCounts.in_transit, fill: '#8B5CF6' },
                      { name: 'Arrived', value: stageCounts.arrived_not_inducted, fill: '#EAB308' },
                      { name: 'Awaiting Bed', value: stageCounts.awaiting_allocation, fill: '#F97316' },
                      { name: 'Sajja Induction', value: stageCounts.sajja_induction, fill: '#22C55E' },
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    dataKey="value"
                  >
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="border-none shadow-md no-print">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stage Tabs */}
        <Tabs value={activeStage} onValueChange={setActiveStage} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 no-print">
            <TabsTrigger value="all">All ({stageCounts.all})</TabsTrigger>
            <TabsTrigger value="registered">Registered ({stageCounts.registered})</TabsTrigger>
            <TabsTrigger value="pickup_scheduled">Scheduled ({stageCounts.pickup_scheduled})</TabsTrigger>
            <TabsTrigger value="pickup_dispatched">Dispatched ({stageCounts.pickup_dispatched})</TabsTrigger>
            <TabsTrigger value="in_transit">Transit ({stageCounts.in_transit})</TabsTrigger>
            <TabsTrigger value="arrived_not_inducted">Arrived ({stageCounts.arrived_not_inducted})</TabsTrigger>
            <TabsTrigger value="awaiting_allocation">Awaiting ({stageCounts.awaiting_allocation})</TabsTrigger>
            <TabsTrigger value="sajja_induction">Induction ({stageCounts.sajja_induction})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeStage}>
            <Card className="border-none shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                {sortedTechs.length === 0 ? (
                  <div className="p-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No technicians found in this stage</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Employee ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Stage</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Expected Arrival</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Actual Arrival</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Current Location</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Bed Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">Checklist</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Pickup Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTechs.map((tech, index) => {
                        const config = stageConfig[tech.stage] || { label: tech.stage, color: 'bg-gray-100 text-gray-700' };
                        return (
                          <tr
                            key={tech.id}
                            className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-blue-600 border-r whitespace-nowrap">
                              {tech.employee_id || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r whitespace-nowrap font-medium">
                              {tech.full_name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm border-r">
                              <Badge className={config.color}>
                                {config.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r whitespace-nowrap">
                              {safeFormatDate(tech.expected_arrival_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r whitespace-nowrap">
                              {safeFormatDate(tech.actual_arrival_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                {tech.camp?.name || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm border-r whitespace-nowrap">
                              {tech.bed ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <Bed className="w-3 h-3 mr-1" />
                                  Allocated
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  No Bed
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm border-r">
                              {(tech.stage === 'sajja_induction' || tech.stage === 'awaiting_allocation') ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        tech.checklistProgress === 100 ? 'bg-green-500' : 'bg-orange-500'
                                      }`}
                                      style={{ width: `${tech.checklistProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{tech.checklistProgress}%</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {tech.pickup_status ? (
                                <Badge variant="outline" className="text-xs">
                                  {tech.pickup_status.replace(/_/g, ' ')}
                                </Badge>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-3 border-t no-print">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{sortedTechs.length}</span> of <span className="font-semibold">{enrichedTechs.length}</span> technicians
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Drill-Down Dialog */}
      <Dialog open={showDrillDown} onOpenChange={setShowDrillDown}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {drillDownStage && stageConfig[drillDownStage] && (
                <>
                  {React.createElement(stageConfig[drillDownStage].icon, { className: "w-5 h-5" })}
                  {stageConfig[drillDownStage].label}
                </>
              )}
              <Badge className="ml-2">{enrichedTechs.filter(t => t.stage === drillDownStage).length} Technicians</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Employee ID</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Nationality</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Trade</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Expected Arrival</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Actual Arrival</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Pickup Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Bed</th>
                </tr>
              </thead>
              <tbody>
                {enrichedTechs.filter(t => t.stage === drillDownStage).map((tech, index) => (
                  <tr key={tech.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-3 py-2 text-sm font-medium text-blue-600">{tech.employee_id || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{tech.full_name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{tech.nationality || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{tech.trade || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {safeFormatDate(tech.expected_arrival_date)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {safeFormatDate(tech.actual_arrival_date)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {tech.pickup_status ? (
                        <Badge variant="outline" className="text-xs">
                          {tech.pickup_status.replace(/_/g, ' ')}
                        </Badge>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {tech.bed ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">Yes</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 text-xs">No</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setShowDrillDown(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}