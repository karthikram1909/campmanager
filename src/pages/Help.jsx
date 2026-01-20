import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  FileText, Building2, ArrowLeftRight, Calendar, AlertTriangle, BarChart3, 
  Download, CheckCircle2, Clock, UserPlus, Car, Fingerprint,
  LogOut, RefreshCw, Hospital, ClipboardList, ArrowRight, ArrowDown, Square, Diamond
} from "lucide-react";

export default function Help() {
  const [activeTab, setActiveTab] = useState("overview");

  // Workflow Step Component
  const WorkflowStep = ({ number, title, description, status = "default" }) => {
    const statusColors = {
      default: "bg-blue-100 text-blue-700 border-blue-300",
      success: "bg-green-100 text-green-700 border-green-300",
      warning: "bg-yellow-100 text-yellow-700 border-yellow-300",
      error: "bg-red-100 text-red-700 border-red-300",
    };
    return (
      <div className={`p-3 rounded-lg border ${statusColors[status]} mb-2`}>
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-gray-800 text-white">{number}</Badge>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <p className="text-xs ml-7">{description}</p>
      </div>
    );
  };

  // Flowchart Node Component
  const FlowNode = ({ type, label, className = "" }) => {
    const shapes = {
      start: "rounded-full bg-green-500 text-white",
      end: "rounded-full bg-red-500 text-white",
      process: "rounded-lg bg-blue-100 text-blue-800 border border-blue-300",
      decision: "rotate-45 bg-yellow-100 text-yellow-800 border border-yellow-300",
      data: "skew-x-[-10deg] bg-purple-100 text-purple-800 border border-purple-300",
    };
    return (
      <div className={`inline-flex items-center justify-center px-3 py-2 text-xs font-medium ${shapes[type]} ${className}`}>
        <span className={type === "decision" ? "-rotate-45" : ""}>{label}</span>
      </div>
    );
  };

  const downloadBRD = () => {
    const brdContent = `
================================================================================
                    CAMP MANAGEMENT SYSTEM (CampManager)
              DETAILED BUSINESS REQUIREMENTS DOCUMENT (BRD)
================================================================================

Version: 2.0
Date: ${new Date().toLocaleDateString()}
Document Type: Comprehensive Business Requirements Document

================================================================================
TABLE OF CONTENTS
================================================================================
1. Executive Summary
2. System Overview
3. Module 1: Master Data Management
4. Module 2: Onboarding
5. Module 3: Camp Transfers
6. Module 4: Camp Operations
7. Module 5: Asset Maintenance
8. Module 6: Medical & Health
9. Module 7: EID & Visa Management
10. Module 8: Recreation & Welfare
11. Module 9: Compliance & HR
12. Module 10: Camp Hiring (TR)
13. Module 11: Reporting
14. Data Entities & Relationships
15. Business Rules & Validation
16. Glossary

================================================================================
1. EXECUTIVE SUMMARY
================================================================================

CampManager is a comprehensive Labor Camp Management System designed to manage 
all aspects of temporary residence camps for technicians and external personnel 
in the UAE construction/facilities sector.

PRIMARY OBJECTIVES:
- Centralize camp operations management
- Automate technician onboarding workflow
- Track bed occupancy and optimize allocation
- Ensure compliance with document expiry tracking
- Streamline inter-camp transfers
- Manage medical records and insurance claims

KEY PERFORMANCE INDICATORS (KPIs):
┌─────────────────────────────┬─────────────────┐
│ Metric                      │ Target          │
├─────────────────────────────┼─────────────────┤
│ Bed Occupancy Rate          │ 85-95%          │
│ Document Renewal Compliance │ 100%            │
│ Transfer Processing Time    │ <24 hours       │
│ Onboarding Completion       │ <48 hours       │
│ Camp Induction Completion   │ <48 hours       │
└─────────────────────────────┴─────────────────┘

================================================================================
3. MODULE 1: MASTER DATA MANAGEMENT
================================================================================

3.1 TECHNICIAN MANAGEMENT
-------------------------
PURPOSE: Central repository for all technician information

FUNCTIONS:
┌────────────────────────────────────────────────────────────────────────────┐
│ Function          │ Description                     │ Business Logic       │
├───────────────────┼─────────────────────────────────┼──────────────────────┤
│ Add Technician    │ Register new technician         │ Employee ID must be  │
│                   │ manually or via CSV upload      │ unique across system │
├───────────────────┼─────────────────────────────────┼──────────────────────┤
│ Edit Technician   │ Update technician details       │ Audit trail for all  │
│                   │                                 │ changes              │
├───────────────────┼─────────────────────────────────┼──────────────────────┤
│ View Profile      │ Complete technician profile     │ Shows current camp,  │
│                   │ with history                    │ bed, project         │
├───────────────────┼─────────────────────────────────┼──────────────────────┤
│ Search/Filter     │ Advanced search with multiple   │ Filter by status,    │
│                   │ criteria                        │ camp, nationality    │
├───────────────────┼─────────────────────────────────┼──────────────────────┤
│ Bulk Upload       │ CSV import for multiple         │ Validates all fields │
│                   │ technicians                     │ before import        │
├───────────────────┼─────────────────────────────────┼──────────────────────┤
│ Export Data       │ Export to CSV/Print             │ Respects current     │
│                   │                                 │ filters              │
└────────────────────────────────────────────────────────────────────────────┘

DATA FIELDS:
- Personal: employee_id, full_name, nationality, ethnicity, religion, gender,
            date_of_birth, phone, whatsapp_mobile, email, language_preference,
            emergency_contact_no, legal_nominee_name, state, marital_status
- Documents: passport_no, passport_expiry_date, eid_number, eid_expiry_date,
             health_insurance_no, health_insurance_expiry_date
- Work: trade, department, project_id, tentative_project_id
- Camp: camp_id, bed_id, meal_preference_id
- Status: status (pending_arrival, active, on_leave, pending_exit, 
          exited_country, transferred, absconded, suspended)

STATUS TRANSITION RULES:
┌──────────────────┬───────────────────────────────────────────────────────┐
│ From Status      │ Allowed Transitions                                   │
├──────────────────┼───────────────────────────────────────────────────────┤
│ pending_arrival  │ active (on arrival confirmation)                      │
│ active           │ on_leave, pending_exit, transferred, absconded,       │
│                  │ suspended                                             │
│ on_leave         │ active (on return)                                    │
│ pending_exit     │ exited_country (on departure confirmation)            │
│ suspended        │ active (on reinstatement)                             │
└──────────────────┴───────────────────────────────────────────────────────┘

3.2 EXTERNAL PERSONNEL MANAGEMENT
---------------------------------
PURPOSE: Manage non-technician staff (security, drivers, cleaners, cooks, etc.)

FUNCTIONS:
- Add/Edit/Delete external personnel
- Assign to camps and beds
- Track contract periods
- Manage camp induction status

ROLES SUPPORTED:
- Security Guard
- Driver
- Cleaner
- Cook
- Mess Staff
- Maintenance
- Custom roles

3.3 CAMP MANAGEMENT
-------------------
PURPOSE: Manage camp master data and hierarchical structure

CAMP TYPES:
┌─────────────────┬──────────────────────────────────────────────────────────┐
│ Type            │ Purpose                                                  │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ induction_camp  │ New arrivals for pre-induction (e.g., Sajja Camp)       │
│ regular_camp    │ Standard accommodation for active technicians            │
│ exit_camp       │ Technicians undergoing exit formalities (e.g., Sonapur) │
└─────────────────┴──────────────────────────────────────────────────────────┘

CAMP HIERARCHY:
Camp → Floor → Room → Bed

CAMP FUNCTIONS:
- Create/Edit/Delete camps
- Define floors, rooms, beds
- Set room restrictions (gender, occupant type)
- Track contract/Ejari details
- GPS location for map view
- Bulk structure upload via CSV
- Generate room barcodes

BED STATUS LOGIC:
┌────────────┬────────────────────────────────────────────────────────────────┐
│ Status     │ Description                                                    │
├────────────┼────────────────────────────────────────────────────────────────┤
│ available  │ Empty bed, ready for allocation                                │
│ occupied   │ Currently assigned to technician/external personnel            │
│ reserved   │ Reserved for incoming transfer or expected arrival             │
│ maintenance│ Under repair, not available for allocation                     │
└────────────┴────────────────────────────────────────────────────────────────┘

3.4 PROJECT MANAGEMENT
----------------------
- Create/Edit projects
- Assign project managers
- Link technicians to projects
- Track project locations

3.5 HOSPITAL MANAGEMENT
-----------------------
- Register hospital facilities
- Store contact information
- Track specialties
- Emergency numbers

3.6 MEAL PREFERENCE MANAGEMENT
------------------------------
- Define meal categories
- Assign preferences to personnel
- Track dietary restrictions

================================================================================
4. MODULE 2: ONBOARDING
================================================================================

WORKFLOW DIAGRAM:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌───────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Register  │───▶│   Airport   │───▶│   Confirm    │───▶│    Sajja     │  │
│  │ Technician│    │   Pickup    │    │   Arrival    │    │ Pre-Induction│  │
│  └───────────┘    └─────────────┘    └──────────────┘    └──────────────┘  │
│       │                 │                  │                    │          │
│       ▼                 ▼                  ▼                    ▼          │
│  Status:           Status:            Status:              Status:         │
│  pending_arrival   pickup_scheduled   active               induction       │
│                    → picked_up        Bed allocated        _completed      │
│                    → arrived_at_camp  Biometric captured                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

4.1 TECHNICIAN REGISTRATION (OnboardingForm)
--------------------------------------------
PURPOSE: Register new technicians before arrival

FUNCTIONS:
┌────────────────────────────────────────────────────────────────────────────┐
│ Function              │ Input                    │ Output                  │
├───────────────────────┼──────────────────────────┼─────────────────────────┤
│ Manual Registration   │ Employee ID, Name,       │ Technician record with  │
│                       │ Nationality, Gender,     │ pending_arrival status  │
│                       │ Flight details, etc.     │                         │
├───────────────────────┼──────────────────────────┼─────────────────────────┤
│ Bulk CSV Upload       │ CSV file with multiple   │ Multiple technician     │
│                       │ technician records       │ records created         │
├───────────────────────┼──────────────────────────┼─────────────────────────┤
│ Duplicate Check       │ Employee ID              │ Error if ID exists      │
└────────────────────────────────────────────────────────────────────────────┘

VALIDATION RULES:
- Employee ID: Required, unique, alphanumeric
- Full Name: Required, min 2 characters
- Nationality: Required, from predefined list
- Gender: Required, male/female
- Expected Arrival Date: Must be future date
- Flight Number: Optional, format validation (e.g., EK201)

4.2 AIRPORT PICKUP MANAGEMENT
-----------------------------
PURPOSE: Coordinate airport pickups for arriving technicians

FUNCTIONS:
- View arriving technicians list
- Assign driver and vehicle
- Track pickup status
- Record pickup verification

PICKUP STATUS FLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ not_scheduled   │───▶│    scheduled    │───▶│driver_dispatched│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   cancelled     │◀───│ arrived_at_camp │◀───│    picked_up    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

PICKUP CHECKLIST:
□ Name verified at airport
□ Refreshment served
□ Photo captured
□ Luggage collected

4.3 EXPECTED ARRIVALS DASHBOARD
-------------------------------
PURPOSE: Track and confirm technician arrivals

FUNCTIONS:
- List all pending_arrival technicians
- Filter by expected date
- Confirm actual arrival
- Record biometric capture time
- Auto-allocate to Sajja Camp

ARRIVAL CONFIRMATION PROCESS:
1. Select technician from list
2. Enter actual arrival date/time
3. Confirm biometric capture
4. System updates status to 'active'
5. System assigns to Sajja Camp (if induction required)

4.4 SAJJA PRE-INDUCTION TRACKER
-------------------------------
PURPOSE: Track pre-induction checklist completion at Sajja Camp

PRE-INDUCTION CHECKLIST:
┌────────────────────────────────┬──────────────────────────────────────────┐
│ Checklist Item                 │ Business Rule                            │
├────────────────────────────────┼──────────────────────────────────────────┤
│ □ Advance payment given        │ Record date/time when issued             │
│ □ Safety shoes issued          │ Must be issued before site deployment    │
│ □ Helmet issued                │ Must be issued before site deployment    │
│ □ Jacket issued                │ Must be issued before site deployment    │
│ □ PPE issued                   │ Complete PPE kit verification            │
│ □ C3 card issued               │ Access card for company facilities       │
│ □ HSE induction completed      │ Mandatory health & safety training       │
│ □ Training induction completed │ Job-specific training                    │
└────────────────────────────────┴──────────────────────────────────────────┘

COMPLETION LOGIC:
- All items must be checked to mark induction complete
- System records completion date/time
- Technician becomes eligible for project assignment
- Status changes to induction_completed

ALERTS:
- Overdue induction (>48 hours in Sajja)
- Technicians waiting for project assignment

================================================================================
5. MODULE 3: CAMP TRANSFERS
================================================================================

TRANSFER WORKFLOW:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Source Camp                        Target Camp                            │
│   ───────────                        ───────────                            │
│                                                                             │
│   ┌──────────────┐                  ┌──────────────┐                       │
│   │   Initiate   │                  │   Receive    │                       │
│   │   Transfer   │─────────────────▶│   Request    │                       │
│   │   Request    │                  │              │                       │
│   └──────────────┘                  └──────────────┘                       │
│          │                                 │                                │
│          │                                 ▼                                │
│          │                          ┌──────────────┐                       │
│          │                          │   Allocate   │                       │
│          │                          │    Beds      │                       │
│          │                          └──────────────┘                       │
│          │                                 │                                │
│          │                    ┌────────────┴────────────┐                  │
│          │                    ▼                         ▼                  │
│          │            ┌──────────────┐          ┌──────────────┐           │
│          │            │   Approve    │          │   Reject     │           │
│          │            │              │          │   (with      │           │
│          │            │              │          │    reason)   │           │
│          │            └──────────────┘          └──────────────┘           │
│          │                    │                                            │
│          │                    ▼                                            │
│          │            ┌──────────────┐                                     │
│          │            │  Schedule    │                                     │
│          │            │  Dispatch    │                                     │
│          │            │  (Tue/Sun)   │                                     │
│          │            └──────────────┘                                     │
│          │                    │                                            │
│          ▼                    ▼                                            │
│   ┌──────────────┐    ┌──────────────┐                                     │
│   │   Dispatch   │───▶│   Confirm    │                                     │
│   │  Technicians │    │   Arrival    │                                     │
│   └──────────────┘    └──────────────┘                                     │
│                              │                                              │
│                              ▼                                              │
│                       ┌──────────────┐                                     │
│                       │    Camp      │                                     │
│                       │  Induction   │                                     │
│                       └──────────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

5.1 INITIATE TRANSFER
---------------------
PURPOSE: Create transfer request from source camp

FUNCTIONS:
- Select personnel type (technician/external)
- Choose source and target camp
- Select reason for transfer
- Pick personnel from list
- Schedule dispatch date/time
- Collect old meal coupons flag

TRANSFER REASONS:
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ Reason              │ Description                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ onboarding_transfer │ Moving from induction camp to regular camp             │
│ project_transfer    │ Project reassignment requires camp change              │
│ roommate_issue      │ Conflict with current roommates                        │
│ camp_environment    │ Issues with camp facilities or conditions              │
│ urgent_requirement  │ Immediate need at target camp                          │
│ camp_closure        │ Source camp being closed                               │
│ skill_requirement   │ Specific skill needed at target camp                   │
│ personal_request    │ Technician's personal preference                       │
│ disciplinary        │ Disciplinary action requires relocation                │
│ exit_case           │ Moving to exit camp for departure process              │
└─────────────────────┴────────────────────────────────────────────────────────┘

5.2 TRANSFER SCHEDULE POLICIES
------------------------------
PURPOSE: Define allowed days and times for transfers

CONFIGURATION:
- Season name (Summer, Winter)
- Date range (start_date, end_date)
- Allowed days (e.g., Tuesday, Sunday)
- Time slots (e.g., 14:30, 15:00, 15:30, 16:00)

BUSINESS RULES:
- Transfers only allowed on configured days
- Time must be within allowed slots
- Different policies for different seasons

5.3 INCOMING TRANSFER REQUESTS
------------------------------
PURPOSE: Target camp manager reviews and processes requests

FUNCTIONS:
- View pending requests
- Review personnel details
- Allocate beds (manual or smart allocation)
- Approve or reject with reason
- Confirm dispatch readiness

SMART ALLOCATION LOGIC:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Priority │ Criteria                                                         │
├──────────┼──────────────────────────────────────────────────────────────────┤
│    1     │ Match gender (mandatory)                                         │
│    2     │ Match nationality grouping preference                            │
│    3     │ Match state/region preference                                    │
│    4     │ Match ethnicity preference                                       │
│    5     │ Room occupant type (technician_only, external_only, mixed)       │
│    6     │ Available beds in same room (minimize fragmentation)             │
└─────────────────────────────────────────────────────────────────────────────┘

5.4 CONFIRM ARRIVALS
--------------------
PURPOSE: Target camp confirms technician arrivals

FUNCTIONS:
- List dispatched technicians
- Confirm individual arrivals
- Record arrival date/time
- Update bed status to occupied
- Trigger camp induction requirement

5.5 CAMP INDUCTION TRACKER
--------------------------
PURPOSE: Track induction completion at new camp

BUSINESS RULES:
- Induction required within 48 hours of arrival
- Camp boss conducts and records induction
- System tracks overdue inductions

5.6 TRANSFER HISTORY
--------------------
PURPOSE: Complete audit trail of all transfers

DATA CAPTURED:
- Transfer request details
- Personnel involved
- From/To camps and beds
- Approval chain
- Timestamps for each stage

================================================================================
6. MODULE 4: CAMP OPERATIONS
================================================================================

6.1 VISITOR MANAGEMENT
----------------------
PURPOSE: Track visitors to camps

FUNCTIONS:
- Register visitor (name, company, purpose, host)
- Check-in with timestamp
- Check-out with timestamp
- View active visitors
- Historical visitor log

6.2 SMART ALLOCATION
--------------------
PURPOSE: Automated bed assignment based on preferences

ALGORITHM:
1. Filter available beds in target camp
2. Apply gender restriction
3. Apply nationality grouping
4. Apply state/ethnicity preference
5. Prioritize rooms with existing occupants of same profile
6. Minimize bed fragmentation
7. Return optimal allocation

6.3 BULK TRANSFER
-----------------
PURPOSE: Move multiple personnel between camps

FUNCTIONS:
- Select source and target camp
- Multi-select personnel
- Apply smart allocation
- Create single transfer request
- Track bulk progress

6.4 PENDING TRANSFERS
---------------------
PURPOSE: Dashboard of all in-progress transfers

VIEWS:
- Awaiting allocation
- Awaiting dispatch
- In transit
- Awaiting arrival confirmation

6.5 ATTENDANCE TRACKING
-----------------------
PURPOSE: Daily attendance management

FUNCTIONS:
- Mark daily attendance
- Record absent technicians
- Track attendance patterns
- Generate attendance reports

6.6 DAILY ACTIVITY LOG
----------------------
PURPOSE: Track daily activities of technicians

ACTIVITY TYPES:
- Work (at project site)
- Training
- Leave
- Sick
- Camp duty
- Other

6.7 MEAL PREFERENCE CHANGES
---------------------------
PURPOSE: Manage meal preference change requests

WORKFLOW:
1. Technician/Staff requests change
2. Camp boss reviews request
3. Approve/Reject
4. Update meal preference
5. Issue new coupon (if applicable)

================================================================================
7. MODULE 5: ASSET MAINTENANCE
================================================================================

7.1 ASSET DASHBOARD
-------------------
PURPOSE: Central view of all camp assets

ASSET TYPES:
- Furniture (beds, chairs, tables)
- Appliances (AC, refrigerators, washing machines)
- Electronics (TVs, computers)
- Vehicles
- Kitchen equipment
- Safety equipment

ASSET STATUS:
- operational: Working normally
- maintenance: Under repair
- retired: No longer in service

7.2 PREVENTIVE MAINTENANCE SCHEDULER
------------------------------------
PURPOSE: Schedule recurring maintenance

FREQUENCY OPTIONS:
- Daily
- Weekly
- Monthly
- Quarterly
- Yearly
- Custom interval

SCHEDULE LOGIC:
- System auto-generates maintenance tasks based on schedule
- Assigns to maintenance team
- Tracks completion
- Alerts for overdue tasks

7.3 MAINTENANCE REQUESTS
------------------------
PURPOSE: Log and track maintenance issues

REQUEST FLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Submitted     │───▶│   In Progress   │───▶│   Completed     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                      │
        ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│    Cancelled    │    │   On Hold       │
└─────────────────┘    └─────────────────┘

PRIORITY LEVELS:
- Low: Non-urgent, can wait
- Medium: Should be addressed soon
- High: Needs attention within 24 hours
- Critical: Immediate attention required

================================================================================
8. MODULE 6: MEDICAL & HEALTH
================================================================================

8.1 MEDICAL RECORDS MANAGEMENT
------------------------------
PURPOSE: Track medical incidents and treatments

RECORD TYPES:
- Illness
- Injury (work-related, non-work)
- Hospitalization
- Repatriation
- Demise

SEVERITY CLASSIFICATION:
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Severity     │ Description                                                 │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ Minor        │ First aid treatment, no time off                            │
│ Moderate     │ Medical treatment, 1-3 days off                             │
│ Severe       │ Hospitalization required, extended time off                 │
│ Critical     │ Life-threatening, ICU/specialized care needed               │
└──────────────┴─────────────────────────────────────────────────────────────┘

MEDICAL RECORD WORKFLOW:
1. Create incident record
2. Assign hospital/clinic
3. Track treatment progress
4. Manage sick leave
5. Track recovery/return to work
6. File insurance claim (if applicable)

8.2 HEALTH INSURANCE MANAGEMENT
-------------------------------
PURPOSE: Track insurance policies and claims

FUNCTIONS:
- Register insurance policies
- Track coverage details
- Monitor expiry dates
- Submit claims
- Track claim status

CLAIM STATUS:
pending → under_review → approved/rejected → paid

8.3 MEDICAL VISITS
------------------
PURPOSE: Track hospital/clinic visits

DATA CAPTURED:
- Visit date/time
- Hospital/clinic
- Doctor name
- Diagnosis
- Prescription
- Follow-up required

================================================================================
9. MODULE 7: EID & VISA MANAGEMENT
================================================================================

9.1 APPOINTMENT MANAGEMENT
--------------------------
PURPOSE: Schedule and track EID/medical appointments

APPOINTMENT TYPES:
- Medical test (pre-employment)
- EID biometric capture
- EID renewal
- Medical fitness

APPOINTMENT WORKFLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Scheduled     │───▶│   Completed     │───▶│  Document       │
│                 │    │                 │    │  Uploaded       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │
        ▼
┌─────────────────┐
│  Rescheduled/   │
│   Cancelled     │
└─────────────────┘

ELIGIBILITY RULES:
- Medical test: Required before EID application
- EID biometric: After medical test completion
- EID renewal: 30 days before expiry

================================================================================
10. MODULE 8: RECREATION & WELFARE
================================================================================

10.1 EVENT MANAGEMENT
---------------------
PURPOSE: Organize camp recreational activities

EVENT TYPES:
- Sports (cricket, football, volleyball)
- Cultural (festivals, celebrations)
- Training (workshops, seminars)
- Celebration (birthdays, achievements)
- Health camp (medical checkups)
- Other

EVENT WORKFLOW:
1. Create event with details
2. Set capacity limit
3. Open registration
4. Track registrations
5. Conduct event
6. Record attendance
7. Collect feedback

10.2 EVENT REGISTRATION
-----------------------
PURPOSE: Allow technicians to register for events

FUNCTIONS:
- View upcoming events
- Register for event
- Cancel registration
- View registered events
- Receive event reminders

================================================================================
11. MODULE 9: COMPLIANCE & HR
================================================================================

11.1 DOCUMENT MANAGEMENT
------------------------
PURPOSE: Track and manage all personnel and camp documents

TECHNICIAN DOCUMENTS:
┌─────────────────────┬─────────────────────────────────────────────────────────┐
│ Document Type       │ Validation Rules                                        │
├─────────────────────┼─────────────────────────────────────────────────────────┤
│ Passport            │ Expiry alert at 90, 60, 30 days                         │
│ Visa                │ Expiry alert at 90, 60, 30 days                         │
│ Emirates ID         │ Expiry alert at 90, 60, 30 days                         │
│ Labor Card          │ Expiry alert at 90, 60, 30 days                         │
│ Health Certificate  │ Expiry alert at 90, 60, 30 days                         │
└─────────────────────┴─────────────────────────────────────────────────────────┘

CAMP DOCUMENTS:
- License
- Compliance Certificate
- Safety Inspection
- Fire Safety Certificate
- Health Permit
- Ejari Certificate

DOCUMENT STATUS LOGIC:
- Valid: Expiry > 30 days
- Expiring Soon: Expiry 7-30 days (Yellow alert)
- Expired: Past expiry date (Red alert)

11.2 EXPIRY REPORT
------------------
PURPOSE: Dashboard of upcoming document expiries

VIEWS:
- Expiring in 7 days (Critical)
- Expiring in 30 days (Warning)
- Expiring in 60 days (Attention)
- Expiring in 90 days (Monitor)

11.3 LEAVE MANAGEMENT
---------------------
PURPOSE: Track and manage technician leaves

LEAVE TYPES:
- Annual leave
- Sick leave
- Emergency leave
- Unpaid leave

LEAVE WORKFLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Requested     │───▶│   Approved/     │───▶│   On Leave      │
│                 │    │   Rejected      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────┐
                                              │   Returned      │
                                              └─────────────────┘

BED HANDLING DURING LEAVE:
- keep_reserved: Bed remains assigned (default)
- temporary_allocate: Bed can be temporarily assigned to others
- no_action: No bed handling

11.4 DISCIPLINARY ACTIONS
-------------------------
PURPOSE: Record and track disciplinary incidents

ACTION TYPES:
- Verbal Warning
- Written Warning
- Final Warning
- Suspension
- Termination

SEVERITY LEVELS:
- Minor: Documentation only
- Moderate: Written warning
- Major: Suspension/Final warning
- Critical: Termination consideration

11.5 SONAPUR EXIT TRACKER
-------------------------
PURPOSE: Manage exit formalities for departing technicians

EXIT CHECKLIST:
┌────────────────────────────────┬──────────────────────────────────────────┐
│ Checklist Item                 │ Business Rule                            │
├────────────────────────────────┼──────────────────────────────────────────┤
│ □ Toolbox returned             │ All company tools accounted for          │
│ □ ID card returned             │ Access cards collected                   │
│ □ Penalty cleared              │ Any financial dues settled               │
│ □ Ticket booked                │ Flight reservation confirmed             │
│ □ Final settlement processed   │ Salary and benefits processed            │
│ □ Medical cleared              │ Final medical clearance obtained         │
│ □ Exit visa obtained           │ Exit permit from immigration             │
│ □ Handover completed           │ Job responsibilities transferred         │
│ □ Personal belongings cleared  │ All items removed from camp              │
└────────────────────────────────┴──────────────────────────────────────────┘

EXIT WORKFLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  pending_exit   │───▶│  in_process     │───▶│  formalities    │
│  (at Sonapur)   │    │  (checklist)    │    │  _completed     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────┐
                                              │ exited_country  │
                                              │ (departure      │
                                              │  confirmed)     │
                                              └─────────────────┘

================================================================================
12. MODULE 10: CAMP HIRING (TR)
================================================================================

12.1 CAMP RENEWAL PROCESS
-------------------------
PURPOSE: Track contract expiry and manage renewals

EXPIRY TRACKING:
- System monitors contract_end_date for all camps
- Alerts at 90, 60, 30 days before expiry
- Dashboard shows camps by urgency

RENEWAL WORKFLOW:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────┐                                                          │
│  │ Camp Expiring│                                                          │
│  │ (90 days)    │                                                          │
│  └──────────────┘                                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                          │
│  │    Take      │                                                          │
│  │   Decision   │                                                          │
│  └──────────────┘                                                          │
│         │                                                                   │
│    ┌────┴────┐                                                             │
│    ▼         ▼                                                             │
│ ┌──────┐  ┌──────┐                                                         │
│ │RENEW │  │ NOT  │                                                         │
│ │      │  │RENEW │                                                         │
│ └──────┘  └──────┘                                                         │
│    │         │                                                             │
│    ▼         ▼                                                             │
│ ┌──────────┐  ┌──────────────┐                                             │
│ │  Ejari   │  │ Create Camp  │                                             │
│ │ Renewal  │  │ Hiring       │                                             │
│ │ Process  │  │ Request      │                                             │
│ └──────────┘  └──────────────┘                                             │
│    │                                                                        │
│    ▼                                                                        │
│ ┌──────────────────────┐                                                   │
│ │ Upload Documents:    │                                                   │
│ │ • Tenancy Contract   │                                                   │
│ │ • Ejari Certificate  │                                                   │
│ │ • DEWA Bill          │                                                   │
│ │ • Trade License      │                                                   │
│ └──────────────────────┘                                                   │
│    │                                                                        │
│    ▼                                                                        │
│ ┌──────────────┐                                                           │
│ │  Complete    │                                                           │
│ │  Renewal     │                                                           │
│ │ (Update camp │                                                           │
│ │  dates)      │                                                           │
│ └──────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

12.2 CAMP HIRING REQUEST
------------------------
PURPOSE: Request new camp when needed

REQUEST REASONS:
- Manpower Increase: Need more beds for growing workforce
- Expiry: Current camp contract ending
- Relocation: Moving operations to new area
- Expansion: Project expansion requires additional capacity
- Other: Custom reason

APPROVAL WORKFLOW:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────┐                                                       │
│  │ Submit Request  │                                                       │
│  │ (Camp Boss/TR)  │                                                       │
│  └─────────────────┘                                                       │
│          │                                                                  │
│          ▼                                                                  │
│  ┌─────────────────┐ (Only if reason = manpower_increase)                  │
│  │ Manpower Control│───────────────────────────────────────┐               │
│  │ Review          │                                       │               │
│  └─────────────────┘                                       │               │
│          │                                                 │               │
│          ▼                                                 │               │
│  ┌─────────────────┐                                       │               │
│  │Initial Approval │◀──────────────────────────────────────┘               │
│  │ (Manager)       │                                                       │
│  └─────────────────┘                                                       │
│          │                                                                  │
│          ▼                                                                  │
│  ┌─────────────────┐                                                       │
│  │   BE Audit      │ (Building/Engineering inspection)                     │
│  └─────────────────┘                                                       │
│          │                                                                  │
│          ▼                                                                  │
│  ┌─────────────────┐                                                       │
│  │ LFT & HSSE      │ (Parallel audits)                                     │
│  │ Audits          │                                                       │
│  └─────────────────┘                                                       │
│          │                                                                  │
│          ▼                                                                  │
│  ┌─────────────────┐                                                       │
│  │ Procurement     │ (Compare camp options, prices)                        │
│  │ Comparison      │                                                       │
│  └─────────────────┘                                                       │
│          │                                                                  │
│          ▼                                                                  │
│  ┌─────────────────┐                                                       │
│  │ CPO Decision    │ (Final approval)                                      │
│  └─────────────────┘                                                       │
│          │                                                                  │
│     ┌────┴────┐                                                            │
│     ▼         ▼                                                            │
│ ┌───────┐ ┌───────┐                                                        │
│ │APPROVE│ │REJECT │                                                        │
│ └───────┘ └───────┘                                                        │
│     │                                                                       │
│     ▼                                                                       │
│ ┌─────────────────┐                                                        │
│ │ Create Camp     │                                                        │
│ │ (in system)     │                                                        │
│ └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

AUDIT CHECKLISTS:
Each audit team has specific checklist items to verify camp suitability.

================================================================================
13. MODULE 11: REPORTING
================================================================================

13.1 CAPACITY REPORTS
---------------------
REPORT TYPES:
- Location-wise capacity summary
- Camp-wise occupancy details
- Room-level breakdown
- Status-wise bed analysis

KEY METRICS:
- Defined Capacity vs Physical Beds
- Occupied vs Available
- Technician Beds vs External Personnel Beds
- Pending Exit impact on availability
- Occupancy percentage

13.2 DOCUMENT EXPIRY REPORTS
----------------------------
- Technician documents expiring
- Camp documents expiring
- Compliance summary

13.3 TRANSFER REPORTS
---------------------
- Transfer volume by period
- Average processing time
- Rejection rate and reasons
- Camp-wise transfer activity

13.4 MEDICAL REPORTS
--------------------
- Incident summary
- Hospitalization statistics
- Insurance claim summary

================================================================================
14. DATA ENTITIES & RELATIONSHIPS
================================================================================

ENTITY RELATIONSHIP DIAGRAM (ERD) - TEXT REPRESENTATION:

Camp (1) ──────────────────┬────── (M) Floor
                           │
Floor (1) ─────────────────┼────── (M) Room
                           │
Room (1) ──────────────────┼────── (M) Bed
                           │
Bed (1) ───────────────────┼────── (0..1) Technician
                           │
Bed (1) ───────────────────┼────── (0..1) ExternalPersonnel
                           │
Technician (M) ────────────┼────── (1) Project
                           │
Technician (1) ────────────┼────── (M) TechnicianDocument
                           │
Technician (1) ────────────┼────── (M) MedicalRecord
                           │
Technician (1) ────────────┼────── (M) DisciplinaryAction
                           │
Technician (1) ────────────┼────── (M) LeaveRequest
                           │
TransferRequest (M) ───────┼────── (M) Technician
                           │
TransferRequest (M) ───────┼────── (M) ExternalPersonnel
                           │
Camp (1) ──────────────────┼────── (M) CampDocument
                           │
Camp (1) ──────────────────┼────── (M) CampRenewalRequest
                           │
CampHiringRequest (1) ─────┼────── (M) CampAudit
                           │
CampHiringRequest (1) ─────┼────── (1) ProcurementDecision

================================================================================
15. BUSINESS RULES & VALIDATION
================================================================================

CRITICAL BUSINESS RULES:

1. BED ALLOCATION:
   - Gender must match room restriction
   - Occupant type must match room configuration
   - Only one active occupant per bed

2. TRANSFER:
   - Cannot transfer to same camp
   - Must have available beds at target
   - Schedule must follow policy days/times

3. DOCUMENTS:
   - Cannot have two active documents of same type
   - Expiry date must be in future when adding

4. LEAVE:
   - Cannot overlap with existing approved leave
   - End date must be after start date

5. CAMP HIRING:
   - All audits must pass before procurement
   - CPO approval required for final decision

================================================================================
16. GLOSSARY
================================================================================

- BRD: Business Requirements Document
- TR: Temporary Residence
- EID: Emirates ID
- Ejari: Dubai tenancy contract registration system
- DEWA: Dubai Electricity and Water Authority
- HSE/HSSE: Health, Safety, Security & Environment
- BE: Building/Engineering team
- LFT: Logistics/Facilities Team
- CPO: Chief Procurement Officer
- PPE: Personal Protective Equipment
- PM: Preventive Maintenance
- KPI: Key Performance Indicator

================================================================================
                              END OF DOCUMENT
================================================================================
`;

    const blob = new Blob([brdContent], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CampManager_Detailed_BRD_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Documentation</h1>
              <p className="text-gray-600 mt-1">Detailed Business Requirements & Workflows</p>
            </div>
          </div>
          <Button onClick={downloadBRD} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download Full BRD (Detailed)
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workflows">🔄 All Workflows</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="camphiring">Camp Hiring</TabsTrigger>
            <TabsTrigger value="entities">Data Model</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    System Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-700 mb-4">
                    CampManager is a comprehensive Labor Camp Management System for managing 
                    temporary residence camps in the UAE construction/facilities sector.
                  </p>
                  <h4 className="font-semibold mb-3">11 Core Modules:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      "1. Master Data",
                      "2. Onboarding",
                      "3. Transfers",
                      "4. Operations",
                      "5. Asset Maintenance",
                      "6. Medical & Health",
                      "7. EID & Visa",
                      "8. Recreation",
                      "9. Compliance & HR",
                      "10. Camp Hiring",
                      "11. Reporting"
                    ].map((mod, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>{mod}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Key Performance Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-green-800">Bed Occupancy Rate</p>
                        <Badge className="bg-green-600">Target: 85-95%</Badge>
                      </div>
                      <p className="text-xs text-green-600 mt-1">Optimal utilization of camp capacity</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-blue-800">Document Compliance</p>
                        <Badge className="bg-blue-600">Target: 100%</Badge>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">All documents renewed before expiry</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-yellow-800">Transfer Processing</p>
                        <Badge className="bg-yellow-600">Target: &lt;24 hrs</Badge>
                      </div>
                      <p className="text-xs text-yellow-600 mt-1">From request to completion</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-purple-800">Onboarding Time</p>
                        <Badge className="bg-purple-600">Target: &lt;48 hrs</Badge>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">From arrival to project assignment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technician Status Flow */}
            <Card className="border-none shadow-lg mt-6">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle>Technician Status Lifecycle</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <FlowNode type="start" label="Register" />
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <FlowNode type="process" label="pending_arrival" />
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <FlowNode type="process" label="active" />
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <FlowNode type="decision" label="?" className="w-8 h-8" />
                </div>
                <div className="flex flex-wrap justify-center gap-8 mt-4">
                  <div className="text-center">
                    <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />
                    <FlowNode type="process" label="on_leave" className="mt-1" />
                    <p className="text-xs text-gray-500 mt-1">Returns to active</p>
                  </div>
                  <div className="text-center">
                    <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />
                    <FlowNode type="process" label="pending_exit" className="mt-1" />
                    <ArrowDown className="w-4 h-4 text-gray-400 mx-auto mt-1" />
                    <FlowNode type="end" label="exited" className="mt-1" />
                  </div>
                  <div className="text-center">
                    <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />
                    <FlowNode type="process" label="transferred" className="mt-1" />
                  </div>
                  <div className="text-center">
                    <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />
                    <FlowNode type="process" label="suspended" className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Workflows Tab */}
          <TabsContent value="workflows">
            <div className="space-y-6">
              {/* Onboarding Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-green-600" />
                    1. Onboarding Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Onboarding Form" 
                      description="Register new technician details manually or via CSV upload. Sets status to 'pending_arrival'."
                    />
                    <WorkflowStep 
                      number="2" 
                      title="Airport Pickup Plan" 
                      description="Schedule and assign driver/vehicle for airport pickup. Track pickup status through completion."
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Expected Arrivals" 
                      description="Track expected arrivals, confirm actual arrival date/time, capture biometric/fingerprint."
                    />
                    <WorkflowStep 
                      number="4" 
                      title="Sajja Pre-Induction" 
                      description="Complete 8-item checklist (PPE, safety shoes, helmet, jacket, C3 card, HSE training, etc.) at Sajja Camp."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="5" 
                      title="Smart Allocation" 
                      description="Intelligently assign technician to a bed in destination camp based on gender, nationality, and preferences."
                      status="success"
                    />
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> After Smart Allocation, technician moves to destination camp. "Confirm Arrivals" and "Camp Induction" are separate workflows that happen at the destination camp.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Transfer Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                    2. Camp Transfer Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-sm mb-3 text-blue-700">Source Camp Actions</h5>
                      <WorkflowStep 
                        number="1" 
                        title="Initiate Transfer" 
                        description="Select personnel, target camp, reason, and schedule dispatch date/time (Tue/Sun only)."
                      />
                      <WorkflowStep 
                        number="6" 
                        title="Dispatch Technicians" 
                        description="Mark technicians as dispatched on scheduled date. System updates status."
                        status="warning"
                      />
                    </div>
                    <div>
                      <h5 className="font-semibold text-sm mb-3 text-green-700">Target Camp Actions</h5>
                      <WorkflowStep 
                        number="2" 
                        title="Receive Request" 
                        description="Review incoming transfer request with personnel details."
                      />
                      <WorkflowStep 
                        number="3" 
                        title="Allocate Beds" 
                        description="Use Smart Allocation to assign beds, or manually allocate."
                      />
                      <WorkflowStep 
                        number="4" 
                        title="Approve/Reject (Head Office)" 
                        description="Head Office approves allocation or rejects with reason. If approved, request is ready for dispatch."
                      />
                      <WorkflowStep 
                        number="5" 
                        title="Confirm Arrivals" 
                        description="Record actual arrival date/time and capture biometric. Update bed status to 'occupied'."
                        status="success"
                      />
                      <WorkflowStep 
                        number="7" 
                        title="Camp Induction" 
                        description="Complete camp-specific induction within 48 hours of arrival. Upload attendance/test reports."
                        status="success"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exit Process Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-gray-600" />
                    3. Exit Process Workflow (Sonapur)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Move to Sonapur Exit Camp" 
                      description="Technician status changes to 'pending_exit'. Transfer to Sonapur Exit Camp initiated."
                    />
                    <WorkflowStep 
                      number="2" 
                      title="Complete Exit Checklist" 
                      description="Complete 9-item checklist: toolbox returned, ID card, penalty cleared, ticket booked, settlement, medical clearance, exit visa, handover, belongings cleared."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Mark Formalities Complete" 
                      description="When all checklist items done, mark formalities as completed. Status changes to 'formalities_completed'."
                    />
                    <WorkflowStep 
                      number="4" 
                      title="Airport Drop Assignment" 
                      description="Assign vehicle and driver for airport drop. Record scheduled pickup time from camp."
                    />
                    <WorkflowStep 
                      number="5" 
                      title="Country Exit Confirmation" 
                      description="After flight departure, confirm actual country exit date. Status changes to 'exited_country'."
                      status="success"
                    />
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-800">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      <strong>Alert:</strong> System tracks overdue exit formalities (&gt;7 days at Sonapur without completion).
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* EID & Visa Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    4. EID & Visa Appointment Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Schedule Appointment" 
                      description="Schedule medical test or EID biometric appointment. Assign hospital/test center and date."
                    />
                    <WorkflowStep 
                      number="2" 
                      title="Appointment Completion" 
                      description="Mark appointment as completed. Upload medical slip or Tawjeeh document."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Document Upload" 
                      description="Upload required slips (medical test results, biometric confirmation)."
                    />
                    <WorkflowStep 
                      number="4" 
                      title="Follow-up & Tracking" 
                      description="Track appointment status, reschedule if needed, monitor EID expiry dates."
                      status="success"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Medical Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Hospital className="w-5 h-5 text-red-600" />
                    5. Medical Management Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Create Medical Record" 
                      description="Log incident (illness, injury, hospitalization). Select hospital and record severity."
                    />
                    <WorkflowStep 
                      number="2" 
                      title="Hospital Assignment" 
                      description="Assign technician to hospital/clinic for treatment. Track visits and diagnosis."
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Treatment & Follow-up" 
                      description="Record treatment progress, prescriptions, and follow-up appointments."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="4" 
                      title="Sick Leave Management" 
                      description="If needed, create leave request. Track return-to-work date."
                    />
                    <WorkflowStep 
                      number="5" 
                      title="Insurance Claim (Optional)" 
                      description="If applicable, submit insurance claim and track approval/payment status."
                      status="success"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Camp Renewal Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-teal-600" />
                    6. Camp Renewal Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="90-Day Expiry Alert" 
                      description="System tracks contract_end_date and alerts when camp is expiring within 90 days."
                    />
                    <WorkflowStep 
                      number="2" 
                      title="Take Renewal Decision" 
                      description="Decide: RENEW (continue with same camp) or NOT RENEW (find new camp)."
                      status="warning"
                    />
                    <div className="ml-6 grid md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <Badge className="bg-green-600 text-white mb-2">RENEW Path</Badge>
                        <div className="space-y-2 text-xs">
                          <p><strong>Step 3a:</strong> Start Ejari renewal process</p>
                          <p><strong>Step 4a:</strong> Upload documents (Tenancy, Ejari, DEWA, License)</p>
                          <p><strong>Step 5a:</strong> Complete renewal, update camp dates</p>
                        </div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <Badge className="bg-red-600 text-white mb-2">NOT RENEW Path</Badge>
                        <div className="space-y-2 text-xs">
                          <p><strong>Step 3b:</strong> Redirect to Create Camp Hiring Request</p>
                          <p><strong>Step 4b:</strong> Follow New Camp Hiring Workflow (see below)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Camp Hiring Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    7. New Camp Hiring Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Submit Hiring Request" 
                      description="Camp Boss/TR submits request with capacity, reason (manpower increase, expiry, relocation, etc.), and period."
                    />
                    <div className="ml-6 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <p className="text-xs text-yellow-800">
                        <strong>Conditional Branch:</strong> If reason = "manpower_increase" → goes to Manpower Control. Otherwise, skips to Initial Approval.
                      </p>
                    </div>
                    <WorkflowStep 
                      number="2" 
                      title="Manpower Control Review (Conditional)" 
                      description="Verify projected manpower increase justification. Approve or reject."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Initial Approval" 
                      description="Manager reviews request and approves for audits."
                    />
                    <WorkflowStep 
                      number="4" 
                      title="BE Audit" 
                      description="Building/Engineering team audits proposed camp. Checklist-based approval."
                    />
                    <WorkflowStep 
                      number="5" 
                      title="LFT & HSSE Audits (Parallel)" 
                      description="Logistics (LFT) and Safety (HSSE) teams conduct parallel audits with checklists."
                    />
                    <WorkflowStep 
                      number="6" 
                      title="Procurement Comparison" 
                      description="Procurement team compares camp options, prices, and recommends best choice."
                    />
                    <WorkflowStep 
                      number="7" 
                      title="CPO Final Decision" 
                      description="Chief Procurement Officer (CPO) makes final approve/reject decision."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="8" 
                      title="Create Camp in System" 
                      description="If approved, camp is created in system with structure (floors, rooms, beds) and ready for use."
                      status="success"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* EID & Visa Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    7. EID & Visa Appointment Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Check Eligibility" 
                      description="Verify technician is eligible for medical test or EID appointment (based on existing records and expiry)."
                    />
                    <WorkflowStep 
                      number="2" 
                      title="Schedule Appointment" 
                      description="Book appointment for medical test, EID biometric capture, or renewal. Select hospital/facility."
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Track Appointment Status" 
                      description="Monitor scheduled → completed status. Allow rescheduling if needed."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="4" 
                      title="Upload Documents" 
                      description="After completion, upload medical slip, Tawjeeh slip, or EID certificate."
                    />
                    <WorkflowStep 
                      number="5" 
                      title="Update Technician Records" 
                      description="Update technician's EID expiry date or medical fitness status in system."
                      status="success"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Leave Management Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    8. Leave Management Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Submit Leave Request" 
                      description="Technician/Manager submits leave (annual, sick, emergency, unpaid) with dates and reason."
                    />
                    <WorkflowStep 
                      number="2" 
                      title="Approve/Reject" 
                      description="Manager reviews and approves or rejects leave request."
                      status="warning"
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Handle Bed Allocation" 
                      description="Choose: keep_reserved (hold bed), temporary_allocate (allow temp occupant), or no_action."
                    />
                    <WorkflowStep 
                      number="4" 
                      title="Technician On Leave" 
                      description="Technician status changes to 'on_leave'. Bed status updated accordingly."
                    />
                    <WorkflowStep 
                      number="5" 
                      title="Return from Leave" 
                      description="Upon return, status changes back to 'active'. Bed reassigned if needed."
                      status="success"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Onboarding Tab */}
          <TabsContent value="onboarding">
            <div className="space-y-6">
              {/* Onboarding Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-green-600" />
                    Onboarding Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                        <UserPlus className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-xs font-medium">1. Register</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                        <Car className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-xs font-medium">2. Airport Pickup</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                        <Fingerprint className="w-8 h-8 text-purple-600" />
                      </div>
                      <p className="text-xs font-medium">3. Confirm Arrival</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                        <ClipboardList className="w-8 h-8 text-orange-600" />
                      </div>
                      <p className="text-xs font-medium">4. Pre-Induction</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-8 h-8 text-teal-600" />
                      </div>
                      <p className="text-xs font-medium">5. Project Assignment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Functions */}
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="registration" className="border rounded-lg bg-white shadow">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700">Step 1</Badge>
                      Technician Registration
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold text-sm mb-2">Functions:</h5>
                        <ul className="text-sm space-y-1 text-gray-600">
                          <li>• <strong>Manual Entry:</strong> Single technician registration form</li>
                          <li>• <strong>Bulk CSV Upload:</strong> Import multiple records</li>
                          <li>• <strong>Duplicate Check:</strong> Validates Employee ID uniqueness</li>
                          <li>• <strong>Auto-assign:</strong> Sets status to pending_arrival</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-sm mb-2">Required Fields:</h5>
                        <div className="flex flex-wrap gap-1">
                          {["Employee ID", "Full Name", "Nationality", "Gender", "Expected Arrival Date"].map(f => (
                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                        <h5 className="font-semibold text-sm mb-2 mt-3">Validation Rules:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Employee ID must be unique</li>
                          <li>• Expected arrival must be future date</li>
                          <li>• Flight number format: 2 letters + 3-4 digits</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pickup" className="border rounded-lg bg-white shadow">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700">Step 2</Badge>
                      Airport Pickup Management
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <h5 className="font-semibold text-sm mb-2">Pickup Status Flow:</h5>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="outline">not_scheduled</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-yellow-100 text-yellow-700">scheduled</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-blue-100 text-blue-700">driver_dispatched</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-purple-100 text-purple-700">picked_up</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-green-100 text-green-700">arrived_at_camp</Badge>
                    </div>
                    <h5 className="font-semibold text-sm mb-2">Pickup Checklist:</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Square className="w-4 h-4 text-gray-400" />
                        <span>Name verified at airport</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Square className="w-4 h-4 text-gray-400" />
                        <span>Refreshment served</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Square className="w-4 h-4 text-gray-400" />
                        <span>Photo captured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Square className="w-4 h-4 text-gray-400" />
                        <span>Luggage collected</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="preinduction" className="border rounded-lg bg-white shadow">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-700">Step 4</Badge>
                      Sajja Pre-Induction Checklist
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold text-sm mb-2">Checklist Items:</h5>
                        <div className="space-y-2">
                          {[
                            { item: "Advance payment given", rule: "Record date when issued" },
                            { item: "Safety shoes issued", rule: "Required before site deployment" },
                            { item: "Helmet issued", rule: "Required before site deployment" },
                            { item: "Jacket issued", rule: "Required before site deployment" },
                            { item: "PPE issued", rule: "Complete kit verification" },
                            { item: "C3 card issued", rule: "Company access card" },
                            { item: "HSE induction completed", rule: "Mandatory safety training" },
                            { item: "Training induction completed", rule: "Job-specific training" },
                          ].map((c, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Square className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{c.item}</span>
                                <p className="text-xs text-gray-500">{c.rule}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-semibold text-sm mb-2">Business Rules:</h5>
                        <ul className="text-sm text-gray-600 space-y-2">
                          <li>• All 8 items must be completed</li>
                          <li>• Target completion: within 48 hours</li>
                          <li>• System tracks overdue inductions</li>
                          <li>• Completion unlocks project assignment</li>
                        </ul>
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-xs text-yellow-800">
                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                            Alert: Technicians in Sajja &gt;48 hours without completion flagged as overdue
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers">
            <div className="space-y-6">
              {/* Transfer Workflow Visual */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                    Transfer Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Source Camp */}
                    <div className="border-r pr-8">
                      <h4 className="font-semibold text-center mb-4 text-blue-700">Source Camp</h4>
                      <WorkflowStep 
                        number="1" 
                        title="Initiate Transfer" 
                        description="Select personnel, target camp, reason, schedule"
                      />
                      <WorkflowStep 
                        number="5" 
                        title="Dispatch Technicians" 
                        description="Confirm dispatch on scheduled day/time"
                        status="warning"
                      />
                    </div>
                    {/* Target Camp */}
                    <div className="pl-8">
                      <h4 className="font-semibold text-center mb-4 text-green-700">Target Camp</h4>
                      <WorkflowStep 
                        number="2" 
                        title="Receive Request" 
                        description="Review personnel details and requirements"
                      />
                      <WorkflowStep 
                        number="3" 
                        title="Allocate Beds" 
                        description="Manual or Smart Allocation based on preferences"
                      />
                      <WorkflowStep 
                        number="4" 
                        title="Approve/Reject" 
                        description="Confirm bed allocation or reject with reason"
                      />
                      <WorkflowStep 
                        number="6" 
                        title="Confirm Arrivals" 
                        description="Record actual arrival, update bed status"
                        status="success"
                      />
                      <WorkflowStep 
                        number="7" 
                        title="Camp Induction" 
                        description="Complete induction within 48 hours"
                        status="success"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transfer Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Transfer Reasons</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {[
                        { reason: "onboarding_transfer", desc: "From induction to regular camp" },
                        { reason: "project_transfer", desc: "Project reassignment" },
                        { reason: "roommate_issue", desc: "Conflict with roommates" },
                        { reason: "camp_environment", desc: "Facility/condition issues" },
                        { reason: "urgent_requirement", desc: "Immediate need at target" },
                        { reason: "camp_closure", desc: "Source camp closing" },
                        { reason: "skill_requirement", desc: "Specific skill needed" },
                        { reason: "personal_request", desc: "Technician preference" },
                        { reason: "disciplinary", desc: "Disciplinary relocation" },
                        { reason: "exit_case", desc: "Moving to exit camp" },
                      ].map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <Badge variant="outline" className="text-xs">{r.reason}</Badge>
                          <span className="text-xs text-gray-600">{r.desc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Smart Allocation Logic</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-3">Priority-based bed assignment:</p>
                    <div className="space-y-2">
                      {[
                        { priority: 1, criteria: "Gender Match", rule: "Mandatory - must match room restriction" },
                        { priority: 2, criteria: "Nationality Group", rule: "Prefer same nationality rooms" },
                        { priority: 3, criteria: "State/Region", rule: "Group by home state" },
                        { priority: 4, criteria: "Ethnicity", rule: "Cultural grouping preference" },
                        { priority: 5, criteria: "Room Type", rule: "Match technician/external restriction" },
                        { priority: 6, criteria: "Minimize Fragmentation", rule: "Fill partially occupied rooms first" },
                      ].map((p) => (
                        <div key={p.priority} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                          <Badge className="bg-blue-600">{p.priority}</Badge>
                          <div>
                            <p className="text-sm font-medium">{p.criteria}</p>
                            <p className="text-xs text-gray-600">{p.rule}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    </CardContent>
                    </Card>
                    </div>

              {/* Schedule Policy */}
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">Transfer Schedule Policy</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h5 className="font-semibold text-sm mb-2">Summer Schedule</h5>
                      <p className="text-xs text-gray-600">May - September</p>
                      <p className="text-xs mt-2"><strong>Days:</strong> Tuesday, Sunday</p>
                      <p className="text-xs"><strong>Time:</strong> 14:30 - 18:30</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-sm mb-2">Winter Schedule</h5>
                      <p className="text-xs text-gray-600">October - April</p>
                      <p className="text-xs mt-2"><strong>Days:</strong> Tuesday, Sunday</p>
                      <p className="text-xs"><strong>Time:</strong> 14:30 - 18:30</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h5 className="font-semibold text-sm mb-2">Business Rules</h5>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Transfers only on allowed days</li>
                        <li>• Must select valid time slot</li>
                        <li>• Emergency transfers need approval</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle>Daily Operations Functions</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Accordion type="single" collapsible className="space-y-2">
                    <AccordionItem value="visitors">
                      <AccordionTrigger className="text-sm">Visitor Management</AccordionTrigger>
                      <AccordionContent>
                        <ul className="text-xs space-y-1 text-gray-600">
                          <li>• Register visitor details (name, company, purpose)</li>
                          <li>• Assign camp host</li>
                          <li>• Record check-in/check-out times</li>
                          <li>• View active visitors dashboard</li>
                          <li>• Historical visitor log with search</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="attendance">
                      <AccordionTrigger className="text-sm">Attendance Tracking</AccordionTrigger>
                      <AccordionContent>
                        <ul className="text-xs space-y-1 text-gray-600">
                          <li>• Daily attendance marking</li>
                          <li>• Absent technician list</li>
                          <li>• Integration with leave system</li>
                          <li>• Attendance reports by date range</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="activity">
                      <AccordionTrigger className="text-sm">Daily Activity Log</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs text-gray-600 mb-2">Activity Types:</p>
                        <div className="flex flex-wrap gap-1">
                          {["Work", "Training", "Leave", "Sick", "Camp Duty", "Other"].map(t => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="meals">
                      <AccordionTrigger className="text-sm">Meal Preference Changes</AccordionTrigger>
                      <AccordionContent>
                        <ul className="text-xs space-y-1 text-gray-600">
                          <li>• Submit change request</li>
                          <li>• Camp boss approval workflow</li>
                          <li>• Update preference on approval</li>
                          <li>• Track coupon issuance</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                  <CardTitle>Asset Maintenance</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Accordion type="single" collapsible className="space-y-2">
                    <AccordionItem value="assets">
                      <AccordionTrigger className="text-sm">Asset Registry</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs text-gray-600 mb-2">Asset Types:</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {["Furniture", "Appliances", "Electronics", "Vehicles", "Kitchen", "Safety"].map(t => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600">Status: operational → maintenance → retired</p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="pm">
                      <AccordionTrigger className="text-sm">PM Scheduler</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs text-gray-600 mb-2">Frequency Options:</p>
                        <div className="flex flex-wrap gap-1">
                          {["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "Custom"].map(t => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="requests">
                      <AccordionTrigger className="text-sm">Maintenance Requests</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs text-gray-600 mb-2">Status Flow:</p>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline">Submitted</Badge>
                          <ArrowRight className="w-3 h-3" />
                          <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
                          <ArrowRight className="w-3 h-3" />
                          <Badge className="bg-green-100 text-green-700">Completed</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Priority: Low → Medium → High → Critical</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical">
            <div className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Hospital className="w-5 h-5 text-red-600" />
                    Medical Management Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                    <FlowNode type="start" label="Incident" />
                    <ArrowRight className="w-4 h-4" />
                    <FlowNode type="process" label="Create Record" />
                    <ArrowRight className="w-4 h-4" />
                    <FlowNode type="process" label="Hospital Assignment" />
                    <ArrowRight className="w-4 h-4" />
                    <FlowNode type="process" label="Treatment" />
                    <ArrowRight className="w-4 h-4" />
                    <FlowNode type="decision" label="?" className="w-8 h-8" />
                  </div>
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <ArrowDown className="w-4 h-4 mx-auto" />
                      <FlowNode type="process" label="Sick Leave" className="mt-1" />
                      <ArrowDown className="w-4 h-4 mx-auto mt-1" />
                      <FlowNode type="end" label="Return to Work" className="mt-1" />
                    </div>
                    <div className="text-center">
                      <ArrowDown className="w-4 h-4 mx-auto" />
                      <FlowNode type="process" label="Insurance Claim" className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-none shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Severity Levels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="p-2 bg-green-50 rounded text-xs">
                        <strong>Minor:</strong> First aid, no time off
                      </div>
                      <div className="p-2 bg-yellow-50 rounded text-xs">
                        <strong>Moderate:</strong> Treatment, 1-3 days off
                      </div>
                      <div className="p-2 bg-orange-50 rounded text-xs">
                        <strong>Severe:</strong> Hospitalization needed
                      </div>
                      <div className="p-2 bg-red-50 rounded text-xs">
                        <strong>Critical:</strong> Life-threatening, ICU
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Record Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {["Illness", "Work Injury", "Non-work Injury", "Hospitalization", "Repatriation", "Demise"].map(t => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Insurance Claim Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <Badge variant="outline">Pending</Badge>
                      <ArrowRight className="w-3 h-3" />
                      <Badge className="bg-blue-100 text-blue-700">Review</Badge>
                      <ArrowRight className="w-3 h-3" />
                      <Badge className="bg-green-100 text-green-700">Approved</Badge>
                      <ArrowRight className="w-3 h-3" />
                      <Badge className="bg-green-600 text-white">Paid</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <div className="space-y-6">
              {/* Document Management */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-yellow-600" />
                    Document Expiry Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-sm mb-3">Technician Documents</h5>
                      <div className="space-y-2">
                        {["Passport", "Visa", "Emirates ID", "Labor Card", "Health Certificate"].map(doc => (
                          <div key={doc} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{doc}</span>
                            <div className="flex gap-1">
                              <Badge className="bg-red-100 text-red-700 text-xs">90d</Badge>
                              <Badge className="bg-yellow-100 text-yellow-700 text-xs">60d</Badge>
                              <Badge className="bg-green-100 text-green-700 text-xs">30d</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-sm mb-3">Document Status Logic</h5>
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 rounded border border-green-200">
                          <Badge className="bg-green-600 text-white mb-1">Valid</Badge>
                          <p className="text-xs text-green-800">Expiry &gt; 30 days from today</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                          <Badge className="bg-yellow-600 text-white mb-1">Expiring Soon</Badge>
                          <p className="text-xs text-yellow-800">Expiry 7-30 days from today</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded border border-red-200">
                          <Badge className="bg-red-600 text-white mb-1">Expired</Badge>
                          <p className="text-xs text-red-800">Past expiry date</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exit Process */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-gray-600" />
                    Sonapur Exit Process
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-sm mb-3">Exit Checklist (9 Items)</h5>
                      <div className="space-y-2">
                        {[
                          "Toolbox returned",
                          "ID card returned",
                          "Penalty cleared",
                          "Ticket booked",
                          "Final settlement processed",
                          "Medical cleared",
                          "Exit visa obtained",
                          "Handover completed",
                          "Personal belongings cleared"
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Square className="w-4 h-4 text-gray-400" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-sm mb-3">Exit Status Flow</h5>
                      <div className="space-y-3">
                        <WorkflowStep number="1" title="pending_exit" description="Technician moved to Sonapur Exit Camp" />
                        <WorkflowStep number="2" title="in_process" description="Exit checklist being completed" status="warning" />
                        <WorkflowStep number="3" title="formalities_completed" description="All checklist items done" status="success" />
                        <WorkflowStep number="4" title="exited_country" description="Departure confirmed" status="success" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Camp Hiring Tab */}
          <TabsContent value="camphiring">
            <div className="space-y-6">
              {/* Renewal Process */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-teal-600" />
                    Camp Renewal Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-8 h-8 text-orange-600" />
                      </div>
                      <p className="text-xs font-medium">90 Days Alert</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                        <Diamond className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-xs font-medium">Decision</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-12">
                    <div className="text-center">
                      <ArrowDown className="w-4 h-4 mx-auto text-green-500" />
                      <Badge className="bg-green-100 text-green-700 mt-2">RENEW</Badge>
                      <div className="mt-3 text-left">
                        <WorkflowStep number="1" title="Ejari Process" description="Upload tenancy contract" />
                        <WorkflowStep number="2" title="Documents" description="Ejari cert, DEWA, License" />
                        <WorkflowStep number="3" title="Complete" description="Update camp dates" status="success" />
                      </div>
                    </div>
                    <div className="text-center">
                      <ArrowDown className="w-4 h-4 mx-auto text-red-500" />
                      <Badge className="bg-red-100 text-red-700 mt-2">NOT RENEW</Badge>
                      <div className="mt-3 text-left">
                        <WorkflowStep number="1" title="Create Hiring Request" description="New camp requirement" />
                        <p className="text-xs text-gray-500 ml-7 mt-2">→ Goes to hiring workflow</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hiring Request Workflow */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                  <CardTitle>New Camp Hiring Approval Workflow</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <WorkflowStep 
                      number="1" 
                      title="Submit Request" 
                      description="Camp Boss/TR Operations submits with capacity, reason, period"
                    />
                    <div className="ml-6 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <p className="text-xs text-yellow-800">
                        <strong>Conditional:</strong> If reason = "manpower_increase" → goes to Manpower Control first
                      </p>
                    </div>
                    <WorkflowStep 
                      number="2" 
                      title="Manpower Control Review" 
                      description="Verify projected manpower increase justification (conditional step)"
                      status="warning"
                    />
                    <WorkflowStep 
                      number="3" 
                      title="Initial Approval" 
                      description="Manager reviews and approves for audit"
                    />
                    <WorkflowStep 
                      number="4" 
                      title="BE Audit" 
                      description="Building/Engineering team inspects proposed camp"
                    />
                    <WorkflowStep 
                      number="5" 
                      title="LFT & HSSE Audits" 
                      description="Logistics and Safety teams conduct parallel audits"
                    />
                    <WorkflowStep 
                      number="6" 
                      title="Procurement Comparison" 
                      description="Compare camp options, prices, recommend best option"
                    />
                    <WorkflowStep 
                      number="7" 
                      title="CPO Decision" 
                      description="Chief Procurement Officer final approval"
                      status="success"
                    />
                    <WorkflowStep 
                      number="8" 
                      title="Create Camp" 
                      description="Camp created in system, ready for use"
                      status="success"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Model Tab */}
          <TabsContent value="entities">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle>Data Entities & Relationships</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h5 className="font-semibold text-sm mb-3 text-blue-700">Master Entities</h5>
                    <div className="space-y-1">
                      {["Technician", "ExternalPersonnel", "Camp", "Floor", "Room", "Bed", "Project", "Hospital", "MealPreference"].map(e => (
                        <Badge key={e} variant="outline" className="mr-1 mb-1">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm mb-3 text-green-700">Transaction Entities</h5>
                    <div className="space-y-1">
                      {["TransferRequest", "TechnicianTransferLog", "LeaveRequest", "DisciplinaryAction", "MedicalRecord", "MedicalVisit", "InsuranceClaim", "Appointment", "Event", "EventRegistration", "MaintenanceRequest", "DailyStatus", "Attendance", "Visitor"].map(e => (
                        <Badge key={e} variant="outline" className="mr-1 mb-1">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm mb-3 text-purple-700">Camp Hiring Entities</h5>
                    <div className="space-y-1">
                      {["CampHiringRequest", "CampAudit", "ProcurementDecision", "CampRenewalRequest", "TechnicianDocument", "CampDocument"].map(e => (
                        <Badge key={e} variant="outline" className="mr-1 mb-1">{e}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold text-sm mb-3">Key Relationships</h5>
                  <div className="text-xs font-mono space-y-1 text-gray-700">
                    <p>Camp (1) ──── (M) Floor ──── (M) Room ──── (M) Bed</p>
                    <p>Bed (1) ──── (0..1) Technician | ExternalPersonnel</p>
                    <p>Technician (1) ──── (M) Documents, Medical, Disciplinary, Leave</p>
                    <p>TransferRequest (M) ──── (M) Technician | ExternalPersonnel</p>
                    <p>CampHiringRequest (1) ──── (M) CampAudit ──── (1) ProcurementDecision</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}