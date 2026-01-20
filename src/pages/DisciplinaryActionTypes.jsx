import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, List, ArrowUpDown, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function DisciplinaryActionTypes() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    is_active: true,
    display_order: 0
  });

  const [sortField, setSortField] = useState("display_order");
  const [sortDirection, setSortDirection] = useState("asc");

  // Excel-style column filters
  const [filterName, setFilterName] = useState([]);
  const [filterCode, setFilterCode] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);

  // Search states for column filters
  const [searchName, setSearchName] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  const queryClient = useQueryClient();

  const { data: actionTypes = [], isLoading } = useQuery({
    queryKey: ['disciplinary-action-types'],
    queryFn: () => base44.entities.DisciplinaryActionType.list('display_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DisciplinaryActionType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary-action-types'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DisciplinaryActionType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary-action-types'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DisciplinaryActionType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary-action-types'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      is_active: true,
      display_order: 0
    });
    setEditingType(null);
  };

  const handleAddNew = () => {
    resetForm();
    setFormData(prev => ({ ...prev, display_order: actionTypes.length + 1 }));
    setShowDialog(true);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name || "",
      code: type.code || "",
      description: type.description || "",
      is_active: type.is_active !== false,
      display_order: type.display_order || 0
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this action type?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique values for filters
  const uniqueNames = [...new Set(actionTypes.map(at => at.name || '-'))].sort();
  const uniqueCodes = [...new Set(actionTypes.map(at => at.code || '-'))].sort();
  const uniqueStatuses = ['Active', 'Inactive'];

  // Apply filters
  let filteredTypes = actionTypes.filter(type => {
    const statusText = type.is_active !== false ? 'Active' : 'Inactive';
    
    if (filterName.length > 0 && !filterName.includes(type.name || '-')) return false;
    if (filterCode.length > 0 && !filterCode.includes(type.code || '-')) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(statusText)) return false;
    
    return true;
  });

  // Sort
  filteredTypes = filteredTypes.sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    
    if (sortField === 'display_order') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const clearAllFilters = () => {
    setFilterName([]);
    setFilterCode([]);
    setFilterStatus([]);
  };

  const hasActiveFilters = filterName.length > 0 || filterCode.length > 0 || filterStatus.length > 0;

  // Column Filter Component
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
          <div className="p-2 border-b">
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8"
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
              <div className="text-center text-sm text-gray-500 py-2">No results</div>
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
                className="w-full"
                onClick={() => setSelected([])}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading action types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Disciplinary Action Types</h1>
            <p className="text-gray-600 mt-1">Manage action types for disciplinary records</p>
          </div>
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Action Type
          </Button>
        </div>

        {/* Action Types Table */}
        <Card className="border-none shadow-lg">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Column filters active
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle>Action Types ({filteredTypes.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            {filteredTypes.length === 0 ? (
              <div className="p-12 text-center">
                <List className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {hasActiveFilters ? "No action types match your filters" : "No action types found"}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Order</span>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('display_order')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Name</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('name')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueNames}
                            selected={filterName}
                            setSelected={setFilterName}
                            searchValue={searchName}
                            setSearchValue={setSearchName}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Code</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('code')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueCodes}
                            selected={filterCode}
                            setSelected={setFilterCode}
                            searchValue={searchCode}
                            setSearchValue={setSearchCode}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Status</span>
                        <ColumnFilter
                          values={uniqueStatuses}
                          selected={filterStatus}
                          setSelected={setFilterStatus}
                          searchValue={searchStatus}
                          setSearchValue={setSearchStatus}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTypes.map((type, index) => (
                    <tr
                      key={type.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-blue-700 border-r border-gray-200 whitespace-nowrap">
                        {type.display_order}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                        {type.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap font-mono">
                        {type.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                        {type.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                        {type.is_active !== false ? (
                          <Badge className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(type)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(type.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredTypes.length}</span> of <span className="font-semibold">{actionTypes.length}</span> action types
            </p>
          </div>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Action Type' : 'Add Action Type'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Action Type Name*</Label>
              <Input
                id="name"
                placeholder="e.g., Verbal Warning, Written Warning"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code* <span className="text-xs text-gray-500">(lowercase with underscores)</span></Label>
              <Input
                id="code"
                placeholder="e.g., verbal_warning, written_warning"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this action type..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order*</Label>
              <Input
                id="display_order"
                type="number"
                min="1"
                value={formData.display_order}
                onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                required
              />
              <p className="text-xs text-gray-500">Controls the order in dropdown lists</p>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active" className="cursor-pointer flex-1">
                <span className="font-semibold text-blue-900">Active</span>
                <p className="text-xs text-blue-700 mt-1">
                  Active action types will appear in dropdown lists
                </p>
              </Label>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingType ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}