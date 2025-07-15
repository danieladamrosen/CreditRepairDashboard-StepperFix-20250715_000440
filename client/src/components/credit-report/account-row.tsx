import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  Save,
  Lightbulb,
  ThumbsUp,
} from 'lucide-react';
import { ThickCheckIcon } from '@/components/ui/thick-check-icon';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PaymentHistoryVisual } from './payment-history-visual';
import transUnionLogo from '../../assets/transunion-logo.png';
import equifaxLogo from '../../assets/equifax-logo.png';
import experianLogo from '../../assets/experian-logo.png';


interface Account {
  '@_SubscriberCode': string;
  '@_AccountStatusType': string;
  '@_AccountType': string;
  '@_CurrentBalance': string;
  '@_HighCreditAmount': string;
  _CREDITOR?: {
    '@_Name': string;
  };
  publicRecordType?: string;
  _CURRENT_RATING?: any;
  CREDIT_LIABILITY_DETAIL?: any;
  CREDIT_COMMENT?: any;
  CREDIT_REPOSITORY?: any;
  CREDIT_BUSINESS?: any;
  [key: string]: any;
}

interface AccountRowProps {
  account: Account;
  aiViolations?: string[];

  disputeReasons?: string[];
  disputeInstructions?: string[];
  isFirstCopy?: boolean;

  onDisputeSaved?: (
    accountId: string,
    disputeData?: { reason: string; instruction: string; violations?: string[] }
  ) => void;
  onDisputeReset?: (accountId: string) => void;
  onHeaderReset?: () => void;
  expandAll?: boolean;
  showAllDetails?: boolean;
  aiScanCompleted?: boolean;
  savedDisputes?: {
    [accountId: string]: boolean | { reason: string; instruction: string; violations?: string[] };
  };
  isFirstInConnectedSection?: boolean;
  allNegativeAccountsSaved?: boolean;
  onExpand?: () => void;
}

