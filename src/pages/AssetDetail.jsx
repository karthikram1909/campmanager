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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Wrench, Plus, Calendar, Edit2, FileText,
  Upload, AlertCircle,
  Filter, X, ArrowUpDown
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AssetDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const assetId = urlParams.get('id');

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [formData, setFormData] = useState({});
  const [scheduleData, setScheduleData] = useState({});
  const [logData, setLogData] = useState({});
  const [requestData, setRequestData] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Maintenance History filters
  const [sortFieldLogs, setSortFieldLogs] = useState("date_performed");
  const [sortDirectionLogs, setSortDirectionLogs] = useState("desc");
  const [filterDate, setFilterDate] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterDescription, setFilterDescription] = useState([]);
  const [filterPerformedBy, setFilterPerformedBy] = useState([]);
  const [filterCost, setFilterCost] = useState([]);
  const [filterDuration, setFilterDuration] = useState([]);
  const [filterStatusAfter, setFilterStatusAfter] = useState([]);
  const [searchDate, setSearchDate] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchDescription, setSearchDescription] = useState("");
  const [searchPerformedBy, setSearchPerformedBy] = useState("");
  const [searchCost, setSearchCost] = useState("");
  const [searchDuration, setSearchDuration] = useState("");
  const [searchStatusAfter, setSearchStatusAfter] = useState("");

  // PM Schedules filters
  const [sortFieldSchedules, setSortFieldSchedules] = useState("due_date");
  const [sortDirectionSchedules, setSortDirectionSchedules] = useState("asc");
  const [filterTaskDesc, setFilterTaskDesc] = useState([]);
  const [filterFrequency, setFilterFrequency] = useState([]);
  const [filterDueDate, setFilterDueDate] = useState([]);
  const [filterScheduleStatus, setFilterScheduleStatus] = useState([]);
  const [searchTaskDesc, setSearchTaskDesc] = useState("");
  const [searchFrequency, setSearchFrequency] = useState("");
  const [searchDueDate, setSearchDueDate] = useState("");
  const [searchScheduleStatus, setSearchScheduleStatus] = useState("");

  // Maintenance Requests filters
  const [sortFieldRequests, setSortFieldRequests] = useState("date_reported");
  const [sortDirectionRequests, setSortDirectionRequests] = useState("desc");
  const [filterRequestDate, setFilterRequestDate] = useState([]);
  const [filterRequestPriority, setFilterRequestPriority] = useState([]);
  const [filterRequestStatus, setFilterRequestStatus] = useState([]);
  const [filterIssue, setFilterIssue] = useState([]);
  const [searchRequestDate, setSearchRequestDate] = useState("");
  const [searchRequestPriority, setSearchRequestPriority] = useState("");
  const [searchRequestStatus, setSearchRequestStatus] = useState("");
  const [searchIssue, setSearchIssue] = useState("");

  const queryClient = useQueryClient();

  const { data: asset } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      if (!assetId) return null;
      const assets = await base44.entities.Asset.list();
      return assets.find(a => a.id === assetId);
    },
    enabled: !!assetId,
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: allSchedules = [] } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['maintenance-logs'],
    queryFn: () => base44.entities.MaintenanceLog.list('-date_performed'),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => base44.entities.MaintenanceRequest.list('-date_reported'),
  });

  // Filter data for this asset
  const assetSchedules = allSchedules.filter(s => s.asset_id === assetId);
  const assetLogs = allLogs.filter(l => l.asset_id === assetId);
  const assetRequests = allRequests.filter(r => r.asset_id === assetId);

  const createAssetMutation = useMutation({
    mutationFn: (data) => base44.entities.Asset.create(data),
    onSuccess: (newAsset) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      window.location.href = createPageUrl(`AssetDetail?id=${newAsset.id}`);
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Asset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowEditDialog(false);
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      setShowScheduleDialog(false);
      setScheduleData({});
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      setShowLogDialog(false);
      setLogData({});
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      setShowRequestDialog(false);
      setRequestData({});
    },
  });

  // === MAINTENANCE LOGS FILTERING & SORTING ===
  let filteredLogs = assetLogs.filter(log => {
    const dateStr = log.date_performed ? format(parseISO(log.date_performed), 'dd/MM/yyyy') : '-';
    const typeStr = log.type ? log.type.charAt(0).toUpperCase() + log.type.slice(1) : '-';
    const descStr = log.description || '-';
    const performedByStr = log.performed_by || '-';
    const costStr = log.cost !== undefined && log.cost !== null ? `AED ${log.cost}` : '-';
    const durationStr = log.duration_hours !== undefined && log.duration_hours !== null ? `${log.duration_hours}h` : '-';
    const statusStr = log.status_after ? log.status_after.replace(/_/g, ' ') : '-';

    if (filterDate.length > 0 && !filterDate.includes(dateStr)) return false;
    if (filterType.length > 0 && !filterType.includes(typeStr)) return false;
    if (filterDescription.length > 0 && !filterDescription.includes(descStr)) return false;
    if (filterPerformedBy.length > 0 && !filterPerformedBy.includes(performedByStr)) return false;
    if (filterCost.length > 0 && !filterCost.includes(costStr)) return false;
    if (filterDuration.length > 0 && !filterDuration.includes(durationStr)) return false;
    if (filterStatusAfter.length > 0 && !filterStatusAfter.includes(statusStr)) return false;

    return true;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let aVal, bVal;
    switch (sortFieldLogs) {
      case 'date_performed':
        aVal = a.date_performed ? new Date(a.date_performed).getTime() : 0;
        bVal = b.date_performed ? new Date(b.date_performed).getTime() : 0;
        break;
      case 'cost':
        aVal = a.cost || 0;
        bVal = b.cost || 0;
        break;
      case 'duration_hours':
        aVal = a.duration_hours || 0;
        bVal = b.duration_hours || 0;
        break;
      default:
        aVal = a[sortFieldLogs] || '';
        bVal = b[sortFieldLogs] || '';
        break;
    }

    if (sortDirectionLogs === 'asc') {
      return typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    } else {
      return typeof aVal === 'string' ? bVal.localeCompare(aVal) : bVal - aVal;
    }
  });

  const uniqueDates = [...new Set(assetLogs.map(l => l.date_performed ? format(parseISO(l.date_performed), 'dd/MM/yyyy') : '-'))].sort().reverse();
  const uniqueTypes = [...new Set(assetLogs.map(l => l.type ? l.type.charAt(0).toUpperCase() + l.type.slice(1) : '-'))].sort();
  const uniqueDescriptions = [...new Set(assetLogs.map(l => l.description || '-'))].sort();
  const uniquePerformedBy = [...new Set(assetLogs.map(l => l.performed_by || '-'))].sort();
  const uniqueCosts = [...new Set(assetLogs.map(l => l.cost !== undefined && l.cost !== null ? `AED ${l.cost}` : '-'))].sort();
  const uniqueDurations = [...new Set(assetLogs.map(l => l.duration_hours !== undefined && l.duration_hours !== null ? `${l.duration_hours}h` : '-'))].sort();
  const uniqueStatusAfter = [...new Set(assetLogs.map(l => l.status_after ? l.status_after.replace(/_/g, ' ') : '-'))].sort();

  const hasActiveFiltersLogs = filterDate.length > 0 || filterType.length > 0 || filterDescription.length > 0 ||
    filterPerformedBy.length > 0 || filterCost.length > 0 || filterDuration.length > 0 || filterStatusAfter.length > 0;

  const clearAllFiltersLogs = () => {
    setFilterDate([]);
    setFilterType([]);
    setFilterDescription([]);
    setFilterPerformedBy([]);
    setFilterCost([]);
    setFilterDuration([]);
    setFilterStatusAfter([]);
  };

  // === PM SCHEDULES FILTERING & SORTING ===
  let filteredSchedules = assetSchedules.filter(schedule => {
    const taskStr = schedule.task_description || '-';
    const freqStr = schedule.frequency_days ? `${schedule.frequency_days} days` : '-';
    const dueStr = schedule.due_date ? format(parseISO(schedule.due_date), 'dd/MM/yyyy') : '-';
    const statusStr = schedule.status || '-';

    if (filterTaskDesc.length > 0 && !filterTaskDesc.includes(taskStr)) return false;
    if (filterFrequency.length > 0 && !filterFrequency.includes(freqStr)) return false;
    if (filterDueDate.length > 0 && !filterDueDate.includes(dueStr)) return false;
    if (filterScheduleStatus.length > 0 && !filterScheduleStatus.includes(statusStr)) return false;

    return true;
  });

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    let aVal, bVal;
    switch (sortFieldSchedules) {
      case 'due_date':
        aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
        bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
        break;
      case 'frequency_days':
        aVal = a.frequency_days || 0;
        bVal = b.frequency_days || 0;
        break;
      default:
        aVal = a[sortFieldSchedules] || '';
        bVal = b[sortFieldSchedules] || '';
        break;
    }

    if (sortDirectionSchedules === 'asc') {
      return typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    } else {
      return typeof aVal === 'string' ? bVal.localeCompare(aVal) : bVal - aVal;
    }
  });

  const uniqueTaskDescs = [...new Set(assetSchedules.map(s => s.task_description || '-'))].sort();
  const uniqueFrequencies = [...new Set(assetSchedules.map(s => s.frequency_days ? `${s.frequency_days} days` : '-'))].sort();
  const uniqueDueDates = [...new Set(assetSchedules.map(s => s.due_date ? format(parseISO(s.due_date), 'dd/MM/yyyy') : '-'))].sort();
  const uniqueScheduleStatuses = [...new Set(assetSchedules.map(s => s.status || '-'))].sort();

  const hasActiveFiltersSchedules = filterTaskDesc.length > 0 || filterFrequency.length > 0 || 
    filterDueDate.length > 0 || filterScheduleStatus.length > 0;

  const clearAllFiltersSchedules = () => {
    setFilterTaskDesc([]);
    setFilterFrequency([]);
    setFilterDueDate([]);
    setFilterScheduleStatus([]);
  };

  // === MAINTENANCE REQUESTS FILTERING & SORTING ===
  let filteredRequests = assetRequests.filter(request => {
    const dateStr = request.date_reported ? format(parseISO(request.date_reported), 'dd/MM/yyyy') : '-';
    const priorityStr = request.priority || '-';
    const statusStr = request.status || '-';
    const issueStr = request.issue_description || '-';

    if (filterRequestDate.length > 0 && !filterRequestDate.includes(dateStr)) return false;
    if (filterRequestPriority.length > 0 && !filterRequestPriority.includes(priorityStr)) return false;
    if (filterRequestStatus.length > 0 && !filterRequestStatus.includes(statusStr)) return false;
    if (filterIssue.length > 0 && !filterIssue.includes(issueStr)) return false;

    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aVal, bVal;
    switch (sortFieldRequests) {
      case 'date_reported':
        aVal = a.date_reported ? new Date(a.date_reported).getTime() : 0;
        bVal = b.date_reported ? new Date(b.date_reported).getTime() : 0;
        break;
      default:
        aVal = a[sortFieldRequests] || '';
        bVal = b[sortFieldRequests] || '';
        break;
    }

    if (sortDirectionRequests === 'asc') {
      return typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    } else {
      return typeof aVal === 'string' ? bVal.localeCompare(aVal) : bVal - aVal;
    }
  });

  const uniqueRequestDates = [...new Set(assetRequests.map(r => r.date_reported ? format(parseISO(r.date_reported), 'dd/MM/yyyy') : '-'))].sort().reverse();
  const uniqueRequestPriorities = [...new Set(assetRequests.map(r => r.priority || '-'))].sort();
  const uniqueRequestStatuses = [...new Set(assetRequests.map(r => r.status || '-'))].sort();
  const uniqueIssues = [...new Set(assetRequests.map(r => r.issue_description || '-'))].sort();

  const hasActiveFiltersRequests = filterRequestDate.length > 0 || filterRequestPriority.length > 0 ||
    filterRequestStatus.length > 0 || filterIssue.length > 0;

  const clearAllFiltersRequests = () => {
    setFilterRequestDate([]);
    setFilterRequestPriority([]);
    setFilterRequestStatus([]);
    setFilterIssue([]);
  };

  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      v.toLowerCase().includes(searchValue.toLowerCase())
    );

    const toggleValue = (value) => {
      if (selected.includes(value)) {
        setSelected(selected.filter(v => v !== value));
      } else {
        setSelected([...selected, value]);
      }
    };

    const toggleAll = () => {
      if (selected.length === values.length && values.length > 0) {
        setSelected([]);
      } else {
        setSelected([...values]);
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Filter className={`w-3 h-3 ${selected.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b bg-gray-50">
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {values.length > 0 && (
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={toggleAll}>
                <Checkbox
                  checked={selected.length === values.length && values.length > 0}
                  onCheckedChange={toggleAll}
                />
                <label className="text-sm font-medium cursor-pointer">
                  (Select All)
                </label>
              </div>
            )}
            {filteredValues.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-4">
                No results found
              </div>
            ) : (
              filteredValues.map((value) => (
                <div
                  key={value}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => toggleValue(value)}
                >
                  <Checkbox
                    checked={selected.includes(value)}
                    onCheckedChange={() => toggleValue(value)}
                  />
                  <label className="text-sm cursor-pointer flex-1">
                    {value}
                  </label>
                </div>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setSelected([])}
              >
                Clear Filter ({selected.length})
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

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

      const currentAttachments = asset?.attachments_urls
        ? asset.attachments_urls.split(',').filter(url => url.trim())
        : [];
      const updatedAttachments = [...currentAttachments, ...newUrls].join(',');

      await updateAssetMutation.mutateAsync({
        id: assetId,
        data: { attachments_urls: updatedAttachments }
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();

    if (assetId) {
      await updateAssetMutation.mutateAsync({
        id: assetId,
        data: formData
      });
    } else {
      await createAssetMutation.mutateAsync(formData);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    await createScheduleMutation.mutateAsync({
      ...scheduleData,
      asset_id: assetId
    });
  };

  const handleCreateLog = async (e) => {
    e.preventDefault();
    await createLogMutation.mutateAsync({
      ...logData,
      asset_id: assetId
    });
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    await createRequestMutation.mutateAsync({
      ...requestData,
      asset_id: assetId,
      camp_id: asset?.camp_id,
      reported_by: 'current_user',
      date_reported: new Date().toISOString().split('T')[0]
    });
  };

  const camp = camps.find(c => c.id === asset?.camp_id);

  // If no assetId, show create form
  if (!assetId) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AssetDashboard')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Add New Asset</h1>
          </div>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={handleSaveAsset} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Tag*</Label>
                    <Input
                      required
                      value={formData.asset_tag || ''}
                      onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                      placeholder="e.g., CAMP1-AC-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Asset Name*</Label>
                    <Input
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., AC Unit - Ground Floor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type*</Label>
                    <Select
                      value={formData.type || ''}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refrigerator">Refrigerator</SelectItem>
                        <SelectItem value="water_dispenser">Water Dispenser</SelectItem>
                        <SelectItem value="ac_unit">AC Unit</SelectItem>
                        <SelectItem value="washing_machine">Washing Machine</SelectItem>
                        <SelectItem value="oven">Oven</SelectItem>
                        <SelectItem value="heater">Heater</SelectItem>
                        <SelectItem value="water_tank">Water Tank</SelectItem>
                        <SelectItem value="water_pump">Water Pump</SelectItem>
                        <SelectItem value="generator">Generator</SelectItem>
                        <SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem>
                        <SelectItem value="cctv_camera">CCTV Camera</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Camp*</Label>
                    <Select
                      value={formData.camp_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, camp_id: value })}
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
                    <Label>Location in Camp</Label>
                    <Input
                      value={formData.location_in_camp || ''}
                      onChange={(e) => setFormData({ ...formData, location_in_camp: e.target.value })}
                      placeholder="e.g., Room 101, Mess Hall"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input
                      value={formData.serial_number || ''}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Model Number</Label>
                    <Input
                      value={formData.model_number || ''}
                      onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input
                      value={formData.manufacturer || ''}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Purchase Date</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Purchase Cost</Label>
                    <Input
                      type="number"
                      value={formData.purchase_cost || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Warranty Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.warranty_expiry_date || ''}
                      onChange={(e) => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status || 'active'}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                        <SelectItem value="faulty">Faulty</SelectItem>
                        <SelectItem value="decommissioned">Decommissioned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Link to={createPageUrl('AssetDashboard')}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Create Asset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-500 py-12">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AssetDashboard')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
              <p className="text-gray-600 mt-1">{asset.asset_tag} • {camp?.name}</p>
            </div>
          </div>
          <Button onClick={() => {
            setFormData(asset);
            setShowEditDialog(true);
          }}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Asset
          </Button>
        </div>

        {/* Asset Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-blue-700 mb-1">Type</p>
                <p className="font-semibold text-blue-900 capitalize">{asset.type?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 mb-1">Status</p>
                <Badge className={
                  asset.status === 'active' ? 'bg-green-100 text-green-700' :
                    asset.status === 'faulty' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                }>
                  {asset.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-blue-700 mb-1">Location</p>
                <p className="font-semibold text-blue-900">{asset.location_in_camp || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 mb-1">Serial Number</p>
                <p className="font-semibold text-blue-900">{asset.serial_number || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="schedules" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="schedules">PM Schedules</TabsTrigger>
            <TabsTrigger value="logs">Maintenance History</TabsTrigger>
            <TabsTrigger value="requests">Maintenance Requests</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* PM Schedules Tab */}
          <TabsContent value="schedules">
            <Card className="border-none shadow-md">
              {hasActiveFiltersSchedules && (
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-700 font-medium">
                      <Filter className="w-4 h-4 inline mr-2" />
                      Column filters active
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFiltersSchedules}
                      className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              )}

              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Preventive Maintenance Schedules ({sortedSchedules.length})
                  </CardTitle>
                  <Button onClick={() => setShowScheduleDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sortedSchedules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>{hasActiveFiltersSchedules ? 'No schedules match your filters' : 'No PM schedules configured'}</p>
                    {!hasActiveFiltersSchedules && (
                      <Button variant="link" onClick={() => setShowScheduleDialog(true)} className="mt-2">
                        Add first schedule
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Task Description</span>
                              <ColumnFilter
                                values={uniqueTaskDescs}
                                selected={filterTaskDesc}
                                setSelected={setFilterTaskDesc}
                                searchValue={searchTaskDesc}
                                setSearchValue={setSearchTaskDesc}
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Frequency</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                                  if (sortFieldSchedules === 'frequency_days') {
                                    setSortDirectionSchedules(sortDirectionSchedules === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortFieldSchedules('frequency_days');
                                    setSortDirectionSchedules('asc');
                                  }
                                }}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueFrequencies}
                                  selected={filterFrequency}
                                  setSelected={setFilterFrequency}
                                  searchValue={searchFrequency}
                                  setSearchValue={setSearchFrequency}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Due Date</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                                  if (sortFieldSchedules === 'due_date') {
                                    setSortDirectionSchedules(sortDirectionSchedules === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortFieldSchedules('due_date');
                                    setSortDirectionSchedules('asc');
                                  }
                                }}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueDueDates}
                                  selected={filterDueDate}
                                  setSelected={setFilterDueDate}
                                  searchValue={searchDueDate}
                                  setSearchValue={setSearchDueDate}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                            <div className="flex items-center justify-between gap-2">
                              <span>Status</span>
                              <ColumnFilter
                                values={uniqueScheduleStatuses}
                                selected={filterScheduleStatus}
                                setSelected={setFilterScheduleStatus}
                                searchValue={searchScheduleStatus}
                                setSearchValue={setSearchScheduleStatus}
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSchedules.map((schedule, index) => (
                          <tr key={schedule.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 font-medium">
                              {schedule.task_description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              Every {schedule.frequency_days} days
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                              {schedule.due_date ? format(parseISO(schedule.due_date), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <Badge variant={
                                schedule.status === 'overdue' ? 'destructive' :
                                  schedule.status === 'completed' ? 'default' :
                                    'secondary'
                              }>
                                {schedule.status || '-'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {sortedSchedules.length > 0 && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{sortedSchedules.length}</span> of <span className="font-semibold">{assetSchedules.length}</span> schedules
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance History Tab */}
          <TabsContent value="logs">
            <Card className="border-none shadow-md">
              {hasActiveFiltersLogs && (
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-700 font-medium">
                      <Filter className="w-4 h-4 inline mr-2" />
                      Column filters active
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFiltersLogs}
                      className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              )}

              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-600" />
                    Maintenance History ({sortedLogs.length})
                  </CardTitle>
                  <Button onClick={() => setShowLogDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Log Maintenance
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sortedLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>{hasActiveFiltersLogs ? 'No maintenance logs match your filters' : 'No maintenance history'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Date</span>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                                  if (sortFieldLogs === 'date_performed') {
                                    setSortDirectionLogs(sortDirectionLogs === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortFieldLogs('date_performed');
                                    setSortDirectionLogs('asc');
                                  }
                                }}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueDates}
                                  selected={filterDate}
                                  setSelected={setFilterDate}
                                  searchValue={searchDate}
                                  setSearchValue={setSearchDate}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Type</span>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                                  if (sortFieldLogs === 'type') {
                                    setSortDirectionLogs(sortDirectionLogs === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortFieldLogs('type');
                                    setSortDirectionLogs('asc');
                                  }
                                }}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueTypes}
                                  selected={filterType}
                                  setSelected={setFilterType}
                                  searchValue={searchType}
                                  setSearchValue={setSearchType}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Description</span>
                              <ColumnFilter
                                values={uniqueDescriptions}
                                selected={filterDescription}
                                setSelected={setFilterDescription}
                                searchValue={searchDescription}
                                setSearchValue={setSearchDescription}
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            Parts Used
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-1">
                              <span>Cost</span>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                                  if (sortFieldLogs === 'cost') {
                                    setSortDirectionLogs(sortDirectionLogs === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortFieldLogs('cost');
                                    setSortDirectionLogs('asc');
                                  }
                                }}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueCosts}
                                  selected={filterCost}
                                  setSelected={setFilterCost}
                                  searchValue={searchCost}
                                  setSearchValue={setSearchCost}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Duration</span>
                              <ColumnFilter
                                values={uniqueDurations}
                                selected={filterDuration}
                                setSelected={setFilterDuration}
                                searchValue={searchDuration}
                                setSearchValue={setSearchDuration}
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Performed By</span>
                              <ColumnFilter
                                values={uniquePerformedBy}
                                selected={filterPerformedBy}
                                setSelected={setFilterPerformedBy}
                                searchValue={searchPerformedBy}
                                setSearchValue={setSearchPerformedBy}
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                            <div className="flex items-center justify-between gap-2">
                              <span>Status After</span>
                              <ColumnFilter
                                values={uniqueStatusAfter}
                                selected={filterStatusAfter}
                                setSelected={setFilterStatusAfter}
                                searchValue={searchStatusAfter}
                                setSearchValue={setSearchStatusAfter}
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLogs.map((log, index) => (
                          <tr key={log.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                              {log.date_performed ? format(parseISO(log.date_performed), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                              <Badge variant="outline" className="capitalize">
                                {log.type ? log.type.replace(/_/g, ' ') : '-'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                              {log.description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                              {log.parts_used || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium border-r border-gray-200 whitespace-nowrap">
                              {log.cost !== undefined && log.cost !== null ? `AED ${log.cost}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {log.duration_hours !== undefined && log.duration_hours !== null ? `${log.duration_hours}h` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {log.performed_by || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <Badge className={
                                log.status_after === 'active' ? 'bg-green-100 text-green-700' :
                                  log.status_after === 'faulty' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                              }>
                                {log.status_after ? log.status_after.replace(/_/g, ' ') : '-'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {sortedLogs.length > 0 && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{sortedLogs.length}</span> of <span className="font-semibold">{assetLogs.length}</span> maintenance logs
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Requests Tab */}
          <TabsContent value="requests">
            <Card className="border-none shadow-md">
              {hasActiveFiltersRequests && (
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-700 font-medium">
                      <Filter className="w-4 h-4 inline mr-2" />
                      Column filters active
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFiltersRequests}
                      className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              )}

              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    Maintenance Requests ({sortedRequests.length})
                  </CardTitle>
                  <Button onClick={() => setShowRequestDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sortedRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>{hasActiveFiltersRequests ? 'No requests match your filters' : 'No maintenance requests'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Date Reported</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                                  if (sortFieldRequests === 'date_reported') {
                                    setSortDirectionRequests(sortDirectionRequests === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortFieldRequests('date_reported');
                                    setSortDirectionRequests('asc');
                                  }
                                }}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueRequestDates}
                                  selected={filterRequestDate}
                                  setSelected={setFilterRequestDate}
                                  searchValue={searchRequestDate}
                                  setSearchValue={setSearchRequestDate}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Priority</span>
                              <ColumnFilter
                                values={uniqueRequestPriorities}
                                selected={filterRequestPriority}
                                setSelected={setFilterRequestPriority}
                                searchValue={searchRequestPriority}
                                setSearchValue={setSearchRequestPriority}
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Issue Description</span>
                              <ColumnFilter
                                values={uniqueIssues}
                                selected={filterIssue}
                                setSelected={setFilterIssue}
                                searchValue={searchIssue}
                                setSearchValue={setSearchIssue}
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                            <div className="flex items-center justify-between gap-2">
                              <span>Status</span>
                              <ColumnFilter
                                values={uniqueRequestStatuses}
                                selected={filterRequestStatus}
                                setSelected={setFilterRequestStatus}
                                searchValue={searchRequestStatus}
                                setSearchValue={setSearchRequestStatus}
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRequests.map((request, index) => (
                          <tr key={request.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                              {request.date_reported ? format(parseISO(request.date_reported), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                              <Badge variant={
                                request.priority === 'urgent' ? 'destructive' :
                                  request.priority === 'high' ? 'destructive' :
                                    request.priority === 'medium' ? 'default' :
                                      'secondary'
                              }>
                                {request.priority || '-'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                              {request.issue_description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <Badge variant="outline">
                                {request.status || '-'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {sortedRequests.length > 0 && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{sortedRequests.length}</span> of <span className="font-semibold">{assetRequests.length}</span> requests
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="border-none shadow-md">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Documents & Attachments
                  </CardTitle>
                  <div>
                    <Input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={uploadingFiles}
                    />
                    <Button onClick={() => document.getElementById('file-upload').click()} disabled={uploadingFiles}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFiles ? 'Uploading...' : 'Upload Files'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {asset.attachments_urls ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {asset.attachments_urls.split(',').filter(url => url.trim()).map((url, index) => (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-blue-600 hover:text-blue-800">
                            <FileText className="w-5 h-5" />
                            <span className="text-sm break-all">Document {index + 1}</span>
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No documents uploaded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Asset Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAsset} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Name*</Label>
                <Input
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location_in_camp || ''}
                  onChange={(e) => setFormData({ ...formData, location_in_camp: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="faulty">Faulty</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Next PM Date</Label>
                <Input
                  type="date"
                  value={formData.next_preventive_maintenance_date || ''}
                  onChange={(e) => setFormData({ ...formData, next_preventive_maintenance_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add PM Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div className="space-y-2">
              <Label>Task Description*</Label>
              <Input
                required
                value={scheduleData.task_description || ''}
                onChange={(e) => setScheduleData({ ...scheduleData, task_description: e.target.value })}
                placeholder="e.g., AC filter cleaning"
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency (Days)*</Label>
              <Input
                type="number"
                required
                value={scheduleData.frequency_days || ''}
                onChange={(e) => setScheduleData({ ...scheduleData, frequency_days: parseInt(e.target.value) })}
                placeholder="e.g., 90"
              />
            </div>

            <div className="space-y-2">
              <Label>Next Due Date*</Label>
              <Input
                type="date"
                required
                value={scheduleData.due_date || ''}
                onChange={(e) => setScheduleData({ ...scheduleData, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Duration (Hours)</Label>
              <Input
                type="number"
                step="0.5"
                value={scheduleData.estimated_duration_hours || ''}
                onChange={(e) => setScheduleData({ ...scheduleData, estimated_duration_hours: parseFloat(e.target.value) })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Maintenance Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Maintenance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLog} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type*</Label>
                <Select
                  value={logData.type || ''}
                  onValueChange={(value) => setLogData({ ...logData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="decommissioning">Decommissioning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Performed*</Label>
                <Input
                  type="date"
                  required
                  value={logData.date_performed || ''}
                  onChange={(e) => setLogData({ ...logData, date_performed: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description*</Label>
              <Textarea
                required
                value={logData.description || ''}
                onChange={(e) => setLogData({ ...logData, description: e.target.value })}
                rows={3}
                placeholder="What was done..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parts Used</Label>
                <Input
                  value={logData.parts_used || ''}
                  onChange={(e) => setLogData({ ...logData, parts_used: e.target.value })}
                  placeholder="e.g., AC Filter (Model X)"
                />
              </div>

              <div className="space-y-2">
                <Label>Cost (AED)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={logData.cost || ''}
                  onChange={(e) => setLogData({ ...logData, cost: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Duration (Hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={logData.duration_hours || ''}
                  onChange={(e) => setLogData({ ...logData, duration_hours: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Status After Maintenance</Label>
                <Select
                  value={logData.status_after || 'active'}
                  onValueChange={(value) => setLogData({ ...logData, status_after: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="faulty">Faulty</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Performed By*</Label>
              <Input
                required
                value={logData.performed_by || 'current_user'}
                onChange={(e) => setLogData({ ...logData, performed_by: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLogDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Log
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Issue Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Issue</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Description*</Label>
              <Textarea
                required
                value={requestData.issue_description || ''}
                onChange={(e) => setRequestData({ ...requestData, issue_description: e.target.value })}
                rows={3}
                placeholder="Describe the problem..."
              />
            </div>

            <div className="space-y-2">
              <Label>Priority*</Label>
              <Select
                value={requestData.priority || 'medium'}
                onValueChange={(value) => setRequestData({ ...requestData, priority: value })}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}