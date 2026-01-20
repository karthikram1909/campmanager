import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Calendar, CheckCircle2, AlertCircle, Eye, 
  Search, Clock
} from "lucide-react";
import { format, parseISO, isPast, differenceInDays, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MaintenanceScheduler() {
  const [searchQuery, setSearchQuery] = useState("");
  const [campFilter, setCampFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [logData, setLogData] = useState({});

  const queryClient = useQueryClient();

  const { data: schedules = [] } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      setShowCompleteDialog(false);
      setLogData({});
      setSelectedSchedule(null);
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Asset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  // Calculate schedule status based on due date
  const getScheduleStatus = (schedule) => {
    if (schedule.status === 'completed') return 'completed';
    if (schedule.status === 'cancelled') return 'cancelled';
    
    const dueDate = parseISO(schedule.due_date);
    if (isPast(dueDate)) return 'overdue';
    
    const daysUntil = differenceInDays(dueDate, new Date());
    if (daysUntil <= 7) return 'due_soon';
    
    return 'scheduled';
  };

  // Get enriched schedules with asset and camp info
  const enrichedSchedules = schedules.map(schedule => {
    const asset = assets.find(a => a.id === schedule.asset_id);
    const camp = camps.find(c => c.id === asset?.camp_id);
    const computedStatus = getScheduleStatus(schedule);
    
    return {
      ...schedule,
      asset,
      camp,
      computedStatus
    };
  });

  // Apply filters
  let filteredSchedules = enrichedSchedules.filter(schedule => {
    const matchesSearch = 
      schedule.task_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.asset?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.asset?.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCamp = campFilter === 'all' || schedule.camp?.id === campFilter;
    const matchesStatus = statusFilter === 'all' || schedule.computedStatus === statusFilter;
    
    return matchesSearch && matchesCamp && matchesStatus;
  });

  // Sort by due date (overdue first, then upcoming)
  filteredSchedules.sort((a, b) => {
    const dateA = parseISO(a.due_date);
    const dateB = parseISO(b.due_date);
    return dateA - dateB;
  });

  // Calculate statistics
  const totalSchedules = schedules.length;
  const overdueCount = enrichedSchedules.filter(s => s.computedStatus === 'overdue').length;
  const dueSoonCount = enrichedSchedules.filter(s => s.computedStatus === 'due_soon').length;
  const completedThisMonth = schedules.filter(s => {
    if (!s.last_completed_date) return false;
    const completedDate = parseISO(s.last_completed_date);
    const now = new Date();
    return completedDate.getMonth() === now.getMonth() && 
           completedDate.getFullYear() === now.getFullYear();
  }).length;

  const handleMarkComplete = async (e) => {
    e.preventDefault();
    
    const schedule = selectedSchedule;
    const asset = assets.find(a => a.id === schedule.asset_id);
    
    // Create maintenance log
    await createLogMutation.mutateAsync({
      asset_id: schedule.asset_id,
      type: 'preventive',
      date_performed: logData.date_performed || new Date().toISOString().split('T')[0],
      description: `${schedule.task_description}\n\n${logData.notes || ''}`,
      performed_by: 'current_user',
      cost: logData.cost || 0,
      parts_used: logData.parts_used || '',
      status_before: asset?.status,
      status_after: 'active',
      duration_hours: logData.duration_hours || schedule.estimated_duration_hours || 0,
      notes: logData.notes
    });
    
    // Update schedule - set last completed and calculate next due date
    const nextDueDate = addDays(new Date(), schedule.frequency_days).toISOString().split('T')[0];
    await updateScheduleMutation.mutateAsync({
      id: schedule.id,
      data: {
        last_completed_date: logData.date_performed || new Date().toISOString().split('T')[0],
        due_date: nextDueDate,
        status: 'scheduled'
      }
    });
    
    // Update asset last PM date
    await updateAssetMutation.mutateAsync({
      id: schedule.asset_id,
      data: {
        last_preventive_maintenance_date: logData.date_performed || new Date().toISOString().split('T')[0],
        next_preventive_maintenance_date: nextDueDate,
        status: 'active'
      }
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      'overdue': { color: 'bg-red-100 text-red-700', label: 'Overdue' },
      'due_soon': { color: 'bg-orange-100 text-orange-700', label: 'Due Soon' },
      'scheduled': { color: 'bg-blue-100 text-blue-700', label: 'Scheduled' },
      'completed': { color: 'bg-green-100 text-green-700', label: 'Completed' },
      'cancelled': { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' }
    };
    
    const config = configs[status] || configs['scheduled'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const stats = [
    { title: "Total Schedules", value: totalSchedules, icon: Calendar, color: "blue" },
    { title: "Overdue", value: overdueCount, icon: AlertCircle, color: "red" },
    { title: "Due Soon (7 days)", value: dueSoonCount, icon: Clock, color: "orange" },
    { title: "Completed This Month", value: completedThisMonth, icon: CheckCircle2, color: "green" },
  ];

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Preventive Maintenance Scheduler</h1>
          <p className="text-gray-600 mt-1">Manage and track PM schedules across all assets</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search schedules or assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={campFilter} onValueChange={setCampFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Camps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Schedules Table */}
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Camp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No schedules found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((schedule) => {
                      const daysUntil = differenceInDays(parseISO(schedule.due_date), new Date());
                      
                      return (
                        <tr key={schedule.id} className={`hover:bg-gray-50 ${
                          schedule.computedStatus === 'overdue' ? 'bg-red-50' :
                          schedule.computedStatus === 'due_soon' ? 'bg-orange-50' :
                          ''
                        }`}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-gray-900">{schedule.asset?.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-600">{schedule.asset?.asset_tag}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{schedule.camp?.name || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{schedule.task_description}</p>
                            {schedule.last_completed_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Last: {format(parseISO(schedule.last_completed_date), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">Every {schedule.frequency_days} days</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`text-sm font-medium ${
                              schedule.computedStatus === 'overdue' ? 'text-red-600' :
                              schedule.computedStatus === 'due_soon' ? 'text-orange-600' :
                              'text-gray-900'
                            }`}>
                              {format(parseISO(schedule.due_date), 'MMM dd, yyyy')}
                            </p>
                            {daysUntil < 0 ? (
                              <p className="text-xs text-red-600 mt-1">{Math.abs(daysUntil)} days overdue</p>
                            ) : daysUntil <= 7 && (
                              <p className="text-xs text-orange-600 mt-1">In {daysUntil} days</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(schedule.computedStatus)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link to={createPageUrl(`AssetDetail?id=${schedule.asset_id}`)}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              {schedule.computedStatus !== 'completed' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSchedule(schedule);
                                    setShowCompleteDialog(true);
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mark Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Preventive Maintenance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkComplete} className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Task: {selectedSchedule?.task_description}</p>
              <p className="text-sm text-blue-700">Asset: {selectedSchedule?.asset?.name}</p>
            </div>

            <div className="space-y-2">
              <Label>Date Performed*</Label>
              <Input
                type="date"
                required
                value={logData.date_performed || new Date().toISOString().split('T')[0]}
                onChange={(e) => setLogData({...logData, date_performed: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (Hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={logData.duration_hours || selectedSchedule?.estimated_duration_hours || ''}
                  onChange={(e) => setLogData({...logData, duration_hours: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label>Cost (AED)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={logData.cost || ''}
                  onChange={(e) => setLogData({...logData, cost: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parts Used</Label>
              <Input
                value={logData.parts_used || ''}
                onChange={(e) => setLogData({...logData, parts_used: e.target.value})}
                placeholder="e.g., AC Filter (Model X)"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={logData.notes || ''}
                onChange={(e) => setLogData({...logData, notes: e.target.value})}
                rows={3}
                placeholder="Additional observations..."
              />
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Next PM will be scheduled for:</strong> {selectedSchedule && format(addDays(new Date(), selectedSchedule.frequency_days), 'MMM dd, yyyy')}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}