export function AccountRow({
  account,
  aiViolations = [],

  disputeReasons: passedReasons = [],
  disputeInstructions: passedInstructions = [],
  isFirstCopy = false,

  onHeaderReset,
  onDisputeSaved,
  onDisputeReset,
  expandAll = false,
  showAllDetails = false,
  aiScanCompleted = false,
  savedDisputes = {},
  isFirstInConnectedSection = false,
  allNegativeAccountsSaved = false,
  onExpand,
}: AccountRowProps): JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create a unique identifier for this account instance
  const accountUniqueId = `${account['@_SubscriberCode']}-${account['@_AccountIdentifier'] || account['@_AccountNumber'] || account['@_CurrentBalance'] || 'unknown'}`;

  // Helper function to get violation count text
  const getViolationCountText = (isDesktop: boolean = true) => {
    const metro2Count = aiViolations.filter((v) => v.includes('Metro 2')).length;
    const fcrCount = aiViolations.length - metro2Count;
    
    if (metro2Count > 0 && fcrCount > 0) {
      return isDesktop ? ` (${metro2Count} Metro 2, ${fcrCount} FCRA)` : ` (${metro2Count}M2, ${fcrCount}FCRA)`;
    } else if (metro2Count > 0) {
      return isDesktop ? ` (${metro2Count} Metro 2)` : ` (${metro2Count}M2)`;
    } else if (fcrCount > 0) {
      return isDesktop ? ` (${fcrCount} FCRA)` : ` (${fcrCount}FCRA)`;
    }
    return '';
  };

  // Helper function to check if form is complete
  const isFormComplete = () => {
    const hasReason =
      selectedViolations.length > 0 || showCustomReasonField
        ? customReason.trim()
        : selectedReason;
    const hasInstruction =
      selectedViolations.length > 0 || showCustomInstructionField
        ? customInstruction.trim()
        : selectedInstruction;
    return !(!hasReason || !hasInstruction);
  };

  // Helper function to get button styling
  const getButtonStyling = () => {
    const hasReason =
      selectedViolations.length > 0 || showCustomReasonField
        ? customReason.trim()
        : selectedReason;
    const hasInstruction =
      selectedViolations.length > 0 || showCustomInstructionField
        ? customInstruction.trim()
        : selectedInstruction;
    const isIncomplete = !hasReason || !hasInstruction;
    return isIncomplete
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700';
  };

  // Mutation to save custom templates
  const saveTemplateMutation = useMutation({
    mutationFn: (data: { type: string; text: string; category: string }) =>
      fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: 'Template saved',
        description: 'Your custom text has been saved for future use.',
      });
    },
  });
  // Dispute form state
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [selectedInstruction, setSelectedInstruction] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [isDisputeSaved, setIsDisputeSaved] = useState(false);
  const [hasAiGeneratedText, setHasAiGeneratedText] = useState(false);


  // Check if this account is in savedDisputes and update internal state
  useEffect(() => {
    const accountId =
      account['@CreditLiabilityID'] ||
      account['@_AccountNumber'] ||
      account['@_AccountIdentifier'] ||
      account['@_SubscriberCode'] ||
      'unknown';
    if (savedDisputes[accountId]) {
      setIsDisputeSaved(true);
      // For public records: Check if this is an existing save (card was already collapsed)
      // Only collapse immediately if this card was previously saved and collapsed
      if (isCollapsed) {
        // This card was already collapsed from a previous save - keep it collapsed
        return;
      }
      // Don't immediately collapse new saves - let the individual save timing handle collapse

      // Only restore saved dispute data if user hasn't made manual selections
      const hasUserSelections =
        selectedReason ||
        selectedInstruction ||
        showCustomReasonField ||
        showCustomInstructionField;

      if (!hasUserSelections) {
        const savedData = savedDisputes[accountId];
        if (savedData && typeof savedData === 'object') {
          // Type guard to ensure we have the right structure
          const typedSavedData = savedData as { reason?: string; instruction?: string };
          if (typedSavedData.reason && typedSavedData.instruction) {
            // Check if current form is empty or has default/truncated text
            const currentReason = selectedReason || customReason || '';
            const currentInstruction = selectedInstruction || customInstruction || '';
            const isReasonEmpty = !currentReason.trim();
            const isInstructionEmpty = !currentInstruction.trim();
            const isReasonTruncated = currentReason.length > 0 && currentReason.length < 30;
            const isInstructionTruncated =
              currentInstruction.length > 0 && currentInstruction.length < 30;

            if (
              isReasonEmpty ||
              isReasonTruncated ||
              isInstructionEmpty ||
              isInstructionTruncated
            ) {
              // Restore the saved data

              // Check if saved data contains predefined dropdown values
              const disputeReasons = [
                "This account doesn&apos;t belong to me",
                'I already paid this account in full',
                'The payment history is wrong',
                'The balance amount is incorrect',
                'This account is too old to be reported',
                'I was a victim of identity theft',
                'My mother has the same name as me',
                'My father has the same name as me',
                'My son has the same name as me',
              ];

              const disputeInstructions = [
                'Please remove this account from my credit report',
                'Please update this account to show a zero balance',
                'Please correct the payment history for this account',
                'Please verify and correct the balance amount',
                'Please remove this outdated account per FCRA guidelines',
                'Please remove this fraudulent account immediately',
                "Please verify the account holder&apos;s identity",
                "Please verify the account holder&apos;s identity",
                "Please verify the account holder&apos;s identity",
              ];

              if (disputeReasons.includes(typedSavedData.reason)) {
                // Saved data uses dropdown selection
                setSelectedReason(typedSavedData.reason);
                setShowCustomReasonField(false);
              } else {
                // Saved data uses custom text
                setCustomReason(typedSavedData.reason);
                setShowCustomReasonField(true);
                setSelectedReason('');
              }

              if (disputeInstructions.includes(typedSavedData.instruction)) {
                // Saved data uses dropdown selection
                setSelectedInstruction(typedSavedData.instruction);
                setShowCustomInstructionField(false);
              } else {
                // Saved data uses custom text
                setCustomInstruction(typedSavedData.instruction);
                setShowCustomInstructionField(true);
                setSelectedInstruction('');
              }
            }
          }
        }
      }
    }
  }, [savedDisputes, account]);

  // UI visibility state
  const [showViolations, setShowViolations] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState<boolean | null>(null); // null = follow global, true/false = explicit user choice

  // Auto-show details when showAllDetails prop is true, reset when it's false
  useEffect(() => {
    if (showAllDetails) {
      // When showAllDetails is enabled, reset individual state to null (follow global)
      setShowAccountDetails(null);
    } else {
      // When showAllDetails is disabled, reset to false (collapsed state)
      // This ensures "Show Account Summaries For All" works correctly
      setShowAccountDetails(false);
    }
  }, [showAllDetails]);

  // Allow individual override of showAllDetails
  // Show details logic: 
  // - If showAllDetails is true and user hasn't explicitly set individual state, show details
  // - If showAllDetails is true and user explicitly set false, hide details (individual override)
  // - If showAllDetails is false, follow individual state
  const shouldShowDetails = showAllDetails 
    ? (showAccountDetails === null ? true : showAccountDetails)
    : (showAccountDetails || false);

  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showCustomReasonField, setShowCustomReasonField] = useState(false);
  const [showCustomInstructionField, setShowCustomInstructionField] = useState(false);
  const [showGuideArrow, setShowGuideArrow] = useState(false);
  const [showPositiveDetails, setShowPositiveDetails] = useState(false);
  const [showGuidedHelp, setShowGuidedHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);

  // AI typing animation state
  const [isTypingReason, setIsTypingReason] = useState(false);
  const [isTypingInstruction, setIsTypingInstruction] = useState(false);


  // Status dropdown states for each bureau
  const [transUnionStatus, setTransUnionStatus] = useState<string>('');
  const [equifaxStatus, setEquifaxStatus] = useState<string>('');
  const [experianStatus, setExperianStatus] = useState<string>('');

  // Utility functions - commented out unused function
  // const getAccountType = () => account['@_AccountType'] || 'Credit Card';
  const isPublicRecord = () =>
    account['@_AccountType'] === 'Public Record' || account.publicRecordType;

  // Dispute template configurations
  const getDisputeTemplates = (creditorName: string) => ({
    chargedOff: [
      {
        title: 'Paid/Settled Debt Violation',
        reason: 'This account was paid in full or settled',
        instruction: `My credit report shows an outstanding balance owed to ${creditorName}. This account was paid in full/settled, and no further amount is due. Please update to reflect zero balance.`,
      },
      {
        title: 'Inaccurate Balance Reporting',
        reason: 'The balance amount reported is incorrect',
        instruction: `The balance shown for ${creditorName} is inaccurate. Please verify the correct balance with the original creditor and update accordingly.`,
      },
      {
        title: 'Outdated Account (7-Year Rule)',
        reason: 'This account exceeds the 7-year reporting period',
        instruction: `This negative account is older than 7 years from the date of first delinquency. Per FCRA Section 605, please remove this outdated account immediately.`,
      },
    ],
    collection: [
      {
        title: 'Debt Validation Request',
        reason: 'Requesting validation of this debt',
        instruction: `Please provide validation that this debt belongs to me, including the original signed agreement and complete payment history. Per FDCPA Section 809, collection must cease until validation is provided.`,
      },
      {
        title: 'Unauthorized Collection',
        reason: 'Collection agency not authorized to collect',
        instruction: `Please provide proof that ${creditorName} is authorized to collect this debt, including the assignment agreement from the original creditor.`,
      },
      {
        title: 'Duplicate Collection Reporting',
        reason: 'Both original creditor and collection agency reporting',
        instruction: `My credit report shows both the original creditor and collection agency reporting the same debt. This duplicate reporting inflates my debt ratio. Please remove the duplicate entry.`,
      },
    ],
    latePayment: [
      {
        title: 'Incorrect Late Payment Marks',
        reason: 'These payments were made on time',
        instruction: `My credit report shows late payments to ${creditorName}. Those payments were made on time. Please update the payment history to reflect accurate payment dates and remove late markings.`,
      },
      {
        title: 'Payment History Verification',
        reason: 'Request verification of payment dates',
        instruction: `Please verify the payment history with ${creditorName} and provide documentation showing the actual payment dates. The current reporting appears inaccurate.`,
      },
      {
        title: 'Date of Last Activity Error',
        reason: 'The date of last activity is incorrect',
        instruction: `The date of last activity reported for ${creditorName} is inaccurate. Please verify and correct this date as it affects the reporting period calculation.`,
      },
    ],
    general: [
      {
        title: 'Account Does Not Belong to Me',
        reason: 'This account does not belong to me',
        instruction: `My credit report shows an account with ${creditorName} that does not belong to me. I have never had an account with this creditor. Please remove this unauthorized account.`,
      },
      {
        title: 'Mixed File Information',
        reason: 'Credit file has been mixed with another person',
        instruction: `My credit report shows accounts and information that do not belong to me. I believe my credit file has been mixed with someone else's file. Please investigate and remove all incorrect information.`,
      },
      {
        title: 'Incomplete Account Information',
        reason: 'Account information is incomplete or inaccurate',
        instruction: `The account information for ${creditorName} is incomplete or contains inaccuracies. Please verify all details with the creditor and update or remove if information cannot be verified.`,
      },
    ],
  });

  // Get 3 FCRA/FDCPA-based dispute combinations
  const getBestPracticeCombinations = () => {
    const accountStatus = account['@_AccountStatusType'] || '';
    const paymentStatus = account['@_PaymentHistoryProfile'] || '';
    const currentBalance = parseFloat(account['@_CurrentBalance'] || '0');
    const creditorName = account['@_AccountName'] || 'this creditor';
    const accountType = account['@_AccountType'] || '';

    const templates = getDisputeTemplates(creditorName);

    // Determine account category and return appropriate templates
    if (
      accountStatus.toLowerCase().includes('charged') ||
      (accountStatus.toLowerCase().includes('closed') && currentBalance > 0)
    ) {
      return templates.chargedOff;
    } else if (
      accountStatus.toLowerCase().includes('collection') ||
      accountType.toLowerCase().includes('collection')
    ) {
      return templates.collection;
    } else if (paymentStatus && paymentStatus.includes('X')) {
      return templates.latePayment;
    } else {
      return templates.general;
    }
  };

  // Apply complete reason/instruction combination with autotype effect
  const applyBestPracticeCombination = (
    combination: { reason: string; instruction: string },
    index: number,
    _event: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Set selected suggestion index to track which one is chosen
    setSelectedSuggestionIndex(index);

    // Close the dispute suggestions box immediately
    setShowGuidedHelp(false);

    // Removed scroll behavior to prevent continuous auto-scroll loops

    // Clear current values and prepare for typing
    setSelectedReason('');
    setSelectedInstruction('');
    setCustomReason('');
    setCustomInstruction('');
    setShowCustomReasonField(true);
    setShowCustomInstructionField(true);

    // Start typing the reason
    setIsTypingReason(true);
    let reasonIndex = 0;

    const typeReason = () => {
      if (reasonIndex < combination.reason.length) {
        setCustomReason(combination.reason.substring(0, reasonIndex + 1));
        reasonIndex++;
        setTimeout(typeReason, 25); // 25ms delay between characters
      } else {
        // Reason typing complete
        setIsTypingReason(false);

        // Start typing instruction after brief pause
        setTimeout(() => {
          setIsTypingInstruction(true);
          let instructionIndex = 0;

          const typeInstruction = () => {
            if (instructionIndex < combination.instruction.length) {
              setCustomInstruction(combination.instruction.substring(0, instructionIndex + 1));
              instructionIndex++;
              setTimeout(typeInstruction, 15); // Faster for instruction
            } else {
              // Instruction typing complete
              setIsTypingInstruction(false);
              // Check if form is complete after typing is done
              setTimeout(() => {
                checkFormCompletionAndShowArrow(combination.reason, combination.instruction);
              }, 200);
            }
          };
          typeInstruction();
        }, 400); // Brief pause between reason and instruction
      }
    };

    typeReason();
  };

  // Check if form is complete and show guide arrow
  const checkFormCompletionAndShowArrow = (
    overrideReason?: string,
    overrideInstruction?: string
  ) => {
    // Check both custom fields and default selections
    const hasReason = customReason.trim() || overrideReason || selectedReason;
    const hasInstruction =
      customInstruction.trim() ||
      overrideInstruction ||
      selectedInstruction;
  

    // Show arrow if form is complete (either with violations OR with dropdown selections)
    if (hasReason && hasInstruction && !isDisputeSaved) {
      setShowGuideArrow(true);
      setTimeout(() => {
        setShowGuideArrow(false);
      }, 4000);
    }
  };

  // Determine if account is truly negative based on actual JSON data fields
  const isNegative = () => {
    // Primary indicators of negative accounts based on actual JSON structure

    // 1. Explicit derogatory data indicator
    if (account['@_DerogatoryDataIndicator'] === 'Y') return true;

    // 2. Collection accounts
    if (account['@IsCollectionIndicator'] === 'Y') return true;

    // 3. Charge-off accounts
    if (account['@IsChargeoffIndicator'] === 'Y') return true;

    // 4. Check for past due amounts (indicates late payments)
    const pastDue = parseInt(account['@_PastDueAmount'] || '0');
    if (pastDue > 0) return true;

    // 5. Check current rating code for late payments (2-9 indicate late payments)
    const currentRating = account._CURRENT_RATING?.['@_Code'];
    if (currentRating && ['2', '3', '4', '5', '6', '7', '8', '9'].includes(currentRating))
      return true;

    // 6. Check for charge-off date
    if (account['@_ChargeOffDate']) return true;

    return false;
  };

  const accountIsNegative = isNegative();
  
  // Check if any bureau status was manually changed to 'Negative'
  const hasStatusChangedToNegative = 
    transUnionStatus === 'Negative' || 
    equifaxStatus === 'Negative' || 
    experianStatus === 'Negative';
  
  // An account should behave as negative if either:
  // 1. It's naturally negative based on data, OR
  // 2. Any bureau status was manually changed to 'Negative'
  const hasAnyNegative = accountIsNegative || hasStatusChangedToNegative;

  // Check if any items are selected (for pink background)
  const hasSelections = selectedReason || selectedInstruction || customReason || customInstruction || selectedViolations.length > 0;

  // Reset individual account states when expandAll becomes false (Collapse All)
  useEffect(() => {
    if (expandAll === false && !hasAnyNegative) {
      setShowPositiveDetails(false);
      setShowAccountDetails(false);
    }
  }, [expandAll, hasAnyNegative]);

  // Determine if account is closed
  const isClosed = () => {
    // Check for closed account status
    const accountStatus = account['@_AccountStatusType'];
    if (
      accountStatus &&
      (accountStatus.toLowerCase().includes('closed') ||
        accountStatus.toLowerCase().includes('paid') ||
        accountStatus === 'C')
    )
      return true;

    // Check for closed date
    if (account['@_AccountClosedDate']) return true;

    // Check current rating for closed accounts
    const currentRating = account._CURRENT_RATING?.['@_Code'];
    if (currentRating && currentRating === 'C') return true;

    return false;
  };

  const accountIsClosed = isClosed();

  // Use passed arrays or fallback to consumer-friendly defaults based on common FCRA violations
  const disputeReasons =
    passedReasons.length > 0
      ? [...passedReasons, 'Add new custom reason']
      : [
          "This account doesn&apos;t belong to me",
          'I already paid this account in full',
          'The payment history is wrong',
          'The balance amount is incorrect',
          'This account is too old to be reported',
          'I was a victim of identity theft',
          'My mother has the same name as me',
          'My father has the same name as me',
          'My son has the same name as me',
          'Add new custom reason',
        ];

  const disputeInstructions =
    passedInstructions.length > 0
      ? [...passedInstructions, 'Add new custom instruction']
      : [
          'Remove this account completely from my credit report immediately',
          'Delete all inaccurate payment history from my credit report',
          'Remove the incorrect balance information from my credit report',
          "Delete this account from my credit report since it&apos;s too old to report",
          'Remove this fraudulent account from my credit report due to identity theft',
          'Delete this account that belongs to my family member from my credit report',
          'Remove this account that was discharged in bankruptcy from my credit report',
          'Delete this duplicate account from my credit report',
          'Remove all inaccurate information about this account from my credit report',
          'Add new custom instruction',
        ];

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

  // Helper functions to safely extract account data from nested structure
  const getAccountField = (field: string, fallback: string = 'N/A') => {
    let value = null;

    // Direct field access - try exact field name first
    if (account[field] !== undefined && account[field] !== null && account[field] !== '') {
      value = account[field];
    }

    // Handle specific field mappings based on actual JSON structure
    switch (field) {
      case '@_CreditLimitAmount':
        value = account['@_CreditLimitAmount'] || account['@_HighCreditAmount'] || null;
        break;
      case '@_ActualPaymentAmount':
        value = account['@_ActualPaymentAmount'] || account['@_MonthlyPaymentAmount'] || null;
        break;
      case '@_CreditBusinessType':
        value = account['@CreditBusinessType'] || null;
        break;
      case '@_TermsFrequencyType':
        // This field might not exist in many records
        value = account['@_TermsFrequencyType'] || null;
        break;
      case '@_CreditLiabilityAccountReportedDate':
        value =
          account['@_CreditLiabilityAccountReportedDate'] ||
          account['@_AccountReportedDate'] ||
          null;
        break;
      case '@_Late30DaysCount':
        value = account['_LATE_COUNT']?.['@_30Days'] || '0';
        break;
      case '@_Late60DaysCount':
        value = account['_LATE_COUNT']?.['@_60Days'] || '0';
        break;
      case '@_Late90DaysCount':
        value = account['_LATE_COUNT']?.['@_90Days'] || '0';
        break;
      case '@_PaymentPatternData':
        value = account['_PAYMENT_PATTERN']?.['@_Data'] || null;
        break;
      case '@_PaymentPatternStartDate':
        value = account['_PAYMENT_PATTERN']?.['@_StartDate'] || null;
        break;
      case '@_CurrentRatingCode':
        value = account['_CURRENT_RATING']?.['@_Code'] || null;
        break;
      case '@_CurrentRatingType':
        value = account['_CURRENT_RATING']?.['@_Type'] || null;
        break;
      case '@_CreditorName':
        value = account['_CREDITOR']?.['@_Name'] || null;
        break;
      case '@_SubscriberName':
        value =
          account['@_SubscriberName'] ||
          account['_CREDITOR']?.['@_Name'] ||
          account['@_CreditorName'] ||
          null;
        break;
      case '@_SubscriberCode':
        value = account['CREDIT_REPOSITORY']?.['@_SubscriberCode'] || null;
        break;
      case '@_PastDueAmount':
        value = account['@_PastDueAmount'] || '0';
        break;
      case '@_OriginalCreditorName':
        value = account['@_OriginalCreditorName'] || null;
        break;
      case '@_CollectionDate':
        value = account['@CollectionDate'] || null;
        break;
      default:
        // Try nested structures if direct access didn't work
        if (value === null) {
          value =
            account.CREDIT_LIABILITY_DETAIL?.[field] || account.CREDIT_COMMENT?.[field] || null;
        }
        break;
    }

    // Return the value if found, otherwise return fallback
    return value !== null && value !== undefined && value !== '' ? value : fallback;
  };

  // Formatting utilities
  const formatCurrency = (amount: any) => {
    if (!amount || amount === 'N/A') return 'N/A';
    const num = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 'N/A' : `$${num.toLocaleString()}`;
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const addViolationToDispute = async (violation: string) => {
    if (!selectedViolations.includes(violation)) {
      const newViolations = [...selectedViolations, violation];
      setSelectedViolations(newViolations);

      // Auto-populate text fields when violations are added
      const isFirstViolation = selectedViolations.length === 0;

      // Create structured compliance reason with all violations
      const complianceReason = `This tradeline contains ${newViolations.length > 1 ? 'multiple ' : ''}compliance violations under Metro 2 and the FCRA:
${newViolations
  .map((v) => {
    if (v.includes('Metro 2')) {
      return `• Metro 2 Violation: ${v.replace('Metro 2 Violation: ', '')}`;
    } else if (v.includes('FCRA')) {
      return `• FCRA Violation: ${v.replace('FCRA Violation: ', '')} under FCRA § 623`;
    }
    return `• ${v}`;
  })
  .join('\n')}

Due to these reporting inaccuracies and regulatory violations, I am requesting the permanent deletion of this tradeline from my credit report.`;

      const complianceInstruction =
        'Please take immediate action to remove this non-compliant account in accordance with Metro 2 and FCRA requirements. If reinvestigation cannot verify accuracy within 30 days, permanent deletion is required under 15 USC §1681i(a)(1).';

      if (isFirstViolation) {
        // First violation - use typing animation
        setHasAiGeneratedText(true);
        // Switch to custom text mode
        setShowCustomReasonField(true);
        setShowCustomInstructionField(true);
        setSelectedReason('');
        setSelectedInstruction('');
        setTimeout(async () => {
          await typeText(complianceReason, setCustomReason, setIsTypingReason, 3);
          await new Promise((resolve) => setTimeout(resolve, 75));
          await typeText(complianceInstruction, setCustomInstruction, setIsTypingInstruction, 4);
          // Check for arrow after both fields are typed
          setTimeout(() => {
            checkFormCompletionAndShowArrow(complianceReason, complianceInstruction);
          }, 500);
        }, 150);
      } else {
        // Additional violations - update text instantly
        setHasAiGeneratedText(true);
        setCustomReason(complianceReason);
        setCustomInstruction(complianceInstruction);
        // Check for arrow after instant update
        setTimeout(
          () => checkFormCompletionAndShowArrow(complianceReason, complianceInstruction),
          100
        );
      }
    }
  };

  const removeViolationFromDispute = (violation: string) => {
    const newViolations = selectedViolations.filter((v) => v !== violation);
    setSelectedViolations(newViolations);

    // Update text fields to reflect remaining violations
    if (newViolations.length === 0) {
      // No violations left - clear the fields
      setCustomReason('');
      setCustomInstruction('');
    } else {
      // Update text with remaining violations
      const complianceReason = `This tradeline contains ${newViolations.length > 1 ? 'multiple ' : ''}compliance violations under Metro 2 and the FCRA:
${newViolations
  .map((v) => {
    if (v.includes('Metro 2')) {
      return `• Metro 2 Violation: ${v.replace('Metro 2 Violation: ', '')}`;
    } else if (v.includes('FCRA')) {
      return `• FCRA Violation: ${v.replace('FCRA Violation: ', '')} under FCRA § 623`;
    }
    return `• ${v}`;
  })
  .join('\n')}

Due to these reporting inaccuracies and regulatory violations, I am requesting the permanent deletion of this tradeline from my credit report.`;

      const complianceInstruction =
        'Please take immediate action to remove this non-compliant account in accordance with Metro 2 and FCRA requirements. If reinvestigation cannot verify accuracy within 30 days, permanent deletion is required under 15 USC §1681i(a)(1).';

      setCustomReason(complianceReason);
      setCustomInstruction(complianceInstruction);
    }

    // Check for arrow after updating violation text
    setTimeout(() => checkFormCompletionAndShowArrow(), 100);
  };

  // Typing animation function
  const typeText = async (
    text: string,
    setter: (value: string) => void,
    isTypingSetter: (value: boolean) => void,
    speed: number = 30
  ) => {
    isTypingSetter(true);
    setter('');

    for (let i = 0; i <= text.length; i++) {
      setter(text.slice(0, i));
      await new Promise((resolve) => setTimeout(resolve, speed));
    }

    isTypingSetter(false);
  };

  const addAllViolations = async (_event: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedViolations([...aiViolations]);

    // Close the violations box immediately
    setShowViolations(false);

    // Create structured compliance reason with improved format
    const complianceReason = `This tradeline contains multiple compliance violations under Metro 2 and the FCRA:
${aiViolations
  .map((violation) => {
    if (violation.includes('Metro 2')) {
      return `• Metro 2 Violation: ${violation.replace('Metro 2 Violation: ', '')}`;
    } else if (violation.includes('FCRA')) {
      return `• FCRA Violation: ${violation.replace('FCRA Violation: ', '')} under FCRA § 623`;
    }
    return `• ${violation}`;
  })
  .join('\n')}

Due to these reporting inaccuracies and regulatory violations, I am requesting the permanent deletion of this tradeline from my credit report.`;

    const complianceInstruction =
      'Please take immediate action to remove this non-compliant account in accordance with Metro 2 and FCRA requirements. If reinvestigation cannot verify accuracy within 30 days, permanent deletion is required under 15 USC §1681i(a)(1).';

    // Switch to custom text mode
    setShowCustomReasonField(true);
    setShowCustomInstructionField(true);
    setSelectedReason('');
    setSelectedInstruction('');

    // Removed scroll behavior to prevent continuous auto-scroll loops

    // Wait a moment then start typing animations
    setTimeout(async () => {
      // Type reason first
      await typeText(complianceReason, setCustomReason, setIsTypingReason, 3);

      // Small pause between reason and instruction
      await new Promise((resolve) => setTimeout(resolve, 75));

      // Then type instruction
      await typeText(complianceInstruction, setCustomInstruction, setIsTypingInstruction, 4);

      // Check for arrow after both fields are typed
      setTimeout(() => {
        checkFormCompletionAndShowArrow(complianceReason, complianceInstruction);
      }, 500);
    }, 150);
  };

  // Get creditor name exactly like the main section
  const getCreditorName = () => {
    return account['_CREDITOR']?.['@_Name'] || account['@_SubscriberCode'] || 'Unknown Creditor';
  };

  // Format account details for display - commented out unused function  
  // const formatAccountDetails = () => {
  //   const details: { [key: string]: any } = {};
  //   Object.keys(account).forEach((key) => {
  //     if (
  //       key.startsWith('@') &&
  //       account[key] !== null &&
  //       account[key] !== undefined &&
  //       account[key] !== ''
  //     ) {
  //       const cleanKey = key.replace('@_', '').replace('@', '');
  //       details[cleanKey] = account[key];
  //     }
  //   });
  //   return details;
  // };

  // Convert status codes to readable descriptions
  const getStatusDescription = (statusCode: string) => {
    const statusMap: { [key: string]: string } = {
      '1': 'Current/Pays as Agreed',
      '2': '30 Days Late',
      '3': '60 Days Late',
      '4': '90 Days Late',
      '5': '120+ Days Late',
      '7': 'Making Payments Under Wage Earner Plan',
      '8': 'Repossession',
      '9': 'Charged Off/Bad Debt',
      G: 'Collection Account',
      L: 'Settled for Less Than Full Balance',
      R: 'Refinanced',
      C: 'Closed',
      O: 'Open',
      U: 'Unrated',
    };
    return statusMap[statusCode] || `Status ${statusCode}`;
  };

  // Use authentic data from JSON - no synthetic variations
  const getBureauData = () => {
    const realBalance = parseInt(
      account['@_UnpaidBalanceAmount'] || account['@_CurrentBalance'] || '0'
    );
    const realStatus = account._CURRENT_RATING?.['@_Code'] || '1';
    const realDate = account['@_AccountOpenedDate'] || '2020-01-01';
    const reportingBureau = account.CREDIT_REPOSITORY?.['@_SourceType'] || 'Unknown';

    // Use the same authentic data for all bureaus since we only have one record per account
    return {
      transUnion: {
        balance: realBalance,
        statusCode: realStatus,
        status: getStatusDescription(realStatus),
        openDate: realDate,
        isNegative: false, // Will be determined by isCurrentlyNegative function
        lastUpdated: account['@_AccountReportedDate'] || '2024-01-01',
        reportingBureau: reportingBureau === 'TransUnion' ? reportingBureau : 'Not Reporting',
      },
      equifax: {
        balance: realBalance,
        statusCode: realStatus,
        status: getStatusDescription(realStatus),
        openDate: realDate,
        isNegative: false, // Will be determined by isCurrentlyNegative function
        lastUpdated: account['@_AccountReportedDate'] || '2024-01-01',
        reportingBureau: reportingBureau === 'Equifax' ? reportingBureau : 'Not Reporting',
      },
      experian: {
        balance: realBalance,
        statusCode: realStatus,
        status: getStatusDescription(realStatus),
        openDate: realDate,
        isNegative: false, // Will be determined by isCurrentlyNegative function
        lastUpdated: account['@_AccountReportedDate'] || '2024-01-01',
        reportingBureau: reportingBureau === 'Experian' ? reportingBureau : 'Not Reporting',
      },
    };
  };

  const bureauData = getBureauData();

  // Helper function to get consistent account number from JSON data
  const getAccountNumber = () => {
    // Use the actual account number from the JSON data
    return String(account['@_AccountNumber'] || account['@CreditLiabilityID'] || '0000');
  };

  const getMaskedAccountNumber = () => {
    const fullNumber = getAccountNumber();
    return `****${fullNumber.slice(-4)}`;
  };

  const getPaymentStatusStyle = (status: string) => {
    const negativeStatuses = [
      '30 Days Late',
      '60 Days Late',
      '90 Days Late',
      '120 Days Late',
      'Charge Off',
      'Collection',
      'Late',
      'Past Due',
    ];
    const isNegative = negativeStatuses.some(
      (negStatus) =>
        status.includes(negStatus) ||
        status.toLowerCase().includes('late') ||
        status.toLowerCase().includes('past due') ||
        status.toLowerCase().includes('charge') ||
        status.toLowerCase().includes('collection')
    );
    return isNegative ? 'text-red-600 font-medium' : 'text-green-600 font-medium';
  };

  const isNegativeAccount = (status: string) => {
    const negativeStatuses = [
      '30 Days Late',
      '60 Days Late',
      '90 Days Late',
      '120 Days Late',
      'Charge Off',
      'Collection',
      'Late',
      'Past Due',
    ];
    return negativeStatuses.some(
      (negStatus) =>
        status.includes(negStatus) ||
        status.toLowerCase().includes('late') ||
        status.toLowerCase().includes('past due') ||
        status.toLowerCase().includes('charge') ||
        status.toLowerCase().includes('collection')
    );
  };

  const getAccountDataStyle = (status: string) => {
    return isNegativeAccount(status) ? 'text-red-600' : 'text-gray-900';
  };

  // Function to generate creditor initials badge
  const getCreditorInitials = (creditorName: string) => {
    if (!creditorName || creditorName === 'Unknown Creditor') return 'UC';
    
    const words = creditorName.split(' ').filter(word => word.length > 0);
    
    if (words.length >= 2) {
      // For 2+ words, use first letter of each word (up to 2 letters)
      return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
    } else if (words.length === 1) {
      // For 1 word, use first 2 letters
      return words[0].substring(0, 2).toUpperCase();
    }
    
    return 'UC';
  };

  // For positive and closed accounts, show collapsed view by default (unless expandAll or showAllDetails is true)
  if (!hasAnyNegative && !showPositiveDetails && !expandAll && !showAllDetails) {
    const isClosedAccount = accountIsClosed && !accountIsNegative;
    const badgeColor = isClosedAccount ? 'bg-gray-500' : 'bg-green-500';
    const textColor = isClosedAccount ? 'text-gray-600' : 'text-green-600';
    const statusText = isClosedAccount ? 'Closed' : 'In Good Standing';
    const creditorName = account._CREDITOR?.['@_Name'] ||
      account.CREDIT_BUSINESS?.['@_Name'] ||
      'Unknown Creditor';

    return (
      <Card className="border border-gray-200 rounded-lg transition-all duration-300 hover:shadow-lg overflow-hidden">
        <CardHeader
          className="cursor-pointer flex flex-row items-center p-6 bg-white hover:bg-gray-50 transition-colors duration-200"
          onClick={() => setShowPositiveDetails(true)}
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${badgeColor} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                {getCreditorInitials(creditorName)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {creditorName}
                </h3>
                <p className={`text-sm ${textColor} font-normal`}>{statusText}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">Account</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Show collapsed state when dispute is saved
  if (isCollapsed && isDisputeSaved) {
    const creditorName = isPublicRecord()
      ? account.publicRecordType || account['@_AccountType'] || 'Public Record'
      : account._CREDITOR?.['@_Name'] ||
        account.CREDIT_BUSINESS?.['@_Name'] ||
        'Unknown Creditor';

    return (
      <Card 
        className="border border-gray-200 rounded-lg transition-all duration-300 hover:shadow-lg overflow-hidden"
        data-account-id={
          account['@CreditLiabilityID'] ||
          account['@_AccountNumber'] ||
          account['@_AccountIdentifier'] ||
          account['@_SubscriberCode'] ||
          'unknown'
        }
      >
        <CardHeader
          className="cursor-pointer flex flex-row items-center p-6 bg-green-50 hover:bg-green-100 transition-colors duration-200"
          onClick={() => {
            setIsCollapsed(false);
            if (onExpand) {
              onExpand();
            }
          }}
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {creditorName}
                </h3>
                <p className="text-sm text-green-600 font-normal">Dispute Saved</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">Account</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className={`${
        isDisputeSaved
          ? 'border-2 border-green-500 bg-green-50'
          : (hasSelections || hasAnyNegative)
            ? 'border-2 border-red-500 bg-rose-50'
            : 'border-2 border-gray-300'
      } rounded-lg transition-all duration-300 hover:shadow-lg overflow-hidden ${
        isFirstInConnectedSection ? 'connected-first-account' : ''
      }`}
      data-account-id={
        account['@CreditLiabilityID'] ||
        account['@_AccountNumber'] ||
        account['@_AccountIdentifier'] ||
        account['@_SubscriberCode'] ||
        'unknown'
      }
      data-highlight-target={hasAnyNegative ? 'true' : 'false'}
    >
      {/* Only show header for non-negative accounts */}
      {!hasAnyNegative && (
        <CardHeader
          className="cursor-pointer flex flex-row items-center p-6 bg-white hover:bg-gray-50 transition-colors duration-200 hover:shadow-lg rounded-t-lg"
          onClick={() => {
            setShowPositiveDetails(!showPositiveDetails);
          }}
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${
                accountIsClosed && !accountIsNegative ? 'bg-gray-500' : 'bg-green-500'
              } rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                {getCreditorInitials(account._CREDITOR?.['@_Name'] || account.CREDIT_BUSINESS?.['@_Name'] || 'Unknown Creditor')}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {account._CREDITOR?.['@_Name'] || account.CREDIT_BUSINESS?.['@_Name'] || 'Unknown Creditor'}
                </h3>
                <p className="text-sm text-gray-600 font-normal">
                  {accountIsClosed ? 'Closed Account' : 'Account Details'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">Account</span>
              {(showPositiveDetails || expandAll) ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={`${hasAnyNegative ? (isDisputeSaved ? 'bg-green-50' : 'bg-rose-50') : 'bg-white'} px-4 md:px-6 ${hasAnyNegative ? 'pt-6 pb-6' : 'pt-1 pb-2'}`}>


        {/* Numbered guidance for negative accounts only */}
        {hasAnyNegative && (
          <div className="flex-between mb-4">
            <div className="flex items-center gap-3">
              {isDisputeSaved ? (
                <span className="text-green-600 text-lg font-bold">✓</span>
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">1</div>
              )}
              <span className={`font-bold ${isDisputeSaved ? 'text-green-700' : ''}`}>
                {isDisputeSaved
                  ? 'Dispute Saved'
                  : 'Review this negative item, then scroll down to steps 2 and 3'}
              </span>
            </div>

          </div>
        )}

        {/* Account Header */}
        <div className="mb-4">
          {/* Mobile: No standalone button here anymore */}

          {/* Desktop: Show all three bureau headers */}
          <div className="hidden md:block relative">
            <div className="flex-between mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${isDisputeSaved ? 'text-green-700' : 'text-cyan-700'}`}>TransUnion</h3>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${isDisputeSaved ? 'text-green-700' : 'text-red-600'}`}>Equifax</h3>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${isDisputeSaved ? 'text-green-700' : 'text-blue-800'}`}>Experian</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Show All Info Button */}
        <div className="block md:hidden mb-2">
          <div className="flex-between">
            <h3 className={`font-bold text-left ${isDisputeSaved ? 'text-green-700' : 'text-cyan-700'}`}>TransUnion</h3>
            <Dialog open={showMobileModal} onOpenChange={setShowMobileModal}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center px-2 py-1 text-xs h-6 border border-gray-300"
                >
                  Show All Info
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Complete Account Details</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    Complete account information across all three bureaus
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* TransUnion Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="bg-white border border-cyan-200 rounded-lg p-4 mb-4 -mx-1">
                      <div className="flex items-center justify-center mb-3">
                        <img 
                          src={transUnionLogo} 
                          alt="TransUnion" 
                          className="h-6 w-auto object-contain"
                        />
                      </div>
                      <h3 className="font-bold text-gray-900 text-center text-xl leading-tight">
                        {getAccountField('@_SubscriberName') || getCreditorName()}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {isPublicRecord() ? (
                        // Public Record Fields
                        <>
                          <div className="flex justify-between border-b border-cyan-100 pb-1">
                            <span className="font-medium text-gray-600">Record Type:</span>
                            <span className="text-gray-900">
                              {account.publicRecordType || 'Public Record'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-cyan-100 pb-1">
                            <span className="font-medium text-gray-600">Court:</span>
                            <span className="text-gray-900">
                              {account.courtName || account['@_SubscriberName']}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-cyan-100 pb-1">
                            <span className="font-medium text-gray-600">Case Number:</span>
                            <span className="text-gray-900">
                              {account.caseNumber || account['@_AccountIdentifier']}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-cyan-100 pb-1">
                            <span className="font-medium text-gray-600">Filing Date:</span>
                            <span className="text-gray-900">
                              {formatDate(account.filingDate || account['@_AccountOpenedDate'])}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-cyan-100 pb-1">
                            <span className="font-medium text-gray-600">Status:</span>
                            <span className="text-red-600 font-medium">
                              {account.status || account['@_AccountStatusType']}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-cyan-100 pb-1">
                            <span className="font-medium text-gray-600">Liabilities:</span>
                            <span className="text-gray-900">
                              {account.liabilities ||
                                formatCurrency(account['@_UnpaidBalanceAmount'])}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-cyan-100 pb-1">
                            <span className="font-medium text-gray-600">Assets:</span>
                            <span className="text-gray-900">{account.assets || 'N/A'}</span>
                          </div>
                          {account.dischargeDate && (
                            <div className="flex justify-between border-b border-cyan-100 pb-1">
                              <span className="font-medium text-gray-600">Discharge Date:</span>
                              <span className="text-gray-900">
                                {formatDate(account.dischargeDate)}
                              </span>
                            </div>
                          )}
                          {account.completionDate && (
                            <div className="flex justify-between border-b border-cyan-100 pb-1">
                              <span className="font-medium text-gray-600">Completion Date:</span>
                              <span className="text-gray-900">
                                {formatDate(account.completionDate)}
                              </span>
                            </div>
                          )}
                          {account.paymentPlan && (
                            <div className="flex justify-between border-b border-cyan-100 pb-1">
                              <span className="font-medium text-gray-600">Payment Plan:</span>
                              <span className="text-gray-900">{account.paymentPlan}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        // Regular Account Fields
                        <>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Account Type:</span>
                            <span className="text-gray-900 text-sm">
                              {account['@_AccountType'] || 'Credit Card'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Account #:</span>
                            <span className="text-gray-900 text-sm">
                              {getMaskedAccountNumber()}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Date Opened:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountOpenedDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">
                              Payment Status:
                            </span>
                            <span
                              className={`text-sm ${getPaymentStatusStyle(bureauData.transUnion.status)}`}
                            >
                              {bureauData.transUnion.status}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Credit Limit:</span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_CreditLimitAmount'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Balance:</span>
                            <span className="text-gray-900 text-sm">
                              ${bureauData.transUnion.balance}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">
                              Monthly Payment:
                            </span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_MonthlyPaymentAmount'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">High Balance:</span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_HighBalanceAmount'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Past Due:</span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_PastDueAmount', '0'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">
                              Last Activity:
                            </span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_LastActivityDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">
                              Date Reported:
                            </span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountBalanceDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Late 30 Days:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_Late30DaysCount', '0')}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Late 60 Days:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_Late60DaysCount', '0')}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">
                              Late 90+ Days:
                            </span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_Late90DaysCount', '0')}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Account Status Date:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountStatusDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Last Payment Date:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_LastPaymentDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Date Closed:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountClosedDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Terms:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_TermsDescription')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700 text-sm">Ownership:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_AccountOwnershipType')}
                            </span>
                          </div>

                          {/* Payment History */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Payment History:
                              </span>
                            </div>
                            <PaymentHistoryVisual
                              paymentPattern={
                                account['_PAYMENT_PATTERN']?.['@_Data'] || 'CCCCCCCCCCCCCCCCCCCCCCC'
                              }
                              compact={true}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Equifax Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="bg-white border border-red-200 rounded-lg p-4 mb-4 -mx-1">
                      <div className="flex items-center justify-center mb-3">
                        <img 
                          src={equifaxLogo} 
                          alt="Equifax" 
                          className="h-4 w-auto object-contain"
                        />
                      </div>
                      <h3 className="font-bold text-gray-900 text-center text-xl leading-tight">
                        {getAccountField('@_SubscriberName') || getCreditorName()}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {isPublicRecord() ? (
                        // Public Record Fields
                        <>
                          <div className="flex justify-between border-b border-red-100 pb-1">
                            <span className="font-medium text-gray-600">Record Type:</span>
                            <span className="text-gray-900">
                              {account.publicRecordType || 'Public Record'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-red-100 pb-1">
                            <span className="font-medium text-gray-600">Court:</span>
                            <span className="text-gray-900">
                              {account.courtName || account['@_SubscriberName']}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-red-100 pb-1">
                            <span className="font-medium text-gray-600">Case Number:</span>
                            <span className="text-gray-900">
                              {account.caseNumber || account['@_AccountIdentifier']}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-red-100 pb-1">
                            <span className="font-medium text-gray-600">Filing Date:</span>
                            <span className="text-gray-900">
                              {formatDate(account.filingDate || account['@_AccountOpenedDate'])}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-red-100 pb-1">
                            <span className="font-medium text-gray-600">Status:</span>
                            <span className="text-red-600 font-medium">
                              {account.status || account['@_AccountStatusType']}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-red-100 pb-1">
                            <span className="font-medium text-gray-600">Liabilities:</span>
                            <span className="text-gray-900">
                              {account.liabilities ||
                                formatCurrency(account['@_UnpaidBalanceAmount'])}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-red-100 pb-1">
                            <span className="font-medium text-gray-600">Assets:</span>
                            <span className="text-gray-900">{account.assets || 'N/A'}</span>
                          </div>
                          {account.dischargeDate && (
                            <div className="flex justify-between border-b border-red-100 pb-1">
                              <span className="font-medium text-gray-600">Discharge Date:</span>
                              <span className="text-gray-900">
                                {formatDate(account.dischargeDate)}
                              </span>
                            </div>
                          )}
                          {account.completionDate && (
                            <div className="flex justify-between border-b border-red-100 pb-1">
                              <span className="font-medium text-gray-600">Completion Date:</span>
                              <span className="text-gray-900">
                                {formatDate(account.completionDate)}
                              </span>
                            </div>
                          )}
                          {account.paymentPlan && (
                            <div className="flex justify-between border-b border-red-100 pb-1">
                              <span className="font-medium text-gray-600">Payment Plan:</span>
                              <span className="text-gray-900">{account.paymentPlan}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        // Regular Account Fields
                        <>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Account Type:</span>
                            <span className="text-gray-900 text-sm">
                              {account['@_AccountType'] || 'Credit Card'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Account #:</span>
                            <span className="text-gray-900 text-sm">{getMaskedAccountNumber()}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Date Opened:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountOpenedDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Payment Status:</span>
                            <span
                              className={`text-sm ${getPaymentStatusStyle(bureauData.equifax.status)}`}
                            >
                              {bureauData.equifax.status}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Credit Limit:</span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_CreditLimitAmount'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Balance:</span>
                            <span className="text-gray-900 text-sm">${bureauData.equifax.balance}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Monthly Payment:</span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_MonthlyPaymentAmount'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">High Balance:</span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_HighBalanceAmount'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Past Due:</span>
                            <span className="text-gray-900 text-sm">
                              {formatCurrency(getAccountField('@_PastDueAmount', '0'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Last Activity:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_LastActivityDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Date Reported:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountBalanceDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Late 30 Days:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_Late30DaysCount', '0')}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Late 60 Days:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_Late60DaysCount', '0')}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Late 90+ Days:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_Late90DaysCount', '0')}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Account Status Date:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountStatusDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Last Payment Date:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_LastPaymentDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Date Closed:</span>
                            <span className="text-gray-900 text-sm">
                              {formatDate(getAccountField('@_AccountClosedDate'))}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 py-2">
                            <span className="font-medium text-gray-700 text-sm">Terms:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_TermsDescription')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700 text-sm">Ownership:</span>
                            <span className="text-gray-900 text-sm">
                              {getAccountField('@_AccountOwnershipType')}
                            </span>
                          </div>

                          {/* Payment History */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Payment History:
                              </span>
                            </div>
                            <PaymentHistoryVisual
                              paymentPattern={
                                account['_PAYMENT_PATTERN']?.['@_Data'] || 'CCCCCCCCCCCCCCCCCCCCCCC'
                              }
                              compact={true}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Experian Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4 -mx-1">
                      <div className="flex items-center justify-center mb-3">
                        <img 
                          src={experianLogo} 
                          alt="Experian" 
                          className="h-6 w-auto object-contain"
                        />
                      </div>
                      <h3 className="font-bold text-gray-900 text-center text-xl leading-tight">
                        {getAccountField('@_SubscriberName') || getCreditorName()}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Account Type:</span>
                        <span className="text-gray-900 text-sm">
                          {account['@_AccountType'] || 'Credit Card'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Account #:</span>
                        <span className="text-gray-900 text-sm">{getMaskedAccountNumber()}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Date Opened:</span>
                        <span className="text-gray-900 text-sm">
                          {formatDate(getAccountField('@_AccountOpenedDate'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Payment Status:</span>
                        <span
                          className={`text-sm ${getPaymentStatusStyle(bureauData.experian.status)}`}
                        >
                          {bureauData.experian.status}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Credit Limit:</span>
                        <span className="text-gray-900 text-sm">
                          {formatCurrency(getAccountField('@_CreditLimitAmount'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Balance:</span>
                        <span className="text-gray-900 text-sm">${bureauData.experian.balance}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Monthly Payment:</span>
                        <span className="text-gray-900 text-sm">
                          {formatCurrency(getAccountField('@_MonthlyPaymentAmount'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">High Balance:</span>
                        <span className="text-gray-900 text-sm">
                          {formatCurrency(getAccountField('@_HighBalanceAmount'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Past Due:</span>
                        <span className="text-gray-900 text-sm">
                          {formatCurrency(getAccountField('@_PastDueAmount', '0'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Last Activity:</span>
                        <span className="text-gray-900 text-sm">
                          {formatDate(getAccountField('@_LastActivityDate'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Date Reported:</span>
                        <span className="text-gray-900 text-sm">
                          {formatDate(getAccountField('@_AccountBalanceDate'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Late 30 Days:</span>
                        <span className="text-gray-900 text-sm">
                          {getAccountField('@_Late30DaysCount', '0')}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Late 60 Days:</span>
                        <span className="text-gray-900 text-sm">
                          {getAccountField('@_Late60DaysCount', '0')}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Late 90+ Days:</span>
                        <span className="text-gray-900 text-sm">
                          {getAccountField('@_Late90DaysCount', '0')}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Account Status Date:</span>
                        <span className="text-gray-900 text-sm">
                          {formatDate(getAccountField('@_AccountStatusDate'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Last Payment Date:</span>
                        <span className="text-gray-900 text-sm">
                          {formatDate(getAccountField('@_LastPaymentDate'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Date Closed:</span>
                        <span className="text-gray-900 text-sm">
                          {formatDate(getAccountField('@_AccountClosedDate'))}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-2">
                        <span className="font-medium text-gray-700 text-sm">Terms:</span>
                        <span className="text-gray-900 text-sm">
                          {getAccountField('@_TermsDescription')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700 text-sm">Ownership:</span>
                        <span className="text-gray-900 text-sm">
                          {getAccountField('@_AccountOwnershipType')}
                        </span>
                      </div>

                      {/* Payment History */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Payment History:
                          </span>
                        </div>
                        <PaymentHistoryVisual
                          paymentPattern={
                            account['_PAYMENT_PATTERN']?.['@_Data'] || 'CCCCCCCCCCCCCCCCCCCCCCC'
                          }
                          compact={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bureau Comparison Grid - Full Width */}
        <div className={`grid grid-cols-1 md:grid-cols-3 mb-4 ${isFirstCopy ? 'gap-6' : 'gap-4'}`}>
          {/* TransUnion */}
          <div className="relative">
            <div
              className={`border rounded-lg p-4 ${
                isDisputeSaved
                  ? 'border-3 border-green-500 bg-white'
                  : transUnionStatus === 'Negative' || (accountIsNegative && !transUnionStatus)
                    ? 'border-3 border-red-500 bg-white'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex-between mb-3">
                <h4 className="font-semibold text-black">{getCreditorName()}</h4>
                <Select
                  value={transUnionStatus || (accountIsNegative ? 'Negative' : 'Positive')}
                  onValueChange={setTransUnionStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (transUnionStatus === 'Negative' || (accountIsNegative && !transUnionStatus))
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(transUnionStatus === 'Negative' || (accountIsNegative && !transUnionStatus)) && <AlertTriangle className="w-3 h-3" />}
                      {(transUnionStatus === 'Positive' || (!accountIsNegative && !transUnionStatus)) && <ThumbsUp className="w-3 h-3 text-green-600 ml-1" />}
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
                {/* Basic 5 lines - always visible */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">{account['@_AccountType'] || 'Credit Card'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account #:</span>
                  <span className="font-medium">{getMaskedAccountNumber()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium">${bureauData.transUnion.balance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${getPaymentStatusStyle(bureauData.transUnion.status)}`}
                  >
                    {bureauData.transUnion.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="font-medium">{bureauData.transUnion.lastUpdated}</span>
                </div>

                {/* Comprehensive details - visible when shouldShowDetails is true */}
                {shouldShowDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Opened:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountOpenedDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Limit:</span>
                      <span className="font-medium">
                        {formatCurrency(getAccountField('@_CreditLimitAmount'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Payment:</span>
                      <span className="font-medium">
                        {formatCurrency(getAccountField('@_MonthlyPaymentAmount'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">High Balance:</span>
                      <span className="font-medium">
                        {formatCurrency(getAccountField('@_HighBalanceAmount'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Past Due:</span>
                      <span className="font-medium">
                        {formatCurrency(getAccountField('@_PastDueAmount', '0'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Activity:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_LastActivityDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Reported:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountBalanceDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Payment Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(getAccountField('@_ActualPaymentAmount'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Ownership:</span>
                      <span className="font-medium">
                        {getAccountField('@_AccountOwnershipType')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creditor Classification:</span>
                      <span className="font-medium">{getAccountField('@_CreditBusinessType')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms Duration:</span>
                      <span className="font-medium">
                        {getAccountField('@_TermsMonthsCount')} months
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms Frequency:</span>
                      <span className="font-medium">{getAccountField('@_TermsFrequencyType')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Status Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountStatusDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Payment Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_LastPaymentDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Closed Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountClosedDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Verified:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_CreditLiabilityAccountReportedDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms:</span>
                      <span className="font-medium">{getAccountField('@_TermsDescription')}</span>
                    </div>

                    {/* Payment History for TransUnion */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="mb-2">
                        <span className="text-gray-600 text-xs font-medium">Payment History:</span>
                      </div>
                      <PaymentHistoryVisual
                        paymentPattern={
                          account['_PAYMENT_PATTERN']?.['@_Data'] || 'CCCCCCCCCCCCCCCCCCCCCCC'
                        }
                        compact={true}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Equifax */}
          <div>
            {/* Mobile Bureau Header - Above Box */}
            <div className="block md:hidden mb-2">
              <h3 className="font-bold text-red-600 text-left">Equifax</h3>
            </div>
            <div
              className={`border rounded-lg p-4 ${
                isDisputeSaved
                  ? 'border-3 border-green-500 bg-white'
                  : equifaxStatus === 'Negative' || (accountIsNegative && !equifaxStatus)
                    ? 'border-3 border-red-500 bg-white'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex-between mb-3">
                <h4 className="font-semibold text-black">{getCreditorName()}</h4>
                <Select
                  value={equifaxStatus || (accountIsNegative ? 'Negative' : 'Positive')}
                  onValueChange={setEquifaxStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (equifaxStatus === 'Negative' || (accountIsNegative && !equifaxStatus))
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(equifaxStatus === 'Negative' || (accountIsNegative && !equifaxStatus)) && <AlertTriangle className="w-3 h-3" />}
                      {(equifaxStatus === 'Positive' || (!accountIsNegative && !equifaxStatus)) && <ThumbsUp className="w-3 h-3 text-green-600 ml-1" />}
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
                {/* Basic 5 lines - always visible */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">{account['@_AccountType'] || 'Credit Card'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account #:</span>
                  <span className="font-medium">{getMaskedAccountNumber()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium">${bureauData.equifax.balance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${getPaymentStatusStyle(bureauData.equifax.status)}`}
                  >
                    {bureauData.equifax.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="font-medium">{bureauData.equifax.lastUpdated}</span>
                </div>

                {/* Comprehensive details - only visible when shouldShowDetails is true */}
                {shouldShowDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Opened:</span>
                      <span className="font-medium">{account['@_AccountOpenedDate'] || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Limit:</span>
                      <span className="font-medium">
                        ${account['@_CreditLimitAmount'] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Payment:</span>
                      <span className="font-medium">
                        ${account['@_MonthlyPaymentAmount'] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">High Balance:</span>
                      <span className="font-medium">
                        ${account['@_HighBalanceAmount'] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Past Due:</span>
                      <span className="font-medium">${account['@_PastDueAmount'] || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Activity:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_LastActivityDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Reported:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountBalanceDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Payment Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(getAccountField('@_ActualPaymentAmount'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Ownership:</span>
                      <span className="font-medium">
                        {getAccountField('@_AccountOwnershipType')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creditor Classification:</span>
                      <span className="font-medium">{getAccountField('@_CreditBusinessType')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms Duration:</span>
                      <span className="font-medium">
                        {getAccountField('@_TermsMonthsCount')} months
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms Frequency:</span>
                      <span className="font-medium">{getAccountField('@_TermsFrequencyType')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Status Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountStatusDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Payment Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_LastPaymentDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Closed Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountClosedDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Verified:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_CreditLiabilityAccountReportedDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms:</span>
                      <span className="font-medium">{getAccountField('@_TermsDescription')}</span>
                    </div>

                    {/* Payment History for Equifax */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="mb-2">
                        <span className="text-gray-600 text-xs font-medium">Payment History:</span>
                      </div>
                      <PaymentHistoryVisual
                        paymentPattern={
                          account['_PAYMENT_PATTERN']?.['@_Data'] || 'CCCCCCCCCCCCCCCCCCCCCCC'
                        }
                        compact={true}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Experian */}
          <div>
            {/* Mobile Bureau Header - Above Box */}
            <div className="block md:hidden mb-2">
              <h3 className="font-bold text-blue-800 text-left">Experian</h3>
            </div>
            <div
              className={`border rounded-lg p-4 ${
                isDisputeSaved
                  ? 'border-3 border-green-500 bg-white'
                  : experianStatus === 'Negative' || (accountIsNegative && !experianStatus)
                    ? 'border-3 border-red-500 bg-white'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex-between mb-3">
                <h4 className="font-semibold text-black">{getCreditorName()}</h4>
                <Select
                  value={experianStatus || (accountIsNegative ? 'Negative' : 'Positive')}
                  onValueChange={setExperianStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (experianStatus === 'Negative' || (accountIsNegative && !experianStatus))
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(experianStatus === 'Negative' || (accountIsNegative && !experianStatus)) && <AlertTriangle className="w-3 h-3" />}
                      {(experianStatus === 'Positive' || (!accountIsNegative && !experianStatus)) && <ThumbsUp className="w-3 h-3 text-green-600 ml-1" />}
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
                {/* Basic 5 lines - always visible */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">{account['@_AccountType'] || 'Credit Card'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account #:</span>
                  <span className="font-medium">{getMaskedAccountNumber()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium">${bureauData.experian.balance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${getPaymentStatusStyle(bureauData.experian.status)}`}
                  >
                    {bureauData.experian.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="font-medium">{bureauData.experian.lastUpdated}</span>
                </div>

                {/* Comprehensive details - only visible when shouldShowDetails is true */}
                {shouldShowDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Opened:</span>
                      <span className="font-medium">{account['@_AccountOpenedDate'] || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Limit:</span>
                      <span className="font-medium">
                        ${account['@_CreditLimitAmount'] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Payment:</span>
                      <span className="font-medium">
                        ${account['@_MonthlyPaymentAmount'] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">High Balance:</span>
                      <span className="font-medium">
                        ${account['@_HighBalanceAmount'] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Past Due:</span>
                      <span className="font-medium">${account['@_PastDueAmount'] || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Activity:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_LastActivityDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Reported:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountBalanceDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Payment Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(getAccountField('@_ActualPaymentAmount'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Ownership:</span>
                      <span className="font-medium">
                        {getAccountField('@_AccountOwnershipType')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creditor Classification:</span>
                      <span className="font-medium">{getAccountField('@_CreditBusinessType')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms Duration:</span>
                      <span className="font-medium">
                        {getAccountField('@_TermsMonthsCount')} months
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms Frequency:</span>
                      <span className="font-medium">{getAccountField('@_TermsFrequencyType')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Status Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountStatusDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Payment Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_LastPaymentDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Closed Date:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_AccountClosedDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Verified:</span>
                      <span className="font-medium">
                        {formatDate(getAccountField('@_CreditLiabilityAccountReportedDate'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terms:</span>
                      <span className="font-medium">{getAccountField('@_TermsDescription')}</span>
                    </div>

                    {/* Payment History for Experian */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="mb-2">
                        <span className="text-gray-600 text-xs font-medium">Payment History:</span>
                      </div>
                      <PaymentHistoryVisual
                        paymentPattern={
                          account['_PAYMENT_PATTERN']?.['@_Data'] || 'CCCCCCCCCCCCCCCCCCCCCCC'
                        }
                        compact={true}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Show All Info Toggle Button - Always visible unless individual card is collapsed */}
        <div className="flex justify-center -mt-2 mb-0 relative w-full">
            <button
            onClick={() => {
              // Toggle based on current display state
              if (shouldShowDetails) {
                // Currently showing details, so collapse
                setShowAccountDetails(false);
              } else {
                // Currently collapsed, so expand
                setShowAccountDetails(true);
              }
            }}
            className={`flex items-center gap-2 transition-colors text-sm font-medium ${isDisputeSaved ? 'text-green-700 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'}`}
          >
            {/* For all accounts, show text with arrow */}
            <span>{shouldShowDetails ? 'Show Less' : 'Show More'}</span>
            <svg
              className={`w-4 h-4 transition-transform ${shouldShowDetails ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            </button>
        </div>



        {/* AI Violations Alert (if any) */}
        {aiViolations.length > 0 && (
          <div style={{ marginTop: '-6px' }}>
            <button
              onClick={() => {
                setShowViolations(!showViolations);
                if (!showViolations) {
                  setShowGuidedHelp(false); // Close dispute suggestions when opening violations
                }
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 p-2 rounded-md transition-colors font-medium"
            >
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">
                View {aiViolations.length} Compliance Violations
                {getViolationCountText(true)}
              </span>
              <span className="md:hidden font-medium">
                View {aiViolations.length} Violations
                {getViolationCountText(false)}
              </span>
              {showViolations ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Expanded Violations List */}
            {showViolations && (
              <div
                className="-mt-2 space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3"
                style={{ marginTop: '-6px' }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={() => setShowViolations(!showViolations)}
                    className="text-left hover:bg-blue-100 rounded-md p-2 transition-colors"
                  >
                    <h4 className="text-sm font-medium text-gray-900">Detected Violations</h4>
                  </button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      addAllViolations(e);
                    }}
                    variant="outline"
                    size="sm"
                    className="px-4 py-2 text-sm font-black bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-blue-600 hover:border-blue-700 min-w-[140px] flex items-center whitespace-nowrap"
                  >
                    <Zap className="w-3 h-3 mr-1 flex-shrink-0" />
                    Use All {aiViolations.length}
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  {aiViolations.map((violation, index) => (
                    <div key={index} className="p-3 bg-white rounded border border-gray-200">
                      {/* Desktop Layout */}
                      <div className="hidden md:flex-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                violation.includes('Metro 2')
                                  ? 'bg-blue-200 text-blue-800 border border-blue-300'
                                  : 'bg-red-200 text-red-800 border border-red-300'
                              }`}
                              style={{ fontSize: '10px' }}
                            >
                              {violation.includes('Metro 2') ? 'Metro 2' : 'FCRA'}
                            </span>
                            <span className="text-sm font-medium">{violation}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedViolations.includes(violation)) {
                              removeViolationFromDispute(violation);
                            } else {
                              addViolationToDispute(violation);
                            }
                          }}
                          className={
                            selectedViolations.includes(violation)
                              ? 'bg-blue-50 border-blue-300'
                              : 'border-gray-300'
                          }
                        >
                          {selectedViolations.includes(violation) ? 'Added' : 'Add to Dispute'}
                        </Button>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                              violation.includes('Metro 2')
                                ? 'bg-blue-200 text-blue-800 border border-blue-300'
                                : 'bg-red-200 text-red-800 border border-red-300'
                            }`}
                            style={{ fontSize: '10px' }}
                          >
                            {violation.includes('Metro 2') ? 'M-2' : 'FCRA'}
                          </span>
                          <span className="text-sm font-medium">{violation}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedViolations.includes(violation)) {
                              removeViolationFromDispute(violation);
                            } else {
                              addViolationToDispute(violation);
                            }
                          }}
                          className={`w-full border-2 font-black ${selectedViolations.includes(violation) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600'}`}
                        >
                          {selectedViolations.includes(violation) ? 'Added' : 'Add to Dispute'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guided Help Section - Optional suggestions */}
        {hasAnyNegative && aiViolations.length > 0 && aiScanCompleted && (
          <div className="mb-4" style={{ marginTop: '-2px' }}>
            <button
              onClick={() => {
                setShowGuidedHelp(!showGuidedHelp);
                if (!showGuidedHelp) {
                  setShowViolations(false); // Close violations when opening dispute suggestions
                }
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 p-2 rounded-md transition-colors font-medium"
            >
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span>View AI Dispute Suggestions</span>
              {showGuidedHelp ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Expanded Guided Help - Simplified 3 combinations */}
            {showGuidedHelp && (
              <div
                className="space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3"
                style={{ marginTop: '-2px' }}
              >
                <div className="mb-3 flex-between">
                  <button
                    onClick={() => setShowGuidedHelp(!showGuidedHelp)}
                    className="flex-1 text-left hover:bg-blue-100 rounded-md p-2 transition-colors mr-2"
                  >
                    <h4 className="text-sm font-medium text-gray-900">AI Dispute Suggestions</h4>
                  </button>
                  <button
                    onClick={() => setShowGuidedHelp(false)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                    aria-label="Close suggestions"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {getBestPracticeCombinations().map((combination, index) => (
                    <div key={index} className="p-3 bg-white rounded border border-gray-200">
                      {/* Desktop Layout */}
                      <div className="hidden md:flex-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 border border-blue-200"
                              style={{ fontSize: '10px' }}
                            >
                              AI Suggestion
                            </span>
                            <span className="text-sm font-medium">{combination.title}</span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>
                              <strong>Reason:</strong> {combination.reason}
                            </div>
                            <div>
                              <strong>Instruction:</strong> {combination.instruction}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            applyBestPracticeCombination(combination, index, e);
                          }}
                          className={
                            selectedSuggestionIndex === index
                              ? 'bg-blue-50 border-blue-300'
                              : 'border-gray-300'
                          }
                        >
                          {selectedSuggestionIndex === index ? 'Added' : 'Add to Dispute'}
                        </Button>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0 bg-blue-200 text-blue-800 border border-blue-300"
                            style={{ fontSize: '10px' }}
                          >
                            AI Suggestion
                          </span>
                          <span className="text-sm font-medium">{combination.title}</span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1 mb-3">
                          <div>
                            <strong>Reason:</strong> {combination.reason}
                          </div>
                          <div>
                            <strong>Instruction:</strong> {combination.instruction}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            applyBestPracticeCombination(combination, index, e);
                          }}
                          className={`w-full border-2 font-black ${selectedSuggestionIndex === index ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600'}`}
                        >
                          {selectedSuggestionIndex === index ? 'Added' : 'Add to Dispute'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-500 italic mt-3 pt-2 border-t border-blue-200">
                  {selectedSuggestionIndex !== null ? (
                    <div className="flex-between">
                      <span>Suggestion applied to dispute form below.</span>
                      <button
                        onClick={() => {
                          setSelectedSuggestionIndex(null);
                          setCustomReason('');
                          setCustomInstruction('');
                          setShowCustomReasonField(false);
                          setShowCustomInstructionField(false);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                      >
                        Choose different suggestion
                      </button>
                    </div>
                  ) : (
                    'Click any option above to auto-fill both reason and instruction fields, or choose your own options below.'
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Light grey divider above dispute section for negative accounts */}
      {hasAnyNegative && <div className="border-t border-gray-200 mt-2 mb-3 mx-4 md:mx-6"></div>}

      {/* Dispute Section (only for negative accounts) - Moved outside CardContent for edge-to-edge layout */}
      {hasAnyNegative && (
        <div className={`${isDisputeSaved ? 'bg-green-50' : 'bg-rose-50'}`}>
          <div className="px-4 md:px-6 py-6">
            <div
              className="flex items-center gap-3 mb-4"
              data-step="2"
              id={`dispute-step-${accountUniqueId}`}
            >
              {isDisputeSaved ? (
                <span className="text-green-600 text-lg font-bold">✓</span>
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">2</div>
              )}
              <span className={`font-bold ${isDisputeSaved ? 'text-green-700' : ''}`}>
                {isDisputeSaved ? 'Dispute Saved' : 'Create Dispute'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Reason Selection */}
              <div>
                <div>
                  {!showCustomReasonField && (
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Dispute Reason</label>
                      {isTypingReason && (
                        <div className="flex items-center text-blue-600 text-sm">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                          AI Writing...
                        </div>
                      )}
                    </div>
                  )}
                  <div className="relative">
                    {!isTypingReason && !showCustomReasonField ? (
                      <select
                        value={selectedReason || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Reset dispute saved state when dropdown is changed
                          if (isDisputeSaved) {
                            setIsDisputeSaved(false);
                            // Also reset the parent component saved state
                            const accountId =
                              account['@CreditLiabilityID'] ||
                              account['@_AccountNumber'] ||
                              account['@_AccountIdentifier'] ||
                              account['@_SubscriberCode'] ||
                              'unknown';
                            onDisputeReset?.(accountId);
                          }
                          if (value === '__custom__') {
                            setShowCustomReasonField(true);
                            setSelectedReason('');
                            setCustomReason('');
                          } else if (value !== '') {
                            // Clear all custom state and use dropdown selection
                            setCustomReason(value);
                            setSelectedReason(value);
                            setShowCustomReasonField(false);
                            setIsTypingReason(false);
                            setTimeout(() => checkFormCompletionAndShowArrow(value), 300);
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
                    ) : (
                      <div>
                        <div className="flex-between mb-2 min-h-[20px]">
                          <label className="text-sm font-medium">Dispute Reason</label>
                          <button
                            onClick={() => {
                              const accountId =
                                account['@CreditLiabilityID'] ||
                                account['@_AccountNumber'] ||
                                account['@_AccountIdentifier'] ||
                                account['@_SubscriberCode'] ||
                                'unknown';
                              setCustomReason('');
                              setSelectedReason('');
                              setSelectedViolations([]);
                              setHasAiGeneratedText(false);
                              setShowCustomReasonField(false);
                              // Reset the entire card to unsaved state
                              setIsDisputeSaved(false);
                              setIsCollapsed(false);
                              onHeaderReset?.();
                              // Remove from parent's saved disputes
                              onDisputeReset?.(accountId);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Reset & choose different reason
                          </button>
                        </div>
                        {isTypingReason ? (
                          <div className="relative">
                            <div className="absolute -top-7 right-0 flex items-center gap-1 text-blue-600 text-xs z-10">
                              <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                              <span>AI typing</span>
                            </div>
                            <div
                              className="w-full p-3 border-red-500 border rounded-md bg-red-50 text-gray-900"
                              style={{
                                minHeight: '40px',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.5',
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                              }}
                            >
                              {customReason || 'AI is typing...'}
                            </div>
                          </div>
                        ) : (
                          <textarea
                            value={customReason || ''}
                            onChange={(e) => {
                              if (!isTypingReason) {
                                setCustomReason(e.target.value);
                                // Reset dispute saved state when text is modified
                                if (isDisputeSaved) {
                                  setIsDisputeSaved(false);
                                }
                              }
                            }}
                            placeholder="Enter your dispute reason..."
                            className={`w-full border rounded-md p-3 text-sm focus:outline-none resize-none mobile-resizable dispute-reason-field ${hasAnyNegative ? (isDisputeSaved ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-gray-300 focus:border-gray-400'}`}
                            rows={Math.max(1, Math.ceil((customReason || '').length / 80))}
                            style={{
                              minHeight: '40px',
                              height: 'auto',
                            }}
                          />
                        )}
                        {false && customReason.trim() && !isTypingReason && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                saveTemplateMutation.mutate({
                                  type: 'reason',
                                  text: customReason.trim(),
                                  category: 'accounts',
                                });
                              }}
                              disabled={saveTemplateMutation.isPending}
                              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-xs flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              {saveTemplateMutation.isPending ? 'Saving...' : 'Save for future use'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions Selection */}
              <div>
                <div>
                  {!showCustomInstructionField && (
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Dispute Instruction</label>
                      {isTypingInstruction && (
                        <div className="flex items-center text-blue-600 text-sm">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                          AI Writing...
                        </div>
                      )}
                    </div>
                  )}
                  <div className="relative">
                    {!isTypingInstruction && !showCustomInstructionField ? (
                      <select
                        value={selectedInstruction || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Reset dispute saved state when dropdown is changed
                          if (isDisputeSaved) {
                            setIsDisputeSaved(false);
                            // Also reset the parent component saved state
                            const accountId =
                              account['@CreditLiabilityID'] ||
                              account['@_AccountNumber'] ||
                              account['@_AccountIdentifier'] ||
                              account['@_SubscriberCode'] ||
                              'unknown';
                            onDisputeReset?.(accountId);
                            onHeaderReset?.();
                          }
                          if (value === '__custom__') {
                            setShowCustomInstructionField(true);
                            setSelectedInstruction('');
                            setCustomInstruction('');
                          } else if (value !== '') {
                            // Clear all custom state and use dropdown selection
                            setCustomInstruction(value);
                            setSelectedInstruction(value);
                            setShowCustomInstructionField(false);
                            setIsTypingInstruction(false);
                            setTimeout(
                              () => checkFormCompletionAndShowArrow(undefined, value),
                              300
                            );
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
                    ) : (
                      <div>
                        <div className="flex-between mb-2 min-h-[20px]">
                          <label className="text-sm font-medium">Dispute Instruction</label>
                          <button
                            onClick={() => {
                              const accountId =
                                account['@CreditLiabilityID'] ||
                                account['@_AccountNumber'] ||
                                account['@_AccountIdentifier'] ||
                                account['@_SubscriberCode'] ||
                                'unknown';
                              setCustomInstruction('');
                              setSelectedInstruction('');
                              setShowCustomInstructionField(false);
                              // Reset the entire card to unsaved state
                              setIsDisputeSaved(false);
                              setIsCollapsed(false);
                              onHeaderReset?.();
                              // Remove from parent's saved disputes
                              onDisputeReset?.(accountId);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Reset & choose different instruction
                          </button>
                        </div>
                        {isTypingInstruction ? (
                          <div className="relative">
                            <div className="absolute -top-7 right-0 flex items-center gap-1 text-blue-600 text-xs z-10">
                              <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                              <span>AI typing</span>
                            </div>
                            <div
                              className="w-full p-3 border-red-500 border rounded-md bg-red-50 text-gray-900"
                              style={{
                                minHeight: '60px',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.5',
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                              }}
                            >
                              {customInstruction || 'AI is typing...'}
                            </div>
                          </div>
                        ) : (
                          <textarea
                            value={customInstruction || ''}
                            onChange={(e) => {
                              if (!isTypingInstruction) {
                                setCustomInstruction(e.target.value);
                                // Reset dispute saved state when text is modified
                                if (isDisputeSaved) {
                                  setIsDisputeSaved(false);
                                }
                              }
                            }}
                            placeholder="Enter your dispute instruction..."
                            className={`w-full border rounded-md p-3 text-sm focus:outline-none resize-none mobile-resizable dispute-instruction-field ${hasAnyNegative ? (isDisputeSaved ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-gray-300 focus:border-gray-400'}`}
                            rows={2}
                            style={{
                              minHeight: '60px',
                            }}
                          />
                        )}
                        {false && customInstruction.trim() && !isTypingInstruction && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                saveTemplateMutation.mutate({
                                  type: 'instruction',
                                  text: customInstruction.trim(),
                                  category: 'accounts',
                                });
                              }}
                              disabled={saveTemplateMutation.isPending}
                              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-xs flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              {saveTemplateMutation.isPending ? 'Saving...' : 'Save for future use'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 justify-between items-center pt-2">
                {hasAnyNegative && !isDisputeSaved && !showGuideArrow ? (
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
                  {/* Flying Arrow Guide */}
                  {showGuideArrow && (
                    <div
                      className="absolute right-full top-1/2 transform -translate-y-1/2 z-50 pr-2 pointer-events-none"
                      style={{ width: 'calc(100vw - 160px)', left: 'calc(-100vw + 140px)' }}
                    >
                      <div className="flex items-center animate-fly-arrow">
                        <div className="w-16 h-1 bg-blue-600"></div>
                        <div className="w-0 h-0 border-l-[10px] border-t-[6px] border-b-[6px] border-l-blue-600 border-t-transparent border-b-transparent"></div>
                      </div>
                    </div>
                  )}
                  {isDisputeSaved ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center mr-1">
                      <ThickCheckIcon className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-1">3</div>
                  )}
                  <Button
                    disabled={!isFormComplete()}
                    onClick={() => {
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
                      
                      // Original save logic continues below

                      // If typing is in progress, complete it immediately before saving
                      if (isTypingReason || isTypingInstruction) {
                        // Complete any ongoing typing animations immediately
                        if (isTypingReason) {
                          setIsTypingReason(false);
                          // The auto-typing should have the complete reason in customReason
                        }

                        if (isTypingInstruction) {
                          setIsTypingInstruction(false);
                          // The auto-typing should have the complete instruction in customInstruction
                        }

                        // Wait a brief moment for state to update before proceeding
                        setTimeout(() => {
                          proceedWithAccountSave();
                        }, 50);
                        return;
                      }

                      proceedWithAccountSave();

                      function proceedWithAccountSave() {
                        // Force complete text values when auto-typing was used
                        const finalReason =
                          selectedViolations.length > 0 || showCustomReasonField
                            ? customReason.trim()
                            : selectedReason.trim();
                        const finalInstruction =
                          selectedViolations.length > 0 || showCustomInstructionField
                            ? customInstruction.trim()
                            : selectedInstruction.trim();

                        if (!finalReason || !finalInstruction) {
                          // Add red glow to incomplete fields
                          if (!finalReason) {
                            const reasonField = document.querySelector('.dispute-reason-field');
                            if (reasonField) {
                              reasonField.classList.add(
                                'ring-4',
                                'ring-red-400',
                                'ring-opacity-75'
                              );
                              setTimeout(() => {
                                reasonField.classList.remove(
                                  'ring-4',
                                  'ring-red-400',
                                  'ring-opacity-75'
                                );
                              }, 2000);
                            }
                          }

                          if (!finalInstruction) {
                            const instructionField = document.querySelector(
                              '.dispute-instruction-field'
                            );
                            if (instructionField) {
                              instructionField.classList.add(
                                'ring-4',
                                'ring-red-400',
                                'ring-opacity-75'
                              );
                              setTimeout(() => {
                                instructionField.classList.remove(
                                  'ring-4',
                                  'ring-red-400',
                                  'ring-opacity-75'
                                );
                              }, 2000);
                            }
                          }

                          return;
                        }

                        // Set dispute as saved first to show green feedback
                        setIsDisputeSaved(true);

                        // Notify parent component immediately for state tracking
                        if (onDisputeSaved) {
                          const accountId =
                            account['@CreditLiabilityID'] ||
                            account['@_AccountNumber'] ||
                            account['@_AccountIdentifier'] ||
                            account['@_SubscriberCode'] ||
                            'unknown';
                          onDisputeSaved(accountId, {
                            reason: finalReason,
                            instruction: finalInstruction,
                            violations: selectedViolations,
                          });
                        }

                        // Start choreography with proper isolation to negative accounts only
                        executeNegativeAccountChoreography();

                        // Negative Account Choreography - properly isolated
                        async function executeNegativeAccountChoreography() {
                          // Helper function for delays
                          const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                          
                          // Current account identification
                          const currentAccountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'] || account['@_SubscriberCode'] || 'unknown';
                          const currentCardElement = document.querySelector(`[data-account-id="${currentAccountId}"]`);
                          
                          // Wait for the saved state to be fully applied
                          await delay(100);
                          
                          // Find all negative account cards that still need disputes (not saved)
                          const allNegativeAccountCards = Array.from(document.querySelectorAll('[data-account-id]'));
                          const unsavedNegativeAccounts = allNegativeAccountCards.filter(card => {
                            const isPinkCard = card.classList.contains('bg-red-50') || card.querySelector('.bg-red-50');
                            const hasGreenSaved = card.querySelector('.bg-green-600, .text-green-600, .border-green-500');
                            return isPinkCard && !hasGreenSaved;
                          });
                          
                          // Check if this is the last negative account to be saved
                          const isLastNegativeAccount = unsavedNegativeAccounts.length === 0;
                          
                          if (isLastNegativeAccount) {
                            // LAST NEGATIVE ACCOUNT: Comprehensive sequence
                            console.log('Executing last negative account choreography');
                            
                            // Removed scroll behavior to prevent continuous auto-scroll loops
                            
                            // Step 2: 0.5s pause
                            await delay(500);
                            
                            // Step 3: Collapse current card and trigger section collapse
                            setIsCollapsed(true);
                            
                            // Step 4: 0.5s pause
                            await delay(500);
                            
                            // Removed scroll behavior to prevent continuous auto-scroll loops
                            
                          } else {
                            // REGULAR NEGATIVE ACCOUNT: Standard sequence
                            console.log('Executing regular negative account choreography');
                            
                            // Removed scroll behavior to prevent continuous auto-scroll loops
                            
                            // Step 2: 0.5s pause
                            await delay(500);
                            
                            // Step 3: Collapse current card
                            setIsCollapsed(true);
                            
                            // Step 4: 0.5s pause
                            await delay(500);
                            
                            // Removed scroll behavior to prevent continuous auto-scroll loops
                          }
                        }
                      }
                    }}
                    className={`text-white rounded-md font-medium transition-colors duration-200 flex items-center justify-center px-4 py-2 w-[190px] h-10 ${
                      isDisputeSaved
                        ? 'bg-green-600 hover:bg-green-700'
                        : getButtonStyling()
                    }`}
                  >
                    {isDisputeSaved ? (
                      <>
                        <span className="text-white text-sm mr-2">✓</span>
                        <span className="hidden md:inline">Dispute Saved</span>
                        <span className="md:hidden">Dispute Saved</span>
                      </>
                    ) : (
                      'Save Dispute and Continue'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
