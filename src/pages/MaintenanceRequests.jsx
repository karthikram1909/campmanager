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
import { 
  AlertCircle, Plus, Search, Eye, CheckCircle2,
  Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MaintenanceRequests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [campFilter, setCampFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({});
  const [resolveData, setResolveData] = useState({});

  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => base44.entities.MaintenanceRequest.list('-date_reported'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const createRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      setShowAddDialog(false);
      setFormData({});
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      setShowResolveDialog(false);
      setResolveData({});
      setSelectedRequest(null);
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
    },
  });

  // Apply filters
  let filteredRequests = requests.filter(request => {
    const asset = assets.find(a => a.id === request.asset_id);
    const camp = camps.find(c => c.id === request.camp_id);
    
    const matchesSearch = 
      request.issue_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCamp = campFilter === 'all' || request.camp_id === campFilter;
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    
    return matchesSearch && matchesCamp && matchesStatus && matchesPriority;
  });

  // Calculate statistics
  const totalRequests = requests.length;
  const openRequests = requests.filter(r => ['new', 'assigned', 'in_progress'].includes(r.status)).length;
  const urgentRequests = requests.filter(r => r.priority === 'urgent' && ['new', 'assigned', 'in_progress'].includes(r.status)).length;
  const resolvedToday = requests.filter(r => {
    if (!r.resolved_date) return false;
    const resolvedDate = parseISO(r.resolved_date);
    const today = new Date();
    return resolvedDate.toDateString() === today.toDateString();
  }).length;

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    await createRequestMutation.mutateAsync({
      ...formData,
      reported_by: 'current_user',
      date_reported: new Date().toISOString().split('T')[0],
      time_reported: new Date().toTimeString().split(' ')[0]
    });
  };

  const handleResolveRequest = async (e) => {
    e.preventDefault();
    
    // Create maintenance log if resolution details provided
    if (resolveData.resolution_details && selectedRequest.asset_id) {
      await createLogMutation.mutateAsync({
        asset_id: selectedRequest.asset_id,
        maintenance_request_id: selectedRequest.id,
        type: 'repair',
        date_performed: new Date().toISOString().split('T')[0],
        description: resolveData.resolution_details,
        performed_by: 'current_user',
        cost: resolveData.actual_cost || 0,
        status_after: 'active'
      });
    }
    
    // Update request
    await updateRequestMutation.mutateAsync({
      id: selectedRequest.id,
      data: {
        status: 'resolved',
        resolution_details: resolveData.resolution_details,
        resolved_date: new Date().toISOString().split('T')[0],
        resolved_by: 'current_user',
        actual_cost: resolveData.actual_cost || 0
      }
    });
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      'urgent': { color: 'bg-red-600 text-white', label: 'Urgent' },
      'high': { color: 'bg-red-100 text-red-700', label: 'High' },
      'medium': { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
      'low': { color: 'bg-blue-100 text-blue-700', label: 'Low' }
    };
    
    const config = configs[priority] || configs['medium'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const configs = {
      'new': { color: 'bg-purple-100 text-purple-700', label: 'New' },
      'assigned': { color: 'bg-blue-100 text-blue-700', label: 'Assigned' },
      'in_progress': { color: 'bg-orange-100 text-orange-700', label: 'In Progress' },
      'resolved': { color: 'bg-green-100 text-green-700', label: 'Resolved' },
      'closed': { color: 'bg-gray-100 text-gray-700', label: 'Closed' },
      'cancelled': { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' }
    };
    
    const config = configs[status] || configs['new'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const stats = [
    { title: "Total Requests", value: totalRequests, icon: AlertCircle, color: "blue" },
    { title: "Open Requests", value: openRequests, icon: Clock, color: "orange" },
    { title: "Urgent", value: urgentRequests, icon: AlertCircle, color: "red" },
    { title: "Resolved Today", value: resolvedToday, icon: CheckCircle2, color: "green" },
  ];

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Maintenance Requests</h1>
            <p className="text-gray-600 mt-1">Track and resolve asset issues</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Report Issue
          </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
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
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset/Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Issue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reported</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No maintenance requests found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => {
                      const asset = assets.find(a => a.id === request.asset_id);
                      const camp = camps.find(c => c.id === request.camp_id);
                      
                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              {asset ? (
                                <>
                                  <p className="font-semibold text-gray-900">{asset.name}</p>
                                  <p className="text-sm text-gray-600">{asset.asset_tag}</p>
                                </>
                              ) : (
                                <p className="text-sm text-gray-600">{request.location_in_camp || '-'}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">{camp?.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900 line-clamp-2">{request.issue_description}</p>
                          </td>
                          <td className="px-4 py-3">
                            {getPriorityBadge(request.priority)}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{format(parseISO(request.date_reported), 'MMM dd, yyyy')}</p>
                            {request.time_reported && (
                              <p className="text-xs text-gray-500">{request.time_reported}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {request.asset_id && (
                                <Link to={createPageUrl(`AssetDetail?id=${request.asset_id}`)}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}
                              {['new', 'assigned', 'in_progress'].includes(request.status) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowResolveDialog(true);
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

      {/* Add Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Maintenance Issue</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Camp*</Label>
                <Select
                  value={formData.camp_id || ''}
                  onValueChange={(value) => setFormData({...formData, camp_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select camp" />
                  </SelectTrigger>
                  <SelectContent>
                    {camps.map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Asset (if known)</Label>
                <Select
                  value={formData.asset_id || ''}
                  onValueChange={(value) => setFormData({...formData, asset_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None/General Issue</SelectItem>
                    {assets.filter(a => a.camp_id === formData.camp_id).map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>{asset.name} ({asset.asset_tag})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location in Camp</Label>
                <Input
                  value={formData.location_in_camp || ''}
                  onChange={(e) => setFormData({...formData, location_in_camp: e.target.value})}
                  placeholder="e.g., Room 101, Mess Hall"
                />
              </div>

              <div className="space-y-2">
                <Label>Priority*</Label>
                <Select
                  value={formData.priority || 'medium'}
                  onValueChange={(value) => setFormData({...formData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Issue Description*</Label>
              <Textarea
                required
                value={formData.issue_description || ''}
                onChange={(e) => setFormData({...formData, issue_description: e.target.value})}
                rows={4}
                placeholder="Describe the problem in detail..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resolve Request Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Maintenance Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResolveRequest} className="space-y-4">
            {selectedRequest && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Issue:</p>
                <p className="text-sm text-blue-700">{selectedRequest.issue_description}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Resolution Details*</Label>
              <Textarea
                required
                value={resolveData.resolution_details || ''}
                onChange={(e) => setResolveData({...resolveData, resolution_details: e.target.value})}
                rows={4}
                placeholder="Describe what was done to resolve the issue..."
              />
            </div>

            <div className="space-y-2">
              <Label>Actual Cost (AED)</Label>
              <Input
                type="number"
                step="0.01"
                value={resolveData.actual_cost || ''}
                onChange={(e) => setResolveData({...resolveData, actual_cost: parseFloat(e.target.value)})}
                placeholder="0.00"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowResolveDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}