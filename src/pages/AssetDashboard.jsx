import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wrench, AlertTriangle, Plus, Search, Eye, 
  Calendar, AlertCircle, Shield
} from "lucide-react";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AssetDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [campFilter, setCampFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-created_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => base44.entities.MaintenanceRequest.list('-date_reported'),
  });

  // Calculate statistics
  const totalAssets = assets.length;
  const activeAssets = assets.filter(a => a.status === 'active').length;
  const faultyAssets = assets.filter(a => a.status === 'faulty').length;
  const underMaintenance = assets.filter(a => a.status === 'under_maintenance').length;
  
  // Assets due for PM (within next 7 days or overdue)
  const assetsDueForPM = assets.filter(asset => {
    if (!asset.next_preventive_maintenance_date) return false;
    const dueDate = parseISO(asset.next_preventive_maintenance_date);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    return daysUntilDue <= 7;
  }).length;

  // Assets under warranty
  const assetsUnderWarranty = assets.filter(asset => {
    if (!asset.warranty_expiry_date) return false;
    return !isPast(parseISO(asset.warranty_expiry_date));
  }).length;

  // Open maintenance requests
  const openRequests = requests.filter(r => ['new', 'assigned', 'in_progress'].includes(r.status)).length;

  // Apply filters
  let filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location_in_camp?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCamp = campFilter === 'all' || asset.camp_id === campFilter;
    const matchesType = typeFilter === 'all' || asset.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    
    return matchesSearch && matchesCamp && matchesType && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-700',
      'under_maintenance': 'bg-yellow-100 text-yellow-700',
      'faulty': 'bg-red-100 text-red-700',
      'decommissioned': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getAssetTypeIcon = (type) => {
    // Simple text representation since we don't have specific icons
    const types = {
      'refrigerator': '🧊',
      'water_dispenser': '💧',
      'ac_unit': '❄️',
      'washing_machine': '🧺',
      'oven': '🔥',
      'heater': '🔥',
      'water_tank': '🚰',
      'water_pump': '⚙️',
      'generator': '⚡',
      'fire_extinguisher': '🧯',
      'cctv_camera': '📹',
      'other': '🔧'
    };
    return types[type] || '🔧';
  };

  const stats = [
    { title: "Total Assets", value: totalAssets, icon: Wrench, color: "blue" },
    { title: "Assets Due for PM", value: assetsDueForPM, icon: Calendar, color: "orange" },
    { title: "Faulty Assets", value: faultyAssets, icon: AlertTriangle, color: "red" },
    { title: "Under Maintenance", value: underMaintenance, icon: Wrench, color: "yellow" },
    { title: "Open Requests", value: openRequests, icon: AlertCircle, color: "purple" },
    { title: "Under Warranty", value: assetsUnderWarranty, icon: Shield, color: "green" },
  ];

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
            <p className="text-gray-600 mt-1">Track and maintain camp assets</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('MaintenanceRequests')}>
              <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                <AlertCircle className="w-4 h-4 mr-2" />
                View Requests
              </Button>
            </Link>
            <Link to={createPageUrl('MaintenanceScheduler')}>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                <Calendar className="w-4 h-4 mr-2" />
                PM Scheduler
              </Button>
            </Link>
            <Link to={createPageUrl('AssetDetail')}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  placeholder="Search assets..."
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

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
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

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="faulty">Faulty</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset Tag</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Camp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Next PM</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                        <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No assets found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => {
                      const camp = camps.find(c => c.id === asset.camp_id);
                      const isPMDue = asset.next_preventive_maintenance_date && 
                        differenceInDays(parseISO(asset.next_preventive_maintenance_date), new Date()) <= 7;
                      
                      return (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{asset.asset_tag}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getAssetTypeIcon(asset.type)}</span>
                              <p className="font-medium text-gray-900">{asset.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600 capitalize">{asset.type?.replace(/_/g, ' ')}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{camp?.name || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">{asset.location_in_camp || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusColor(asset.status)}>
                              {asset.status?.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {asset.next_preventive_maintenance_date ? (
                              <div>
                                <p className={`text-sm font-medium ${isPMDue ? 'text-red-600' : 'text-gray-900'}`}>
                                  {format(parseISO(asset.next_preventive_maintenance_date), 'MMM dd, yyyy')}
                                </p>
                                {isPMDue && (
                                  <Badge variant="destructive" className="text-xs mt-1">Due Soon</Badge>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">Not scheduled</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link to={createPageUrl(`AssetDetail?id=${asset.id}`)}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}