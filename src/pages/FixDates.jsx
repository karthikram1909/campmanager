import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Calendar } from "lucide-react";

export default function FixDates() {
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState(null);

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['technician-documents'],
    queryFn: () => base44.entities.TechnicianDocument.list(),
  });

  const { data: campDocuments = [] } = useQuery({
    queryKey: ['camp-documents'],
    queryFn: () => base44.entities.CampDocument.list(),
  });

  const queryClient = useQueryClient();

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const convertDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // Already in YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Convert DD/MM/YYYY to YYYY-MM-DD
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null; // Invalid format
  };

  const handleFixAllDates = async () => {
    setFixing(true);
    setResult(null);

    let fixedCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // Fix Technician dates
      for (const tech of technicians) {
        const updates = {};
        let needsUpdate = false;

        // Check and convert each date field
        ['date_of_birth', 'expected_arrival_date', 'actual_arrival_date', 'induction_date', 'exit_date', 'last_transfer_date'].forEach(field => {
          if (tech[field]) {
            const converted = convertDate(tech[field]);
            if (converted && converted !== tech[field]) {
              updates[field] = converted;
              needsUpdate = true;
            }
          }
        });

        if (needsUpdate) {
          try {
            await base44.entities.Technician.update(tech.id, updates);
            fixedCount++;
          } catch (err) {
            errorCount++;
            errors.push(`Technician ${tech.employee_id}: ${err.message}`);
          }
        }
      }

      // Fix Technician Document dates
      for (const doc of documents) {
        const updates = {};
        let needsUpdate = false;

        ['issue_date', 'expiry_date'].forEach(field => {
          if (doc[field]) {
            const converted = convertDate(doc[field]);
            if (converted && converted !== doc[field]) {
              updates[field] = converted;
              needsUpdate = true;
            }
          }
        });

        if (needsUpdate) {
          try {
            await base44.entities.TechnicianDocument.update(doc.id, updates);
            fixedCount++;
          } catch (err) {
            errorCount++;
            errors.push(`Document ${doc.id}: ${err.message}`);
          }
        }
      }

      // Fix Camp Document dates
      for (const doc of campDocuments) {
        const updates = {};
        let needsUpdate = false;

        ['issue_date', 'expiry_date'].forEach(field => {
          if (doc[field]) {
            const converted = convertDate(doc[field]);
            if (converted && converted !== doc[field]) {
              updates[field] = converted;
              needsUpdate = true;
            }
          }
        });

        if (needsUpdate) {
          try {
            await base44.entities.CampDocument.update(doc.id, updates);
            fixedCount++;
          } catch (err) {
            errorCount++;
            errors.push(`Camp Document ${doc.id}: ${err.message}`);
          }
        }
      }

      setResult({
        success: true,
        fixed: fixedCount,
        errors: errorCount,
        errorDetails: errors
      });

      // Refresh all data
      queryClient.invalidateQueries();

    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    }

    setFixing(false);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fix Date Formats</h1>
          <p className="text-gray-600 mt-1">Convert all dates from DD/MM/YYYY to YYYY-MM-DD format</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>What this tool does:</strong>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Scans all technicians, documents, and camp documents</li>
              <li>Converts dates from DD/MM/YYYY to YYYY-MM-DD format</li>
              <li>This is a ONE-TIME fix to standardize your database</li>
              <li>After running this, all dates will be in ISO format (YYYY-MM-DD)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Date Format Converter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Records to check:</strong>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• {technicians.length} Technicians</li>
                <li>• {documents.length} Technician Documents</li>
                <li>• {campDocuments.length} Camp Documents</li>
              </ul>
            </div>

            <Button
              onClick={handleFixAllDates}
              disabled={fixing}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {fixing ? 'Fixing Dates...' : 'Fix All Date Formats Now'}
            </Button>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {result.success ? (
                    <div>
                      <p className="font-semibold">✅ Date Fix Complete!</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Fixed {result.fixed} records</li>
                        {result.errors > 0 && <li>• Errors: {result.errors}</li>}
                      </ul>
                      {result.errorDetails && result.errorDetails.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm">View Errors</summary>
                          <ul className="mt-2 space-y-1 text-xs">
                            {result.errorDetails.map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ) : (
                    <p>Error: {result.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>Important:</strong> After running this tool, you can delete this page. It's only needed once to fix existing data.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}