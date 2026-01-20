
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Briefcase, Plus, Users, Edit2, Trash2, Search, ArrowUpDown } from "lucide-react";

export default function Projects() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("project_code");
  const [sortDirection, setSortDirection] = useState("asc");

  const [projectForm, setProjectForm] = useState({
    sou: '',
    project_code: '',
    project_name: '',
    description: '',
    client_name: '',
    location: '',
    status: 'active',
    start_date: '',
    end_date: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('project_name'), // Changed to sort by project_name by default
    staleTime: 0, // Data is immediately stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const createMutation = useMutation({ // Renamed from createProjectMutation
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: async () => { // Added async and await
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowAddDialog(false);
      resetForm(); // Kept resetForm() consistent with existing logic
      alert("Project created successfully!");
    },
  });

  const updateMutation = useMutation({ // Renamed from updateProjectMutation
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: async () => { // Added async and await
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowEditDialog(false);
      setSelectedProject(null); // Kept setSelectedProject(null) consistent with existing logic
      resetForm();
      alert("Project updated successfully!");
    },
  });

  const deleteMutation = useMutation({ // Renamed from deleteProjectMutation
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: async () => { // Added async and await
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      alert("Project deleted successfully!");
    },
  });

  const resetForm = () => {
    setProjectForm({
      sou: '',
      project_code: '',
      project_name: '',
      description: '',
      client_name: '',
      location: '',
      status: 'active',
      start_date: '',
      end_date: '',
      notes: ''
    });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!projectForm.project_code || !projectForm.project_name) {
      alert("Project Code and Project Name are required");
      return;
    }

    setProcessing(true);
    try {
      await createMutation.mutateAsync(projectForm); // Used renamed mutation
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    
    if (!projectForm.project_code || !projectForm.project_name) {
      alert("Project Code and Project Name are required");
      return;
    }

    setProcessing(true);
    try {
      await updateMutation.mutateAsync({ // Used renamed mutation
        id: selectedProject.id,
        data: projectForm
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClick = async (project) => {
    const assignedTechs = technicians.filter(t => t.project_id === project.id);
    
    if (assignedTechs.length > 0) {
      if (!confirm(`This project has ${assignedTechs.length} assigned technician(s). Are you sure you want to delete it?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete project "${project.project_name}"?`)) {
        return;
      }
    }

    await deleteMutation.mutateAsync(project.id); // Used renamed mutation
  };

  const handleEditClick = (project) => {
    setSelectedProject(project);
    setProjectForm({
      sou: project.sou || '',
      project_code: project.project_code || '',
      project_name: project.project_name || '',
      description: project.description || '',
      client_name: project.client_name || '',
      location: project.location || '',
      status: project.status || 'active',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      notes: project.notes || ''
    });
    setShowEditDialog(true);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort projects
  let filteredProjects = projects.filter(project => {
    const matchesSearch = !searchQuery || 
      project.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.sou?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort
  filteredProjects = [...filteredProjects].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    // Handle string comparison for sorting
    if (typeof aVal === 'string' && typeof bVal === 'string') {
        if (sortDirection === 'asc') {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    }
    // Fallback for non-string or mixed types, though generally not expected for these fields
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Calculate stats
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalAssignedTechs = technicians.filter(t => t.project_id).length;
  const projectsWithTechs = [...new Set(technicians.filter(t => t.project_id).map(t => t.project_id))].length;

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Master</h1>
            <p className="text-gray-600 mt-1">Manage all projects and assignments</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Project
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-0.5">Total Projects</p>
                  <p className="text-2xl font-bold text-blue-900">{projects.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-0.5">Active Projects</p>
                  <p className="text-2xl font-bold text-green-900">{activeProjects}</p>
                </div>
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 mb-0.5">Projects with Staff</p>
                  <p className="text-2xl font-bold text-purple-900">{projectsWithTechs}</p>
                </div>
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600 mb-0.5">Assigned Technicians</p>
                  <p className="text-2xl font-bold text-orange-900">{totalAssignedTechs}</p>
                </div>
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by code, name, SOU, or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-0">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {projects.length === 0 ? 'No projects created yet' : 'No projects match your search'}
                </p>
                {projects.length === 0 && (
                  <Button onClick={() => setShowAddDialog(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('sou')}>
                          <span>SOU</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('project_code')}>
                          <span>Project Code</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('project_name')}>
                          <span>Project Name</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Client</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Assigned Staff</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project, index) => {
                      const assignedCount = technicians.filter(t => t.project_id === project.id).length;
                      
                      return (
                        <tr
                          key={project.id}
                          className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">{project.sou || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{project.project_code}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{project.project_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{project.client_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{project.location || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={
                              project.status === 'active' ? 'default' :
                              project.status === 'on_hold' ? 'secondary' :
                              project.status === 'completed' ? 'success' : 'destructive'
                            }>
                              {project.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{assignedCount}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(project)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(project)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
      </div>

      {/* Add Project Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Create New Project
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateProject} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sou">SOU</Label>
                <Input
                  id="sou"
                  value={projectForm.sou}
                  onChange={(e) => setProjectForm({...projectForm, sou: e.target.value})}
                  placeholder="e.g., SOU-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_code">Project Code*</Label>
                <Input
                  id="project_code"
                  required
                  value={projectForm.project_code}
                  onChange={(e) => setProjectForm({...projectForm, project_code: e.target.value})}
                  placeholder="e.g., PROJ-2024-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name*</Label>
              <Input
                id="project_name"
                required
                value={projectForm.project_name}
                onChange={(e) => setProjectForm({...projectForm, project_name: e.target.value})}
                placeholder="e.g., Dubai Marina Tower Construction"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={projectForm.client_name}
                  onChange={(e) => setProjectForm({...projectForm, client_name: e.target.value})}
                  placeholder="Client or customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                  placeholder="Project location"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={projectForm.description}
                onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                placeholder="Project details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={projectForm.status} onValueChange={(value) => setProjectForm({...projectForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={projectForm.start_date}
                  onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={projectForm.end_date}
                  onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={projectForm.notes}
                onChange={(e) => setProjectForm({...projectForm, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {processing ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Edit Project
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateProject} className="space-y-4 py-4">
            {/* Same form fields as Add Dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_sou">SOU</Label>
                <Input
                  id="edit_sou"
                  value={projectForm.sou}
                  onChange={(e) => setProjectForm({...projectForm, sou: e.target.value})}
                  placeholder="e.g., SOU-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_project_code">Project Code*</Label>
                <Input
                  id="edit_project_code"
                  required
                  value={projectForm.project_code}
                  onChange={(e) => setProjectForm({...projectForm, project_code: e.target.value})}
                  placeholder="e.g., PROJ-2024-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_project_name">Project Name*</Label>
              <Input
                id="edit_project_name"
                required
                value={projectForm.project_name}
                onChange={(e) => setProjectForm({...projectForm, project_name: e.target.value})}
                placeholder="e.g., Dubai Marina Tower Construction"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_client_name">Client Name</Label>
                <Input
                  id="edit_client_name"
                  value={projectForm.client_name}
                  onChange={(e) => setProjectForm({...projectForm, client_name: e.target.value})}
                  placeholder="Client or customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_location">Location</Label>
                <Input
                  id="edit_location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                  placeholder="Project location"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={projectForm.description}
                onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                placeholder="Project details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={projectForm.status} onValueChange={(value) => setProjectForm({...projectForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={projectForm.start_date}
                  onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_end_date">End Date</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={projectForm.end_date}
                  onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={projectForm.notes}
                onChange={(e) => setProjectForm({...projectForm, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedProject(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {processing ? 'Updating...' : 'Update Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
