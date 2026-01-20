import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Users, Plus, Edit, Trash2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVAILABLE_PERMISSIONS = [
  { id: 'view_dashboard', label: 'View Dashboard', category: 'Master' },
  { id: 'fix_dates', label: 'Fix Dates', category: 'Master' },
  { id: 'bed_diagnostics', label: 'Bed Diagnostics', category: 'Master' },
  { id: 'manage_technicians', label: 'Manage Technicians', category: 'Master' },
  { id: 'manage_external_personnel', label: 'Manage External Personnel', category: 'Master' },
  { id: 'manage_camps', label: 'Manage Camps', category: 'Master' },
  { id: 'manage_hospitals', label: 'Manage Hospitals', category: 'Master' },
  { id: 'manage_projects', label: 'Manage Projects', category: 'Master' },
  { id: 'manage_meal_preferences', label: 'Manage Meal Preferences', category: 'Master' },

  { id: 'onboarding_form', label: 'Onboarding Form', category: 'Onboarding' },
  { id: 'airport_pickup_plan', label: 'Airport Pickup Plan', category: 'Onboarding' },
  { id: 'expected_arrivals', label: 'Expected Arrivals', category: 'Onboarding' },
  { id: 'sajja_pre_induction', label: 'Sajja Pre-Induction', category: 'Onboarding' },
  { id: 'induction_master', label: 'Induction Master', category: 'Onboarding' },
  { id: 'pipeline_report', label: 'Pipeline Report', category: 'Onboarding' },

  { id: 'initiate_transfer', label: 'Initiate Transfer', category: 'Camp Transfers' },
  { id: 'my_transfer_requests', label: 'My Transfer Requests', category: 'Camp Transfers' },
  { id: 'approve_transfer_requests', label: 'Approve Transfer Requests', category: 'Camp Transfers' },
  { id: 'dispatch_transfer_requests', label: 'Dispatch Transfer Requests', category: 'Camp Transfers' },
  { id: 'incoming_requests', label: 'Incoming Requests', category: 'Camp Transfers' },
  { id: 'confirm_arrivals', label: 'Confirm Arrivals', category: 'Camp Transfers' },
  { id: 'camp_induction', label: 'Camp Induction', category: 'Camp Transfers' },
  { id: 'transfer_history', label: 'Transfer History', category: 'Camp Transfers' },
  { id: 'schedule_policies', label: 'Schedule Policies', category: 'Camp Transfers' },

  { id: 'manage_visitors', label: 'Manage Visitors', category: 'Camp Operations' },
  { id: 'smart_allocation', label: 'Smart Allocation', category: 'Camp Operations' },
  { id: 'manual_allocation', label: 'Manual Allocation', category: 'Camp Operations' },
  { id: 'bulk_transfer', label: 'Bulk Transfer', category: 'Camp Operations' },
  { id: 'pending_transfers', label: 'Pending Transfers', category: 'Camp Operations' },
  { id: 'attendance', label: 'Attendance/Absent', category: 'Camp Operations' },
  { id: 'daily_activity_log', label: 'Daily Activity Log', category: 'Camp Operations' },
  { id: 'meal_preference_changes', label: 'Meal Preference Changes', category: 'Camp Operations' },

  { id: 'asset_dashboard', label: 'Asset Dashboard', category: 'Asset Maintenance' },
  { id: 'pm_scheduler', label: 'PM Scheduler', category: 'Asset Maintenance' },
  { id: 'maintenance_requests', label: 'Maintenance Requests', category: 'Asset Maintenance' },

  { id: 'medical_management', label: 'Medical Management', category: 'Medical & Health' },

  { id: 'appointment_management', label: 'Appointment Management', category: 'EID & Visa' },

  { id: 'event_management', label: 'Event Management', category: 'Recreation & Welfare' },
  { id: 'my_events', label: 'My Events', category: 'Recreation & Welfare' },

  { id: 'my_meal_preferences', label: 'My Meal Preferences', category: 'Personal' },

  { id: 'camp_renewal', label: 'Camp Renewal', category: 'Camp Hiring (TR)' },
  { id: 'hiring_requests', label: 'Hiring Requests', category: 'Camp Hiring (TR)' },
  { id: 'new_hiring_request', label: 'New Hiring Request', category: 'Camp Hiring (TR)' },

  { id: 'manage_documents', label: 'Manage Documents', category: 'Compliance & HR' },
  { id: 'expiry_followup', label: 'Expiry Follow-up', category: 'Compliance & HR' },
  { id: 'leave_management', label: 'Leave Management', category: 'Compliance & HR' },
  { id: 'disciplinary', label: 'Disciplinary', category: 'Compliance & HR' },
  { id: 'disciplinary_action_types', label: 'Disciplinary Action Types', category: 'Compliance & HR' },
  { id: 'sonapur_exit_tracker', label: 'Sonapur Exit Tracker', category: 'Compliance & HR' },
  { id: 'technician_report', label: 'Technician Report', category: 'Compliance & HR' },

  { id: 'view_reports', label: 'View Reports', category: 'Reporting' },

  { id: 'manage_roles', label: 'Manage Roles & Permissions', category: 'Admin' },

  { id: 'system_guide', label: 'System Guide', category: 'Help' },
  { id: 'download_brd', label: 'Download BRD', category: 'Help' },
];

