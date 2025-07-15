import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, AlertTriangle, Check } from 'lucide-react';
import { ThickCheckIcon } from '@/components/ui/thick-check-icon';

interface PublicRecordRowProps {
  record: any;
  recordIndex?: number;
  onDispute: (recordId: string, dispute: any) => void;
  onDisputeSaved?: (recordId: string) => void;
  onDisputeReset?: (recordId: string) => void;
  onHeaderReset?: () => void;
  expandAll?: boolean;
  aiScanCompleted?: boolean;
  aiViolations?: string[];
  aiSuggestions?: string[];
  savedDisputes?: { [key: string]: any };
}

export function PublicRecordRow({
  record,
  recordIndex = 0,
  onDispute,
  onDisputeSaved,
  onDisputeReset,
  onHeaderReset,
  expandAll,
  aiScanCompleted,
  aiViolations = [],
  aiSuggestions = [],
  savedDisputes = {}
}: PublicRecordRowProps) {
  // Generate consistent record ID matching the section - MUST be first
  const recordId = record['@CreditLiabilityID'] || record['@_SubscriberCode'] || `record_${record.index || recordIndex}`;
  
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedInstruction, setSelectedInstruction] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [showCustomReasonField, setShowCustomReasonField] = useState(false);
  const [showCustomInstructionField, setShowCustomInstructionField] = useState(false);
  // Initialize saved state from parent
  const [isDisputeSaved, setIsDisputeSaved] = useState(!!savedDisputes[recordId]);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [transUnionStatus, setTransUnionStatus] = useState('');
  const [equifaxStatus, setEquifaxStatus] = useState('');
  const [experianStatus, setExperianStatus] = useState('');

  // Sync with expandAll prop
  useEffect(() => {
    if (expandAll !== undefined) {
      setIsCollapsed(!expandAll);
      setShowAccountDetails(expandAll);
    }
  }, [expandAll]);

  // Sync saved state with parent
  useEffect(() => {
    const isSaved = !!savedDisputes[recordId];
    setIsDisputeSaved(isSaved);
    // If saved, keep it collapsed
    if (isSaved) {
      setIsCollapsed(true);
    }
  }, [savedDisputes, recordId]);

  // Get formatted data for display
  const getFormattedRecordData = () => {
    const recordType = record['@publicRecordType'] || record.publicRecordType || 'Public Record';
    const courthouse = record['@courtName'] || record.courtName || 'U.S. Bankruptcy Court for the Northern District of Illinois';
    const filingDate = record['@filingDate'] || record.filingDate || '2019-03-15';
    const amount = record['@amount'] || record.amount || 'N/A';
    const status = record['@status'] || record.status || 'Discharged';
    const referenceNumber = record['@referenceNumber'] || record.referenceNumber || 'N/A';

    return {
      recordType: recordType.charAt(0).toUpperCase() + recordType.slice(1),
      courthouse,
      filingDate,
      amount: amount !== 'N/A' ? `$${amount}` : 'N/A',
      status: status.charAt(0).toUpperCase() + status.slice(1),
      referenceNumber
    };
  };

  const recordData = getFormattedRecordData();

  // Status options for the dropdowns
  const statusOptions = [
    'Positive',
    'Negative',
    'Repaired',
    'Deleted',
    'In Dispute',
    'Verified',
    'Updated',
    'Unspecified',
    'Ignore',
  ];

  // Format date to MM/DD/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US');
    } catch {
      return dateString;
    }
  };

  // Format currency with commas
  const formatCurrency = (amount: string | number) => {
    if (!amount || amount === '0') return '$0';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '$0';
    return '$' + numAmount.toLocaleString('en-US');
  };

  // Add line break for very long court names only
  const formatCourtName = (courtName: string) => {
    if (!courtName || courtName.length <= 50) return courtName;
    
    // Break after "the" for better readability
    if (courtName.includes(' for the ') && courtName.length > 55) {
      const parts = courtName.split(' for the ');
      if (parts.length === 2 && parts[0].length > 20 && parts[1].length > 15) {
        return parts[0] + ' for the\n' + parts[1];
      }
    }
    
    return courtName;
  };

  // Get first field data helper function
  const getFirstFieldData = () => {
    const courtName = record['@courtName'] || record.courtName || 'U.S. Bankruptcy Court for the Northern District of Illinois';
    return {
      label: record['@publicRecordType']?.toLowerCase().includes('bankruptcy') ? 'Court' : 'Court Name',
      value: courtName
    };
  };

  // Check if record has negative keywords
  const hasNegativeKeywords = () => {
    const recordType = (record['@publicRecordType'] || record.publicRecordType || '').toLowerCase();
    const negativeKeywords = ['bankruptcy', 'lien', 'judgment', 'foreclosure', 'garnishment', 'civil'];
    return negativeKeywords.some(keyword => recordType.includes(keyword));
  };

  const hasAnyNegative = hasNegativeKeywords();

  // Compute button disabled state
  const hasReason = showCustomReasonField ? customReason.trim() : selectedReason;
  const hasInstruction = showCustomInstructionField ? customInstruction.trim() : selectedInstruction;
  const isButtonDisabled = !hasReason || !hasInstruction;

  // Handle save dispute function
  const handleSaveDispute = async () => {
    console.log("Save button clicked — triggering choreography regardless of isDisputeSaved");
    
    // If already saved, trigger re-save choreography by resetting state
    if (isDisputeSaved) {
      console.log('GREEN SAVE BUTTON CLICKED - Triggering re-save choreography');
      
      // Reset dispute saved state and re-trigger
      setIsDisputeSaved(false);
      setTimeout(() => {
        setIsDisputeSaved(true);
      }, 50);
      return;
    }
    
    if (isButtonDisabled) {
      // Show red glow on incomplete fields
      const elements = document.querySelectorAll('.border-gray-300, .border-green-500, .border-red-500');
      elements.forEach(el => {
        if (el.closest('.space-y-2')) {
          el.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
          }, 2000);
        }
      });
      return;
    }

    // Get final values
    const finalReason = showCustomReasonField ? customReason.trim() : selectedReason;
    const finalInstruction = showCustomInstructionField ? customInstruction.trim() : selectedInstruction;

    // Validate final values
    if (!finalReason || !finalInstruction) {
      return;
    }

    // Set dispute as saved first to show green feedback
    setIsDisputeSaved(true);

    // Create dispute data
    const disputeData = {
      recordId: recordId,
      reason: finalReason,
      instruction: finalInstruction,
      timestamp: new Date().toISOString()
    };

    // Call the dispute handler
    onDispute(recordId, disputeData);

    // Show green feedback for 1 second
    setTimeout(() => {
      // Call saved handler if provided
      onDisputeSaved?.(recordId);
      
      // Removed scroll behavior to prevent continuous auto-scroll loops
      
      // Collapse after scroll
      setTimeout(() => {
        setIsCollapsed(true);
      }, 300);
    }, 1000);
  };

  const disputeReasons = [
    'I have never been associated with this record',
    'This record has incorrect information',
    'This record is too old to report',
    'This record has been resolved or satisfied',
    'I was not properly notified of this action',
    'This violates my consumer rights',
    'Identity theft - this is not my record'
  ];

  const disputeInstructions = [
    'Remove this record from my credit report immediately',
    'Update this record with correct information',
    'Verify the accuracy of this record',
    'Please investigate this record thoroughly',
    'Correct the reporting of this record',
    'Delete this inaccurate record',
    'Update this record to reflect proper status'
  ];

  // Show collapsed saved state when saved and collapsed
  if (isDisputeSaved && isCollapsed) {
    return (
      <Card 
        className="border-[2px] border-green-500 bg-green-50 transition-all duration-300 hover:shadow-lg rounded-lg overflow-hidden cursor-pointer"
        data-record-id={recordId}
        onClick={() => setIsCollapsed(false)}
      >
        <CardHeader className="cursor-pointer flex flex-row items-center justify-between p-6 bg-green-50 hover:bg-green-100 transition-colors duration-200 hover:shadow-lg rounded-t-lg min-h-[72px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center">
              <ThickCheckIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {recordData.recordType}
              </h3>
              <p className="text-sm text-green-600 font-normal">Dispute Saved</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">Record</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card 
      className={`transition-all duration-300 ${
        isCollapsed ? 'border border-gray-200' : 'border-2 border-gray-300'
      } hover:shadow-lg rounded-lg overflow-hidden`}
      data-record-id={recordId}
    >
      <CardContent className={hasAnyNegative ? "p-0" : "p-6"}>
        {hasAnyNegative && (
          <div className={`border-2 rounded-lg p-6 space-y-6 ${
            isDisputeSaved 
              ? 'border-green-500 bg-green-50' 
              : 'border-red-500 bg-rose-50'
          }`}>
            
            {/* Step 1 - Match Negative Accounts exactly */}
            <div className="flex items-center gap-3">
              {isDisputeSaved ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  <ThickCheckIcon className="w-4 h-4" />
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  1
                </span>
              )}
              <span className={`font-bold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>
                {isDisputeSaved ? 'Review this negative item, then scroll down to steps 2 and 3' : 'Review this negative item, then scroll down to steps\u00A02\u00A0and\u00A03'}
              </span>
            </div>

        {/* Bureau Comparison Grid - EXACT MATCH to negative accounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TransUnion */}
          <div className="relative">
            <div className={`font-bold mb-1 ${isDisputeSaved ? 'text-green-700' : 'text-cyan-700'}`}>TransUnion</div>
            <div
              className={`border-3 rounded-lg p-4 ${
                isDisputeSaved
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-semibold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>{(record['@publicRecordType'] || record.publicRecordType || 'Public Record').toUpperCase()}</h4>
                <Select
                  value={transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')}
                  onValueChange={setTransUnionStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative'
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {(transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Positive' && (
                        <CheckIcon className="w-3 h-3 text-green-600" />
                      )}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-xs">
                {/* Exactly 5 lines - match negative accounts height */}
                <div className="flex justify-between">
                  <span className="text-gray-700">{getFirstFieldData().label}</span>
                  <span className="font-medium text-right whitespace-pre-line max-w-[200px]">
                    {formatCourtName(getFirstFieldData().value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Status:</span>
                  <span className={`font-medium ${record['@_StatusDescription']?.toLowerCase().includes('discharged') || record['@_StatusDescription']?.toLowerCase().includes('satisfied') || record['@_StatusDescription']?.toLowerCase().includes('released') ? 'text-green-600' : 'text-red-600'}`}>
                    {record['@_StatusDescription'] || record['@status'] || record.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Amount:</span>
                  <span className="font-medium">{formatCurrency(record['@_LiabilityAmount'] || record['@amount'] || record.amount || '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Updated:</span>
                  <span className="font-medium">{formatDate(record['@_StatusDate'] || record['@dateUpdated'] || record.dateUpdated || '2024-01-01')}</span>
                </div>

                {/* Additional details - only when expanded */}
                {showAccountDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Date Filed:</span>
                      <span className="font-medium">{formatDate(record['@_FilingDate'] || record.dateFiled || record['@_Date'])}</span>
                    </div>
                    {record['@caseNumber'] || record.caseNumber ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Case Number:</span>
                        <span className="font-medium">{record['@caseNumber'] || record.caseNumber}</span>
                      </div>
                    ) : null}
                    {record['@courtAddress'] || record.courtAddress ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Address:</span>
                        <span className="font-medium">{record['@courtAddress'] || record.courtAddress}</span>
                      </div>
                    ) : null}
                    {record['@courtPhone'] || record.courtPhone ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Phone:</span>
                        <span className="font-medium">{record['@courtPhone'] || record.courtPhone}</span>
                      </div>
                    ) : null}
                    {record['@plaintiff'] || record.plaintiff ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Plaintiff:</span>
                        <span className="font-medium">{record['@plaintiff'] || record.plaintiff}</span>
                      </div>
                    ) : null}
                    {record['@attorneyName'] || record.attorneyName ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Attorney:</span>
                        <span className="font-medium">{record['@attorneyName'] || record.attorneyName}</span>
                      </div>
                    ) : null}
                    {record['@trustee'] || record.trustee ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Trustee:</span>
                        <span className="font-medium">{record['@trustee'] || record.trustee}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Equifax - EXACT copy of TransUnion structure */}
          <div className="relative">
            <div className={`font-bold mb-1 ${isDisputeSaved ? 'text-green-700' : 'text-red-600'}`}>Equifax</div>
            <div
              className={`border-3 rounded-lg p-4 ${
                isDisputeSaved
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-semibold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>{(record['@publicRecordType'] || record.publicRecordType || 'Public Record').toUpperCase()}</h4>
                <Select
                  value={equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')}
                  onValueChange={setEquifaxStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative'
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {(equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Positive' && (
                        <CheckIcon className="w-3 h-3 text-green-600" />
                      )}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-xs">
                {/* Exactly 5 lines - match negative accounts height */}
                <div className="flex justify-between">
                  <span className="text-gray-700">{getFirstFieldData().label}</span>
                  <span className="font-medium text-right whitespace-pre-line max-w-[200px]">
                    {formatCourtName(getFirstFieldData().value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Status:</span>
                  <span className={`font-medium ${record['@_StatusDescription']?.toLowerCase().includes('discharged') || record['@_StatusDescription']?.toLowerCase().includes('satisfied') || record['@_StatusDescription']?.toLowerCase().includes('released') ? 'text-green-600' : 'text-red-600'}`}>
                    {record['@_StatusDescription'] || record['@status'] || record.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Amount:</span>
                  <span className="font-medium">{formatCurrency(record['@_LiabilityAmount'] || record['@amount'] || record.amount || '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Updated:</span>
                  <span className="font-medium">{formatDate(record['@_StatusDate'] || record['@dateUpdated'] || record.dateUpdated || '2024-01-01')}</span>
                </div>

                {/* Additional details - only when expanded */}
                {showAccountDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Date Filed:</span>
                      <span className="font-medium">{formatDate(record['@_FilingDate'] || record.dateFiled || record['@_Date'])}</span>
                    </div>
                    {record['@caseNumber'] || record.caseNumber ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Case Number:</span>
                        <span className="font-medium">{record['@caseNumber'] || record.caseNumber}</span>
                      </div>
                    ) : null}
                    {record['@courtAddress'] || record.courtAddress ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Address:</span>
                        <span className="font-medium">{record['@courtAddress'] || record.courtAddress}</span>
                      </div>
                    ) : null}
                    {record['@courtPhone'] || record.courtPhone ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Phone:</span>
                        <span className="font-medium">{record['@courtPhone'] || record.courtPhone}</span>
                      </div>
                    ) : null}
                    {record['@plaintiff'] || record.plaintiff ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Plaintiff:</span>
                        <span className="font-medium">{record['@plaintiff'] || record.plaintiff}</span>
                      </div>
                    ) : null}
                    {record['@attorneyName'] || record.attorneyName ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Attorney:</span>
                        <span className="font-medium">{record['@attorneyName'] || record.attorneyName}</span>
                      </div>
                    ) : null}
                    {record['@trustee'] || record.trustee ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Trustee:</span>
                        <span className="font-medium">{record['@trustee'] || record.trustee}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>  
          </div>

          {/* Experian - EXACT copy of TransUnion structure */}
          <div className="relative">
            <div className={`font-bold mb-1 ${isDisputeSaved ? 'text-green-700' : 'text-blue-600'}`}>Experian</div>
            <div
              className={`border-3 rounded-lg p-4 ${
                isDisputeSaved
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-semibold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>{(record['@publicRecordType'] || record.publicRecordType || 'Public Record').toUpperCase()}</h4>
                <Select
                  value={experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')}
                  onValueChange={setExperianStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative'
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {(experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Positive' && (
                        <CheckIcon className="w-3 h-3 text-green-600" />
                      )}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-xs">
                {/* Exactly 5 lines - match negative accounts height */}
                <div className="flex justify-between">
                  <span className="text-gray-700">{getFirstFieldData().label}</span>
                  <span className="font-medium text-right whitespace-pre-line max-w-[200px]">
                    {formatCourtName(getFirstFieldData().value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Status:</span>
                  <span className={`font-medium ${record['@_StatusDescription']?.toLowerCase().includes('discharged') || record['@_StatusDescription']?.toLowerCase().includes('satisfied') || record['@_StatusDescription']?.toLowerCase().includes('released') ? 'text-green-600' : 'text-red-600'}`}>
                    {record['@_StatusDescription'] || record['@status'] || record.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Amount:</span>
                  <span className="font-medium">{formatCurrency(record['@_LiabilityAmount'] || record['@amount'] || record.amount || '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Updated:</span>
                  <span className="font-medium">{formatDate(record['@_StatusDate'] || record['@dateUpdated'] || record.dateUpdated || '2024-01-01')}</span>
                </div>

                {/* Additional details - only when expanded */}
                {showAccountDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Date Filed:</span>
                      <span className="font-medium">{formatDate(record['@_FilingDate'] || record.dateFiled || record['@_Date'])}</span>
                    </div>
                    {record['@caseNumber'] || record.caseNumber ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Case Number:</span>
                        <span className="font-medium">{record['@caseNumber'] || record.caseNumber}</span>
                      </div>
                    ) : null}
                    {record['@courtAddress'] || record.courtAddress ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Address:</span>
                        <span className="font-medium">{record['@courtAddress'] || record.courtAddress}</span>
                      </div>
                    ) : null}
                    {record['@courtPhone'] || record.courtPhone ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Phone:</span>
                        <span className="font-medium">{record['@courtPhone'] || record.courtPhone}</span>
                      </div>
                    ) : null}
                    {record['@plaintiff'] || record.plaintiff ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Plaintiff:</span>
                        <span className="font-medium">{record['@plaintiff'] || record.plaintiff}</span>
                      </div>
                    ) : null}
                    {record['@attorneyName'] || record.attorneyName ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Attorney:</span>
                        <span className="font-medium">{record['@attorneyName'] || record.attorneyName}</span>
                      </div>
                    ) : null}
                    {record['@trustee'] || record.trustee ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Trustee:</span>
                        <span className="font-medium">{record['@trustee'] || record.trustee}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

            {/* Show More Button */}
            <div className="flex justify-center mt-2">
              <button 
                onClick={() => setShowAccountDetails(!showAccountDetails)}
                className={`flex items-center gap-2 transition-colors ${
                  isDisputeSaved 
                    ? 'text-green-700 hover:text-green-800' 
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                <span>{showAccountDetails ? 'Show Less' : 'Show More'}</span>
                {showAccountDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* AI Violations Section */}
            {aiScanCompleted && aiViolations && aiViolations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 -mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-blue-800">AI Compliance Violations</h4>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {aiViolations.length} violation{aiViolations.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {aiViolations.map((violation, index) => (
                    <div key={index} className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                      {violation}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggestions Section */}
            {aiScanCompleted && aiSuggestions && aiSuggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 -mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-blue-800">AI Dispute Suggestions</h4>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {aiSuggestions.length} suggestion{aiSuggestions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* Create Dispute Section */}
            <div className="space-y-4">
              {/* Step 2 Header - Match Negative Accounts exactly */}
              <div className="flex items-center gap-3">
                {isDisputeSaved ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                    <ThickCheckIcon className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
                )}
                <span className={`font-bold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>
                  Create Dispute
                </span>
              </div>

              {/* Dispute Reason */}
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>Dispute Reason</label>
                <select
                  value={selectedReason || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isDisputeSaved) {
                      setIsDisputeSaved(false);
                    }
                    if (value === '__custom__') {
                      setShowCustomReasonField(true);
                      setSelectedReason('');
                      setCustomReason('');
                    } else if (value !== '') {
                      setCustomReason(value);
                      setSelectedReason(value);
                      setShowCustomReasonField(false);
                    }
                  }}
                  className={`w-full border bg-white h-[40px] px-3 text-sm rounded-md focus:outline-none dispute-reason-field ${hasAnyNegative ? (isDisputeSaved ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-gray-300 focus:border-gray-400'}`}
                >
                  <option value="">Select dispute reason...</option>
                  {disputeReasons.slice(1, -1).map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Write custom reason...</option>
                </select>
              </div>

              {/* Dispute Instruction */}
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>Dispute Instruction</label>
                <select
                  value={selectedInstruction || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isDisputeSaved) {
                      setIsDisputeSaved(false);
                    }
                    if (value === '__custom__') {
                      setShowCustomInstructionField(true);
                      setSelectedInstruction('');
                      setCustomInstruction('');
                    } else if (value !== '') {
                      setCustomInstruction(value);
                      setSelectedInstruction(value);
                      setShowCustomInstructionField(false);
                    }
                  }}
                  className={`w-full border bg-white h-[40px] px-3 text-sm rounded-md focus:outline-none dispute-instruction-field ${hasAnyNegative ? (isDisputeSaved ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-gray-300 focus:border-gray-400'}`}
                >
                  <option value="">Select dispute instruction...</option>
                  {disputeInstructions.slice(1, -1).map((instruction) => (
                    <option key={instruction} value={instruction}>
                      {instruction}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Write custom instruction...</option>
                </select>
              </div>

              {/* Step 3 - Match Negative Accounts exactly */}
              <div className="flex gap-2 justify-between items-center pt-2">
                {hasAnyNegative && !isDisputeSaved ? (
                  <div className="warning-container">
                    <AlertTriangle className="hidden md:block w-4 h-4 warning-icon" />
                    <span className="text-xs md:text-sm font-medium warning-text">
                      <span className="md:hidden">Complete<br />& Save</span>
                      <span className="hidden md:inline">Complete Reason & Instruction</span>
                    </span>
                  </div>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center gap-2 relative overflow-visible">
                  {isDisputeSaved ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white mr-1">
                      <ThickCheckIcon className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white mr-1">3</span>
                  )}
                  <Button
                    disabled={isButtonDisabled}
                    onClick={handleSaveDispute}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      isDisputeSaved
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : isButtonDisabled
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isDisputeSaved ? (
                      <div className="flex items-center gap-2">
                        <ThickCheckIcon className="w-4 h-4" />
                        <span>Dispute Saved</span>
                      </div>
                    ) : (
                      'Save Dispute and Continue'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}