export default function RolesAndPermissions() {
  const [roleDialog, setRoleDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] });
  const [assignForm, setAssignForm] = useState({ user_email: '', role_id: '' });
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [permissionSearch, setPermissionSearch] = useState('');

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: inductionParties = [] } = useQuery({
    queryKey: ['induction-parties'],
    queryFn: () => base44.entities.InductionParty.list('sequence_order'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleDialog(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      setEditingRole(null);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleDialog(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      setEditingRole(null);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.UserRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      setAssignDialog(false);
      setAssignForm({ user_email: '', role_id: '' });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.UserRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ email, data }) => {
      const user = users.find(u => u.email === email);
      return base44.entities.User.update(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleSaveRole = () => {
    if (!roleForm.name.trim()) {
      alert('Role name is required');
      return;
    }

    const roleData = {
      ...roleForm,
      permissions: JSON.stringify(roleForm.permissions),
    };

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: roleData });
    } else {
      createRoleMutation.mutate(roleData);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions ? JSON.parse(role.permissions) : [],
    });
    setRoleDialog(true);
  };

  const handleDeleteRole = (roleId) => {
    const assignedUsers = userRoles.filter(ur => ur.role_id === roleId);
    if (assignedUsers.length > 0) {
      if (!confirm(`This role is assigned to ${assignedUsers.length} user(s). Delete anyway?`)) {
        return;
      }
    }

    if (confirm('Are you sure you want to delete this role?')) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handleAssignRole = () => {
    if (!assignForm.user_email || !assignForm.role_id) {
      alert('Please select both user and role');
      return;
    }

    const existing = userRoles.find(
      ur => ur.user_email === assignForm.user_email && ur.role_id === assignForm.role_id
    );

    if (existing) {
      alert('This user already has this role assigned');
      return;
    }

    assignRoleMutation.mutate({
      ...assignForm,
      assigned_by: currentUser?.email,
      assigned_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleRemoveUserRole = (userRoleId) => {
    if (confirm('Remove this role from the user?')) {
      removeRoleMutation.mutate(userRoleId);
    }
  };

  const togglePermission = (permissionId) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const selectAllPermissions = () => {
    const allFilteredPermissions = Object.values(getFilteredPermissions()).flat().map(p => p.id);
    setRoleForm(prev => ({
      ...prev,
      permissions: [...new Set([...prev.permissions, ...allFilteredPermissions])]
    }));
  };

  const deselectAllPermissions = () => {
    const allFilteredPermissions = Object.values(getFilteredPermissions()).flat().map(p => p.id);
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.filter(p => !allFilteredPermissions.includes(p))
    }));
  };

  const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  const getFilteredPermissions = () => {
    if (!permissionSearch.trim()) return permissionsByCategory;

    const searchLower = permissionSearch.toLowerCase();
    const filtered = {};

    Object.entries(permissionsByCategory).forEach(([category, perms]) => {
      const matchingPerms = perms.filter(perm =>
        perm.label.toLowerCase().includes(searchLower) ||
        perm.category.toLowerCase().includes(searchLower)
      );

      if (matchingPerms.length > 0) {
        filtered[category] = matchingPerms;
      }
    });

    return filtered;
  };

  const downloadBulkTemplate = () => {
    // Export current roles configuration to CSV
    const headers = ['Role Name', 'Description', ...AVAILABLE_PERMISSIONS.map(p => p.label)];

    // If there are existing roles, export them; otherwise provide an example
    const rows = roles.length > 0
      ? roles.map(role => {
        const permissions = role.permissions ? JSON.parse(role.permissions) : [];
        return [
          role.name,
          role.description || '',
          ...AVAILABLE_PERMISSIONS.map(p => permissions.includes(p.id) ? 'YES' : 'NO')
        ];
      })
      : [
        ['Camp Manager', 'Manages camp operations', ...AVAILABLE_PERMISSIONS.map(p =>
          ['manage_camps', 'manage_visitors', 'attendance'].includes(p.id) ? 'YES' : 'NO'
        )],
        ['', '', ...AVAILABLE_PERMISSIONS.map(() => '')]
      ];

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roles_configuration_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

        const roleNameIdx = headers.findIndex(h => h.toLowerCase().includes('role name'));
        const descIdx = headers.findIndex(h => h.toLowerCase().includes('description'));

        let created = 0;
        let updated = 0;
        let errors = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
          const roleName = cells[roleNameIdx];

          if (!roleName) continue;

          const description = cells[descIdx] || '';
          const permissions = [];

          AVAILABLE_PERMISSIONS.forEach((perm, idx) => {
            const cellValue = cells[idx + 2] || '';
            if (cellValue.toLowerCase() === 'yes' || cellValue.toLowerCase() === 'x' || cellValue === '1') {
              permissions.push(perm.id);
            }
          });

          const roleData = {
            name: roleName,
            description,
            permissions: JSON.stringify(permissions),
            is_active: true
          };

          try {
            // Check if role already exists
            const existingRole = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());

            if (existingRole) {
              // Update existing role
              await updateRoleMutation.mutateAsync({
                id: existingRole.id,
                data: roleData
              });
              updated++;
            } else {
              // Create new role
              await createRoleMutation.mutateAsync(roleData);
              created++;
            }
          } catch (err) {
            errors.push(`${roleName}: ${err.message}`);
          }
        }

        setBulkResult({ success: true, created, updated, errors });
        queryClient.invalidateQueries({ queryKey: ['roles'] });
      } catch (err) {
        setBulkResult({ success: false, error: err.message });
      }
    };

    reader.readAsText(bulkFile);
  };

  const getUsersWithRoles = () => {
    return users.map(user => {
      const assignedRoles = userRoles.filter(ur => ur.user_email === user.email);
      return {
        ...user,
        roles: assignedRoles.map(ur => {
          const role = roles.find(r => r.id === ur.role_id);
          return { ...ur, roleName: role?.name || 'Unknown' };
        })
      };
    });
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-600 mt-1">Manage system roles and user permissions</p>
          </div>
        </div>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="users">User Assignments</TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            {/* Permission Matrix */}
            <Card className="border shadow-sm bg-white overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Permission Matrix - Configure All Roles</h3>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-medium sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                          Permission
                        </th>
                        <th className="px-6 py-4 font-medium bg-gray-50 min-w-[150px]">
                          Category
                        </th>
                        {roles.map(role => (
                          <th key={role.id} className="px-4 py-4 text-center min-w-[120px]">
                            <div className="flex flex-col items-center gap-2">
                              <span className="font-semibold text-gray-900">{role.name}</span>
                              <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditRole(role)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteRole(role.id)}>
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...AVAILABLE_PERMISSIONS].sort((a, b) => a.label.localeCompare(b.label)).map((perm, idx) => (
                        <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900 bg-white sticky left-0 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {perm.label}
                          </td>
                          <td className="px-6 py-3 text-gray-500">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none font-normal">
                              {perm.category}
                            </Badge>
                          </td>
                          {roles.map(role => {
                            const permissions = role.permissions ? JSON.parse(role.permissions) : [];
                            return (
                              <td key={role.id} className="px-4 py-3 text-center border-l border-gray-50">
                                <div className="flex justify-center">
                                  <Checkbox
                                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                    checked={permissions.includes(perm.id)}
                                    onCheckedChange={(checked) => {
                                      const newPermissions = checked
                                        ? [...permissions, perm.id]
                                        : permissions.filter(p => p !== perm.id);

                                      updateRoleMutation.mutate({
                                        id: role.id,
                                        data: {
                                          ...role,
                                          permissions: JSON.stringify(newPermissions)
                                        }
                                      });
                                    }}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {roles.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No roles created yet</p>
                    <p className="text-sm mt-1">Create roles using the buttons below</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Role Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={downloadBulkTemplate}>
                {roles.length > 0 ? 'Download CSV (Current Config)' : 'Download CSV Template'}
              </Button>

              <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Bulk Upload Roles
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Roles</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        1. Download the CSV template<br />
                        2. Fill in role names, descriptions, and mark permissions with "YES" or "X"<br />
                        3. Upload the completed file
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label>Upload CSV File</Label>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setBulkFile(e.target.files[0])}
                      />
                    </div>

                    {bulkResult && (
                      <Alert variant={bulkResult.success ? "default" : "destructive"}>
                        <AlertDescription>
                          {bulkResult.success ? (
                            <div>
                              <p>✅ Created {bulkResult.created} role(s), Updated {bulkResult.updated} role(s)</p>
                              {bulkResult.errors.length > 0 && (
                                <div className="mt-2 text-sm">
                                  <p>Errors:</p>
                                  {bulkResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p>Error: {bulkResult.error}</p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => {
                        setBulkDialog(false);
                        setBulkFile(null);
                        setBulkResult(null);
                      }}>Cancel</Button>
                      <Button onClick={handleBulkUpload}>Upload & Create Roles</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingRole(null);
                    setRoleForm({ name: '', description: '', permissions: [] });
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <Label>Role Name*</Label>
                      <Input
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        placeholder="e.g., Camp Manager, HR Manager"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        placeholder="Brief description of this role"
                        rows={2}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-semibold">Permissions</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllPermissions}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={deselectAllPermissions}
                            className="text-xs"
                          >
                            Deselect All
                          </Button>
                        </div>
                      </div>

                      {/* Search Input */}
                      <div className="mb-4">
                        <Input
                          placeholder="Search permissions..."
                          value={permissionSearch}
                          onChange={(e) => setPermissionSearch(e.target.value)}
                          className="w-full"
                        />
                        {permissionSearch && (
                          <p className="text-xs text-gray-500 mt-1">
                            Found {Object.values(getFilteredPermissions()).flat().length} permission(s)
                          </p>
                        )}
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {Object.entries(getFilteredPermissions()).map(([category, perms]) => (
                          <Card key={category} className="bg-gray-50">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold text-gray-700">{category}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {perms.map(perm => (
                                <div key={perm.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={roleForm.permissions.includes(perm.id)}
                                    onCheckedChange={() => togglePermission(perm.id)}
                                  />
                                  <label className="text-sm cursor-pointer flex-1" onClick={() => togglePermission(perm.id)}>
                                    {perm.label}
                                  </label>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}

                        {Object.keys(getFilteredPermissions()).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p>No permissions match your search</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancel</Button>
                      <Button onClick={handleSaveRole}>
                        {editingRole ? 'Update Role' : 'Create Role'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Roles List */}
            <div className="grid md:grid-cols-2 gap-6">
              {roles.map(role => {
                const permissions = role.permissions ? JSON.parse(role.permissions) : [];
                const assignedCount = userRoles.filter(ur => ur.role_id === role.id).length;

                return (
                  <Card key={role.id} className="border-none shadow-lg">
                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{role.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              {assignedCount} user{assignedCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {role.description && (
                        <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Permissions ({permissions.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {permissions.length > 0 ? (
                            permissions.slice(0, 5).map(permId => {
                              const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
                              return perm ? (
                                <Badge key={permId} variant="secondary" className="text-xs">
                                  {perm.label}
                                </Badge>
                              ) : null;
                            })
                          ) : (
                            <span className="text-sm text-gray-500">No permissions assigned</span>
                          )}
                          {permissions.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{permissions.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {roles.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No roles created yet</p>
                  <p className="text-sm mt-1">Create your first role to get started</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Assign Role Button */}
            <div className="flex justify-end">
              <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Role to User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Role to User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>User*</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={assignForm.user_email}
                        onChange={(e) => setAssignForm({ ...assignForm, user_email: e.target.value })}
                      >
                        <option value="">Select user...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.email}>
                            {user.full_name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Role*</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={assignForm.role_id}
                        onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
                      >
                        <option value="">Select role...</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
                      <Button onClick={handleAssignRole}>Assign Role</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Users List */}
            <div className="space-y-4">
              {getUsersWithRoles().map(user => (
                <Card key={user.id} className="border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                            {user.camp_id && (
                              <Badge className="bg-blue-100 text-blue-700">
                                {camps.find(c => c.id === user.camp_id)?.name || 'Camp'}
                              </Badge>
                            )}
                            {user.induction_party_id && (
                              <Badge className="bg-purple-100 text-purple-700">
                                {inductionParties.find(p => p.id === user.induction_party_id)?.party_name || 'Party'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {/* Camp Assignment */}
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Assigned Camp:</p>
                          <Select
                            value={user.camp_id || 'none'}
                            onValueChange={(value) => {
                              updateUserMutation.mutate({
                                email: user.email,
                                data: { camp_id: value === 'none' ? null : value }
                              });
                            }}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Select camp" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (All Camps)</SelectItem>
                              {camps.map(camp => (
                                <SelectItem key={camp.id} value={camp.id}>
                                  {camp.name} ({camp.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Show Induction Department if user has induction-related permissions */}
                        {user.roles.some(roleAssignment => {
                          const role = roles.find(r => r.id === roleAssignment.role_id);
                          if (!role) return false;
                          const permissions = role.permissions ? JSON.parse(role.permissions) : [];
                          return permissions.includes('induction_master') || permissions.includes('sajja_pre_induction');
                        }) && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Induction Department:</p>
                              <Select
                                value={user.induction_party_id || 'none'}
                                onValueChange={(value) => {
                                  updateUserMutation.mutate({
                                    email: user.email,
                                    data: { induction_party_id: value === 'none' ? null : value }
                                  });
                                }}
                              >
                                <SelectTrigger className="w-64">
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {inductionParties.filter(p => p.is_active !== false).map(party => (
                                    <SelectItem key={party.id} value={party.id}>
                                      {party.party_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                        <div>
                          <p className="text-sm text-gray-600 mb-2">Assigned Roles:</p>
                          <div className="flex flex-wrap gap-2">
                            {user.roles.length > 0 ? (
                              user.roles.map(roleAssignment => {
                                const role = roles.find(r => r.id === roleAssignment.role_id);
                                return (
                                  <Badge
                                    key={roleAssignment.id}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                  >
                                    {role?.name || 'Unknown'}
                                    <button
                                      onClick={() => handleRemoveUserRole(roleAssignment.id)}
                                      className="hover:text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-sm text-gray-500">No custom roles</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No users found</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}