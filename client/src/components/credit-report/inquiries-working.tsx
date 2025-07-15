import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Removed useSmoothScrollToNextCard hook to prevent continuous auto-scrolling interference
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronUp, AlertTriangle, ThumbsUp, X, Zap, Lightbulb, Check } from 'lucide-react';
import { ThickCheckIcon } from '@/components/ui/thick-check-icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InquiriesProps {
  creditData: any;
  onDisputeSaved?: (disputeData?: {
    reason: string;
    instruction: string;
    selectedItems: { [key: string]: boolean };
    isRecentInquiries?: boolean;
  }) => void;
  onHeaderReset?: (inquiryType?: 'older' | 'recent') => void;
  initialDisputeData?: {
    reason: string;
    instruction: string;
    selectedItems: { [key: string]: boolean };
  } | null;
  forceExpanded?: boolean;
  showOlderOnly?: boolean;
  hideOlderInquiries?: boolean;
  onOlderInquiriesSaved?: (saved: boolean) => void;
  onRecentInquiriesSaved?: (saved: boolean) => void;
  onRecentInquiryDisputeSaved?: (disputeData?: {
    selectedInquiries: Array<{ id: string; bureau: string; creditor: string }>;
    reason: string;
    instruction: string;
  }) => void;
  onOlderInquiryDisputeSaved?: (disputeData?: {
    selectedInquiries: Array<{ id: string; bureau: string; creditor: string }>;
    reason: string;
    instruction: string;
  }) => void;
  initialRecentSelections?: Array<{ id: string; bureau: string; creditor: string }>;
  initialOlderSelections?: Array<{ id: string; bureau: string; creditor: string }>;
  initialRecentDisputeData?: {
    reason: string;
    instruction: string;
    selectedInquiries: string[];
  } | null;
  initialOlderDisputeData?: {
    reason: string;
    instruction: string;
    selectedInquiries: string[];
  } | null;
  aiViolations?: { [inquiryId: string]: string[] };
  aiSuggestions?: { [inquiryId: string]: string[] };
  aiScanCompleted?: boolean;
  recentInquiriesCollapsed?: boolean;
  setRecentInquiriesCollapsed?: (collapsed: boolean) => void;
  onOlderExpand?: () => void;
  // Separate choreography flags for each section
  isRecentInquiriesChoreographyActive?: boolean;
  isOlderInquiriesChoreographyActive?: boolean;
  // Auto-collapse completion flags
  olderInquiriesAutoCollapseComplete?: boolean;
  recentInquiriesAutoCollapseComplete?: boolean;
}

export function Inquiries({
  creditData,
  onDisputeSaved,
  onHeaderReset,
  initialDisputeData,
  forceExpanded,
  showOlderOnly,
  hideOlderInquiries,
  recentInquiriesCollapsed = true,
  setRecentInquiriesCollapsed,
  onOlderInquiriesSaved,
  onRecentInquiriesSaved,
  onRecentInquiryDisputeSaved,
  onOlderInquiryDisputeSaved,
  initialRecentSelections = [],
  initialOlderSelections = [],
  initialRecentDisputeData = null,
  initialOlderDisputeData = null,
  aiViolations = {},
  aiSuggestions = {},
  aiScanCompleted = false,
  onOlderExpand,
  isRecentInquiriesChoreographyActive = false,
  isOlderInquiriesChoreographyActive = false,
  olderInquiriesAutoCollapseComplete = false,
  recentInquiriesAutoCollapseComplete = false,
}: InquiriesProps): JSX.Element {
  console.log('[INQ] aiViolations in props →', aiViolations);
  // Removed scrollToSection hook to prevent continuous auto-scrolling interference
  const recentInquiriesListRef = useRef<HTMLDivElement>(null);
  const [showOlderInquiries, setShowOlderInquiries] = useState(false);
  // Recent Inquiries controlled by parent state - show when not collapsed
  const effectiveShowRecentInquiries = !recentInquiriesCollapsed;
  
  // Initialize older inquiry selections from props
  const [selectedOlderInquiries, setSelectedOlderInquiries] = useState<{ [key: string]: boolean }>(() => {
    if (initialOlderDisputeData && initialOlderDisputeData.selectedInquiries) {
      return initialOlderDisputeData.selectedInquiries.reduce((acc, item) => ({ ...acc, [item]: true }), {});
    }
    return initialOlderSelections.reduce((acc, item) => ({ ...acc, [`${item.id}-${item.bureau}`]: true }), {});
  });
  
  // Initialize recent inquiry selections from props
  const [selectedRecentInquiries, setSelectedRecentInquiries] = useState<{ [key: string]: boolean }>(() => {
    if (initialRecentDisputeData && initialRecentDisputeData.selectedInquiries) {
      return initialRecentDisputeData.selectedInquiries.reduce((acc, item) => ({ ...acc, [item]: true }), {});
    }
    if (initialRecentSelections && Array.isArray(initialRecentSelections)) {
      return initialRecentSelections.reduce((acc, item) => ({ ...acc, [`${item.id}-${item.bureau}`]: true }), {});
    }
    return {};
  });
  
  // Initialize dispute reasons and instructions from props
  const [selectedReason, setSelectedReason] = useState(initialOlderDisputeData?.reason || '');
  const [selectedInstruction, setSelectedInstruction] = useState(initialOlderDisputeData?.instruction || '');
  const [selectedRecentReason, setSelectedRecentReason] = useState(initialRecentDisputeData?.reason || '');
  const [selectedRecentInstruction, setSelectedRecentInstruction] = useState(initialRecentDisputeData?.instruction || '');
  
  // Initialize saved states from props
  const [isOlderDisputeSaved, setIsOlderDisputeSaved] = useState(!!initialOlderDisputeData);
  const [isRecentDisputeSaved, setIsRecentDisputeSaved] = useState(!!initialRecentDisputeData);
  const [savedOlderDispute, setSavedOlderDispute] = useState<any>(null);
  const [savedRecentDispute, setSavedRecentDispute] = useState<any>(null);
  const [showOlderGuideArrow, setShowOlderGuideArrow] = useState(false);
  const [showGuideArrow, setShowGuideArrow] = useState(false);
  const [showCombinedCollapsedBox, setShowCombinedCollapsedBox] = useState(false);
  const [hasEverShownCombinedBox, setHasEverShownCombinedBox] = useState(false);
  
  // Completion guards - prevent re-triggering choreography
  const [hasRecentChoreographed, setHasRecentChoreographed] = useState(false);
  const [hasOlderChoreographed, setHasOlderChoreographed] = useState(false);
  const [isTypingReason, setIsTypingReason] = useState(false);
  const [isTypingInstruction, setIsTypingInstruction] = useState(false);
  const [isRecentTypingReason, setIsRecentTypingReason] = useState(false);
  const [isRecentTypingInstruction, setIsRecentTypingInstruction] = useState(false);
  const [showOlderInquiryWarning, setShowOlderInquiryWarning] = useState(false);
  const [showRecentInquiryWarning, setShowRecentInquiryWarning] = useState(false);
  const [pendingInquirySelection, setPendingInquirySelection] = useState<string | null>(null);
  const [pendingRecentInquirySelection, setPendingRecentInquirySelection] = useState<string | null>(
    null
  );
  const [pendingBulkSelection, setPendingBulkSelection] = useState<{
    [key: string]: boolean;
  } | null>(null);
  const [warningInquiryName, setWarningInquiryName] = useState<string>('');
  const [matchingAccountName, setMatchingAccountName] = useState<string>('');

  // New states for sub-card save choreography
  const [olderSaved, setOlderSaved] = useState(false);
  const [recentSaved, setRecentSaved] = useState(false);
  
  // States for AI violations and suggestions toggle - individual inquiry level
  const [showViolationsById, setShowViolationsById] = useState<{ [inquiryId: string]: boolean }>({});
  const [showSuggestionsById, setShowSuggestionsById] = useState<{ [inquiryId: string]: boolean }>({});
  
  // States for overall AI violations and suggestions toggle (below dispute section)
  const [showAllViolations, setShowAllViolations] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Initialize state with saved dispute data and maintain persistence
  useEffect(() => {
    if (initialDisputeData?.isRecentInquiries && !isRecentDisputeSaved) {
      setSelectedRecentInquiries(initialDisputeData.selectedItems || {});
      setSelectedRecentReason(initialDisputeData.reason || '');
      setSelectedRecentInstruction(initialDisputeData.instruction || '');
      setIsRecentDisputeSaved(true);
      setSavedRecentDispute(initialDisputeData);
    } else if (
      initialDisputeData &&
      !initialDisputeData.isRecentInquiries &&
      !isOlderDisputeSaved
    ) {
      setSelectedOlderInquiries(initialDisputeData.selectedItems || {});
      setSelectedReason(initialDisputeData.reason || '');
      setSelectedInstruction(initialDisputeData.instruction || '');
      setIsOlderDisputeSaved(true);
      setSavedOlderDispute(initialDisputeData);
    }
  }, [initialDisputeData]);

  // Maintain saved state when sections are reopened - CRITICAL: Ensure saved disputes persist
  useEffect(() => {
    if (savedOlderDispute && !isOlderDisputeSaved) {
      setSelectedOlderInquiries(savedOlderDispute.selectedItems || {});
      setSelectedReason(savedOlderDispute.reason || '');
      setSelectedInstruction(savedOlderDispute.instruction || '');
      setIsOlderDisputeSaved(true);
    }
  }, [savedOlderDispute, isOlderDisputeSaved]);

  // CRITICAL FIX: Monitor for showOlderInquiries changes and restore saved state immediately
  useEffect(() => {
    if (savedOlderDispute && showOlderInquiries && !isOlderDisputeSaved) {
      setSelectedOlderInquiries(savedOlderDispute.selectedItems || {});
      setSelectedReason(savedOlderDispute.reason || '');
      setSelectedInstruction(savedOlderDispute.instruction || '');
      setIsOlderDisputeSaved(true);
    }
  }, [showOlderInquiries, savedOlderDispute, isOlderDisputeSaved]);

  // AUTO-COLLAPSE BEHAVIOR: Collapse Older Inquiries when saved (ONLY during choreography, ONCE ONLY)
  useEffect(() => {
    if (isOlderDisputeSaved && showOlderInquiries && !isOlderInquiriesChoreographyActive && !hasOlderChoreographed) {
      console.log("→ Older Inquiries Choreography Start");
      setHasOlderChoreographed(true);
      
      // Wait for green feedback display, then collapse
      setTimeout(() => {
        console.log("→ Older Inquiries Auto-Collapse Triggered");
        setShowOlderInquiries(false);
        
        // Notify parent that older inquiries have been saved
        if (onOlderInquiriesSaved) {
          onOlderInquiriesSaved(true);
        }
      }, 1000); // 1 second delay to show green state
    }
    
    // Reset choreography flag when dispute is reset
    if (!isOlderDisputeSaved) {
      setHasOlderChoreographed(false);
    }
  }, [isOlderDisputeSaved, showOlderInquiries, isOlderInquiriesChoreographyActive, hasOlderChoreographed, onOlderInquiriesSaved]);

  useEffect(() => {
    if (savedRecentDispute && !isRecentDisputeSaved) {
      setSelectedRecentInquiries(savedRecentDispute.selectedItems || {});
      setSelectedRecentReason(savedRecentDispute.reason || '');
      setSelectedRecentInstruction(savedRecentDispute.instruction || '');
      setIsRecentDisputeSaved(true);
    }
  }, [savedRecentDispute, isRecentDisputeSaved]);

  // CRITICAL FIX: Monitor for effectiveShowRecentInquiries changes and restore saved state immediately
  useEffect(() => {
    if (savedRecentDispute && effectiveShowRecentInquiries && !isRecentDisputeSaved) {
      setSelectedRecentInquiries(savedRecentDispute.selectedItems || {});
      setSelectedRecentReason(savedRecentDispute.reason || '');
      setSelectedRecentInstruction(savedRecentDispute.instruction || '');
      setIsRecentDisputeSaved(true);
    }
  }, [effectiveShowRecentInquiries, savedRecentDispute, isRecentDisputeSaved]);

  // Helper function to get inquiry data by key from both recent and older
  const getInquiryData = (inquiryKey: string) => {
    const { recent, older } = getInquiriesByBureau();

    // Check recent inquiries first
    for (const bureau in recent) {
      const inquiry = recent[bureau as keyof typeof recent].find(
        (inq: any) => inq.key === inquiryKey
      );
      if (inquiry) {
        return inquiry;
      }
    }

    // Check older inquiries
    for (const bureau in older) {
      const inquiry = older[bureau as keyof typeof older].find(
        (inq: any) => inq.key === inquiryKey
      );
      if (inquiry) {
        return inquiry;
      }
    }

    return null;
  };

  // Helper function to calculate actual bureau disputes for selected inquiries
  const calculateBureauDisputes = (selectedInquiries: { [key: string]: boolean }) => {
    const selectedKeys = Object.keys(selectedInquiries).filter(key => selectedInquiries[key]);
    return selectedKeys.length; // Each selected inquiry = 1 dispute (it only appears in one bureau)
  };

  // Helper function to get total bureau disputes for older inquiries
  const getOlderBureauDisputeCount = () => {
    return calculateBureauDisputes(selectedOlderInquiries);
  };

  // Helper function to get total bureau disputes for recent inquiries
  const getRecentBureauDisputeCount = () => {
    return calculateBureauDisputes(selectedRecentInquiries);
  };

  // Typing animation function for AI Auto-Type Effect
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

  // Helper function to check if inquiry is tied to an open account
  const isInquiryTiedToOpenAccount = (inquiry: any) => {
    if (!creditData?.CREDIT_RESPONSE?.CREDIT_LIABILITY) {
      return false;
    }

    const accounts = Array.isArray(creditData.CREDIT_RESPONSE.CREDIT_LIABILITY)
      ? creditData.CREDIT_RESPONSE.CREDIT_LIABILITY
      : [creditData.CREDIT_RESPONSE.CREDIT_LIABILITY];

    const inquiryName = inquiry['@_Name']?.toLowerCase().trim();
    if (!inquiryName) {
      return false;
    }

    // Check if any account matches the inquiry name (open or closed)
    const hasMatch = accounts.some((account: any, index: number) => {
      const subscriberCode = account['@_SubscriberCode']?.toLowerCase().trim() || '';
      const accountOwner = account['@_AccountOwnershipType']?.toLowerCase().trim() || '';
      const accountStatus = account['@_AccountStatusType'];
      const creditorName = account._CREDITOR?.['@_Name']?.toLowerCase().trim() || '';

      // Check if account is open
      const isOpen = accountStatus !== 'C' && accountStatus !== 'Closed';

      // Enhanced name matching for CITI and other patterns
      let nameMatch = false;

      // Check multiple name fields for matches
      if (inquiryName.includes('citi')) {
        nameMatch =
          subscriberCode.includes('citi') ||
          subscriberCode.includes('citibank') ||
          creditorName.includes('citi') ||
          creditorName.includes('citibank');
      } else {
        // General matching logic
        nameMatch =
          (subscriberCode &&
            (subscriberCode.includes(inquiryName) || inquiryName.includes(subscriberCode))) ||
          (creditorName &&
            (creditorName.includes(inquiryName) || inquiryName.includes(creditorName))) ||
          (accountOwner &&
            (accountOwner.includes(inquiryName) || inquiryName.includes(accountOwner)));
      }

      if (nameMatch) {
        // Return true for any match (open or closed) - let user decide
        return true;
      }

      return false;
    });

    return hasMatch;
  };

  // Helper function to get matching account name for warning modal
  const getMatchingAccountName = (inquiry: any) => {
    if (!creditData?.CREDIT_RESPONSE?.CREDIT_LIABILITY) {
      return '';
    }

    const accounts = Array.isArray(creditData.CREDIT_RESPONSE.CREDIT_LIABILITY)
      ? creditData.CREDIT_RESPONSE.CREDIT_LIABILITY
      : [creditData.CREDIT_RESPONSE.CREDIT_LIABILITY];

    const inquiryName = inquiry['@_Name']?.toLowerCase().trim();
    if (!inquiryName) {
      return '';
    }

    // Find the matching account and return its name
    for (const account of accounts) {
      const subscriberCode = account['@_SubscriberCode']?.toLowerCase().trim() || '';
      const accountOwner = account['@_AccountOwnershipType']?.toLowerCase().trim() || '';
      const accountStatus = account['@_AccountStatusType'];
      const creditorName = account._CREDITOR?.['@_Name']?.toLowerCase().trim() || '';

      // Enhanced name matching for CITI and other patterns
      let nameMatch = false;

      // Check multiple name fields for matches
      if (inquiryName.includes('citi')) {
        nameMatch =
          subscriberCode.includes('citi') ||
          subscriberCode.includes('citibank') ||
          creditorName.includes('citi') ||
          creditorName.includes('citibank');
      } else {
        // General matching logic
        nameMatch =
          (subscriberCode &&
            (subscriberCode.includes(inquiryName) || inquiryName.includes(subscriberCode))) ||
          (creditorName &&
            (creditorName.includes(inquiryName) || inquiryName.includes(creditorName))) ||
          (accountOwner &&
            (accountOwner.includes(inquiryName) || inquiryName.includes(accountOwner)));
      }

      if (nameMatch) {
        // Return the most appropriate name - prioritize creditor name, then subscriber code
        return creditorName || subscriberCode || account['@_SubscriberCode'] || 'Unknown Account';
      }
    }

    return '';
  };



  // Auto-populate fields for older inquiries - SIMPLIFIED
  const autoPopulateOlderFields = async () => {
    const defaultReason = 'Inquiry not authorized by me';
    const defaultInstruction = 'Please remove this unauthorized inquiry immediately';

    // Use AI typing animation for both fields
    await typeText(defaultReason, setSelectedReason, setIsTypingReason, 30);
    
    // Small pause between reason and instruction
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    await typeText(defaultInstruction, setSelectedInstruction, setIsTypingInstruction, 30);
    
    // Show arrow after typing completes
    setTimeout(() => {
      setShowOlderGuideArrow(true);
    }, 200);
  };

  // Auto-populate fields for recent inquiries - with AI typing animation
  const autoPopulateRecentFields = async () => {
    const defaultReason = 'Inquiry not authorized by me';
    const defaultInstruction = 'Please remove this unauthorized inquiry immediately';

    // Use AI typing animation for both fields
    await typeText(defaultReason, setSelectedRecentReason, setIsRecentTypingReason, 30);
    
    // Small pause between reason and instruction
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    await typeText(defaultInstruction, setSelectedRecentInstruction, setIsRecentTypingInstruction, 30);
    
    // Show arrow after typing completes
    setTimeout(() => {
      setShowGuideArrow(true);
      
      // Hide arrow after 4 seconds and restore warning box (matching Personal Information behavior)
      setTimeout(() => {
        setShowGuideArrow(false);
      }, 4000);
    }, 200);
  };

  // Get inquiries data and group by bureau
  const getInquiriesByBureau = () => {
    if (!creditData?.CREDIT_RESPONSE?.CREDIT_INQUIRY) {
      return {
        recent: { TransUnion: [], Equifax: [], Experian: [] },
        older: { TransUnion: [], Equifax: [], Experian: [] },
      };
    }

    const inquiries = creditData.CREDIT_RESPONSE.CREDIT_INQUIRY;
    const inquiryArray = Array.isArray(inquiries) ? inquiries : [inquiries];

    const currentDate = new Date('2025-06-18');
    const cutoffDate = new Date(currentDate);
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);

    const recent = { TransUnion: [] as any[], Equifax: [] as any[], Experian: [] as any[] };
    const older = { TransUnion: [] as any[], Equifax: [] as any[], Experian: [] as any[] };

    inquiryArray.forEach((inquiry, index) => {
      if (inquiry?.['@_Date']) {
        const inquiryDate = new Date(inquiry['@_Date']);
        const key = `inquiry_${index}`;
        const bureau = inquiry.CREDIT_REPOSITORY?.['@_SourceType'] || 'Equifax';

        const inquiryWithKey = { ...inquiry, key };

        const isRecent = inquiryDate >= cutoffDate;

        if (isRecent) {
          if (recent[bureau as keyof typeof recent]) {
            recent[bureau as keyof typeof recent].push(inquiryWithKey);
          }
        } else {
          if (older[bureau as keyof typeof older]) {
            older[bureau as keyof typeof older].push(inquiryWithKey);
          }
        }
      }
    });

    return { recent, older };
  };

  const { recent: recentInquiries, older: olderInquiries } = getInquiriesByBureau();

  // Handle inquiry selection with warning modal
  const toggleOlderInquirySelection = (inquiryKey: string) => {
    const isCurrentlySelected = selectedOlderInquiries[inquiryKey];

    // If selecting (not deselecting), check for account matches first
    if (!isCurrentlySelected) {
      // Get inquiry data from older inquiries
      const { older } = getInquiriesByBureau();
      let inquiryData = null;

      for (const bureau in older) {
        inquiryData = older[bureau as keyof typeof older].find(
          (inq: any) => inq.key === inquiryKey
        );
        if (inquiryData) break;
      }

      // Check if this older inquiry is tied to an open account
      if (inquiryData && isInquiryTiedToOpenAccount(inquiryData)) {
        setWarningInquiryName(inquiryData['@_Name'] || 'this inquiry');
        setMatchingAccountName(getMatchingAccountName(inquiryData));
        setPendingInquirySelection(inquiryKey);
        setShowOlderInquiryWarning(true);
        console.log('📋 Warning Modal Trigger - Inquiry:', inquiryData['@_Name'], 'Matching Account:', getMatchingAccountName(inquiryData));
        return;
      } else {
        setShowOlderInquiryWarning(true);
        setPendingInquirySelection(inquiryKey);
        return;
      }
    }

    // If deselecting, proceed normally and reset saved state if previously saved
    setSelectedOlderInquiries((prev) => {
      const newSelected = { ...prev, [inquiryKey]: false };

      // If no inquiries are selected after this deselection, clear the form
      const hasAnySelected = Object.values(newSelected).some(Boolean);
      if (!hasAnySelected) {
        setSelectedReason('');
        setSelectedInstruction('');
        if (isOlderDisputeSaved) {
          setIsOlderDisputeSaved(false);
          setSavedOlderDispute(null);
          if (onHeaderReset) {
            onHeaderReset('older');
          }
        }
      } else if (isOlderDisputeSaved) {
        // If still has selections but was previously saved, reset saved state
        setIsOlderDisputeSaved(false);
        setSavedOlderDispute(null);
        if (onHeaderReset) {
          onHeaderReset('older');
        }
      }

      return newSelected;
    });
  };

  // Handle warning modal proceed for older inquiries
  const handleOlderWarningProceed = () => {
    setShowOlderInquiryWarning(false);

    if (pendingInquirySelection) {
      // Removed scrollToSection call to prevent continuous auto-scrolling interference

      setSelectedOlderInquiries((prev) => {
        const newSelected = { ...prev, [pendingInquirySelection]: true };

        const wasEmpty = Object.values(prev).every((val) => !val);
        const hasNewSelections = Object.values(newSelected).some(Boolean);

        if (wasEmpty && hasNewSelections && !selectedReason && !selectedInstruction) {
          setTimeout(() => autoPopulateOlderFields(), 100);
        }

        return newSelected;
      });

      setPendingInquirySelection(null);
    }
  };

  // Handle warning modal proceed for recent inquiries
  const handleRecentWarningProceed = () => {
    setShowRecentInquiryWarning(false);
    setMatchingAccountName('');

    if (pendingBulkSelection) {
      // Handle bulk selection after warning
      setSelectedRecentInquiries(pendingBulkSelection);
      
      // Simple scroll to first selected item
      console.log("Select All Score-Impact Items clicked — scrolling to first selected item");
      const selectedInquiries = Object.keys(pendingBulkSelection);
      if (selectedInquiries.length > 0) {
        const firstSelectedElement = document.querySelector(`[data-inquiry-key="${selectedInquiries[0]}"]`);
        if (firstSelectedElement) {
          const rect = firstSelectedElement.getBoundingClientRect();
          const targetY = window.scrollY + rect.top - 20;
          
          window.scrollTo({
            top: targetY,
            behavior: 'smooth'
          });
        }
      }
      
      setPendingBulkSelection(null);

      if (!selectedRecentReason && !selectedRecentInstruction) {
        setTimeout(() => autoPopulateRecentFields(), 200);
      }
    } else if (pendingRecentInquirySelection) {
      // Handle individual selection after warning
      setSelectedRecentInquiries((prev) => {
        const newSelected = { ...prev, [pendingRecentInquirySelection]: true };

        const wasEmpty = Object.values(prev).every((val) => !val);
        const hasNewSelections = Object.values(newSelected).some(Boolean);

        if (wasEmpty && hasNewSelections && !selectedRecentReason && !selectedRecentInstruction) {
          setTimeout(() => autoPopulateRecentFields(), 100);
          
          // Removed scrollToSection call to prevent continuous auto-scrolling interference
        }

        return newSelected;
      });

      setPendingRecentInquirySelection(null);
    }
  };

  const toggleRecentInquirySelection = (inquiryKey: string) => {
    // Check if we're trying to select an inquiry
    const isSelecting = !selectedRecentInquiries[inquiryKey];


    if (isSelecting) {
      // Get inquiry data from recent inquiries
      const { recent } = getInquiriesByBureau();
      let inquiryData = null;

      for (const bureau in recent) {
        inquiryData = recent[bureau as keyof typeof recent].find(
          (inq: any) => inq.key === inquiryKey
        );
        if (inquiryData) break;
      }


      if (inquiryData && isInquiryTiedToOpenAccount(inquiryData)) {
        // Show warning modal for recent inquiries tied to open accounts
        setWarningInquiryName(inquiryData['@_Name'] || 'this inquiry');
        setMatchingAccountName(getMatchingAccountName(inquiryData));
        setPendingRecentInquirySelection(inquiryKey);
        setShowRecentInquiryWarning(true);
        console.log('📋 Warning Modal Trigger - Inquiry:', inquiryData['@_Name'], 'Matching Account:', getMatchingAccountName(inquiryData));
        return;
      }
    }

    setSelectedRecentInquiries((prev) => {
      const newSelected = { ...prev, [inquiryKey]: !prev[inquiryKey] };

      const wasEmpty = Object.values(prev).every((val) => !val);
      const hasNewSelections = Object.values(newSelected).some(Boolean);
      const isSelecting = !prev[inquiryKey];

      // If no inquiries are selected after this change, preserve AI-typed text completely
      if (!hasNewSelections) {
        // Don't clear the form fields to preserve AI-typed content
        // Only reset the saved state
        if (isRecentDisputeSaved) {
          setIsRecentDisputeSaved(false);
          setSavedRecentDispute(null);
          if (onHeaderReset) {
            onHeaderReset('recent');
          }
        }
        // Important: Don't reset the reason/instruction fields here to preserve AI typing
        return newSelected;
      }
      // If selecting after having none selected, trigger autotype and auto-scroll
      else if (
        wasEmpty &&
        hasNewSelections &&
        !selectedRecentReason &&
        !selectedRecentInstruction
      ) {
        setTimeout(() => autoPopulateRecentFields(), 100);
        
        // Auto-scroll to TransUnion name on mobile when selecting recent inquiry
        setTimeout(() => {
          const isMobile = window.innerWidth < 768;
          if (isMobile && isSelecting) {
            const recentHeader = document.querySelector('[data-testid="recent-inquiries-header"]');
            if (recentHeader) {
              const rect = recentHeader.getBoundingClientRect();
              // Find "Select All Score-Impact Items" button and scroll 20px below it
              const button = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent?.includes('Select All Score-Impact Items')
              );
              const targetScrollY = button ? 
                window.pageYOffset + button.getBoundingClientRect().bottom + 20 :
                window.pageYOffset + rect.top + 230;
              // Removed scroll behavior to prevent continuous auto-scroll loops
            }
          }
        }, 500);
      }
      // If modifying selections after being saved, reset saved state
      else if (isRecentDisputeSaved && hasNewSelections) {
        setIsRecentDisputeSaved(false);
        setSavedRecentDispute(null);
        if (onHeaderReset) {
          onHeaderReset('recent');
        }
      }

      return newSelected;
    });
  };

  // Check form completion for arrows - match Personal Information timing exactly
  const checkOlderFormCompletionAndShowArrow = () => {
    // Don't show arrow during typing animation (matching Personal Information behavior)
    if (isTypingReason || isTypingInstruction) {
      return;
    }

    const hasSelectedItems = Object.values(selectedOlderInquiries).some(Boolean);
    const hasReason = selectedReason;
    const hasInstruction = selectedInstruction;

    if (hasSelectedItems && hasReason && hasInstruction && !isOlderDisputeSaved) {
      setShowOlderGuideArrow(true);
      
      // Hide arrow after 4 seconds and restore warning box (matching Personal Information behavior)
      setTimeout(() => {
        setShowOlderGuideArrow(false);
      }, 4000);
    } else {
      setShowOlderGuideArrow(false);
    }
  };

  // Check arrow with explicit values (for when state hasn't updated yet) - matching Personal Information
  const checkOlderFormCompletionAndShowArrowWithValues = (
    reasonText: string,
    instructionText: string
  ) => {
    const hasSelectedItems = Object.values(selectedOlderInquiries).some(Boolean);
    const hasReason = !!reasonText;
    const hasInstruction = !!instructionText;

    if (hasSelectedItems && hasReason && hasInstruction && !isOlderDisputeSaved) {
      setShowOlderGuideArrow(true);
      
      // Hide arrow after 4 seconds and restore warning box (matching Personal Information behavior)
      setTimeout(() => {
        setShowOlderGuideArrow(false);
      }, 4000);
    }
  };

  const checkRecentFormCompletionAndShowArrow = () => {
    // Don't show arrow during typing animation (matching Personal Information and Older Inquiries behavior)
    if (isRecentTypingReason || isRecentTypingInstruction) {
      return;
    }

    const hasReason = selectedRecentReason;
    const hasInstruction = selectedRecentInstruction;
    const hasSelectedItems = Object.values(selectedRecentInquiries).some(Boolean);

    if (hasSelectedItems && hasReason && hasInstruction && !isRecentDisputeSaved) {
      setShowGuideArrow(true);
      
      // Hide arrow after 4 seconds and restore warning box (matching Personal Information behavior)
      setTimeout(() => {
        setShowGuideArrow(false);
      }, 4000);
    } else {
      setShowGuideArrow(false);
    }
  };

  // Check arrow with explicit values for Recent Inquiries (matching Personal Information pattern)
  const checkRecentFormCompletionAndShowArrowWithValues = (
    reasonText: string,
    instructionText: string
  ) => {
    const hasSelectedItems = Object.values(selectedRecentInquiries).some(Boolean);
    const hasReason = !!reasonText;
    const hasInstruction = !!instructionText;

    if (hasSelectedItems && hasReason && hasInstruction && !isRecentDisputeSaved) {
      setShowGuideArrow(true);
    }
  };

  // This function is not used - save logic is in button click handler

  // Handle section expansion with scroll to "1" circle
  const handleOlderInquiriesToggle = () => {
    console.log("→ Older Inquiries clicked - isOlderInquiriesChoreographyActive:", isOlderInquiriesChoreographyActive);
    console.log("Older Inquiries collapsed:", !showOlderInquiries);
    console.log("Older Inquiries saved state:", isOlderDisputeSaved);
    // Allow toggle if choreography is not active
    if (!isOlderInquiriesChoreographyActive) {
      const newShowState = !showOlderInquiries;
      console.log("→ Older Inquiries Manual Toggle Triggered - expanding to:", newShowState);
      setShowOlderInquiries(newShowState);
      
      if (newShowState) {
        // Call onOlderExpand prop for standardized expand scroll
        if (onOlderExpand) {
          onOlderExpand();
        }
      }
    } else {
      console.log("→ Older Inquiries toggle blocked - choreography active");
    }
  };

  // Date formatting
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',  
      year: 'numeric',
    });
  };

  // Bureau color coding
  const getBureauColor = (bureau: string): string => {
    switch (bureau.toLowerCase()) {
      case 'transunion':
        return 'text-cyan-700';
      case 'equifax':
        return 'text-red-600';
      case 'experian':
        return 'text-blue-800';
      default:
        return 'text-gray-600';
    }
  };

  // Render bureau section with inquiries
  const renderBureauSection = (bureau: string, inquiries: any[], isRecent: boolean) => {
    const selectedItems = isRecent ? selectedRecentInquiries : selectedOlderInquiries;
    const isDisputeSaved = isRecent ? isRecentDisputeSaved : isOlderDisputeSaved;

    return (
      <div key={bureau} className="space-y-4">
        <div className={`flex items-center gap-2 mb-2 ${isRecent ? 'mt-6' : 'mt-3'}`}>
          <h4 className={`font-bold ${isDisputeSaved ? 'text-green-700' : getBureauColor(bureau)}`}>{bureau}</h4>
        </div>

        {inquiries.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden p-3 h-[100px] flex flex-col items-center justify-center">
            <ThumbsUp className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-sm text-center text-green-700 font-bold">Clean slate!</p>
            <p className="text-xs text-center text-gray-500">No recent inquiries</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inquiries.map((inquiry) => {
              console.log('[INQ] frontend key →', inquiry.key);
              console.log('[INQ] viol keys available →', Object.keys(aiViolations || {}));
              
              const isSelected = selectedItems[inquiry.key];
              // Check for AI violations and suggestions for this specific inquiry
              const inquiryViolations = aiViolations?.[inquiry.key] || [];
              const inquirySuggestions = aiSuggestions?.[inquiry.key] || [];
              const hasViolations = inquiryViolations.length > 0;
              const hasSuggestions = inquirySuggestions.length > 0;

              return (
                <div key={inquiry.key} data-inquiry-key={inquiry.key}>
                  {/* Main inquiry card */}
                  <div
                    className={`
                      border rounded-lg overflow-hidden p-3 min-h-[100px] cursor-pointer transition-all duration-200 hover:shadow-lg
                      ${
                        isDisputeSaved
                          ? isSelected
                            ? 'border-[2px] border-green-500 bg-white'
                            : 'bg-green-50 border border-green-200'
                          : isSelected
                            ? 'border-[2px] border-red-500 bg-white'
                            : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() =>
                      isRecent
                        ? toggleRecentInquirySelection(inquiry.key)
                        : toggleOlderInquirySelection(inquiry.key)
                    }
                  >
                    <div className="flex gap-2">
                      <input
                        type="checkbox"
                        className="flex-shrink-0 mt-0.5"
                        checked={isSelected}
                        onChange={() => {}}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="w-full">
                          <p className="text-xs font-bold mb-1 truncate">
                            {inquiry['@_Name'] || 'Unknown Creditor'}
                          </p>
                          <p className="text-xs text-gray-600 mb-1">
                            {formatDate(inquiry['@_Date'])}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            {inquiry['@CreditBusinessType'] || 'Unknown Type'}
                          </p>
                          <p
                            className={`text-xs flex items-center gap-1 ${isRecent ? 'text-orange-600' : 'text-green-600'}`}
                          >
                            {isRecent ? (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                May Impact Score
                              </>
                            ) : (
                              <>
                                <ThumbsUp className="w-3 h-3" />
                                No Impact to Score
                              </>
                            )}
                          </p>
                        </div>



                        {/* Expanded AI Violations Content */}
                        {showViolationsById[inquiry.key] && hasViolations && (
                          <div className="mt-2 space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3">
                            <div className="mb-3 flex justify-between items-center">
                              <h4 className="text-sm font-semibold text-blue-800">AI-Detected Compliance Violations</h4>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Auto-populate both fields with AI typing animation
                                  const reason = `Use All ${inquiryViolations.length}`;
                                  const instruction = `Use All ${inquiryViolations.length}`;
                                  
                                  // Type reason first
                                  await typeText(reason, setSelectedReason, setIsTypingReason, 25);
                                  
                                  // Brief pause between reason and instruction
                                  await new Promise((resolve) => setTimeout(resolve, 400));
                                  
                                  // Type instruction
                                  await typeText(instruction, setSelectedInstruction, setIsTypingInstruction, 15);
                                }}
                                className="px-4 py-2 text-sm font-black bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-blue-600 hover:border-blue-700 min-w-[140px] flex items-center whitespace-nowrap rounded-md"
                              >
                                <Zap className="w-3 h-3 mr-1 flex-shrink-0" />
                                Use All {inquiryViolations.length}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {inquiryViolations.map((violation, index) => (
                                <div key={index} className="p-3 bg-white rounded border border-gray-200">
                                  <p className="text-sm text-gray-800">{violation}</p>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      // Auto-populate both fields with AI typing animation using the actual violation text
                                      const reason = violation.trim();
                                      const instruction = violation.trim();
                                      
                                      // Type reason first
                                      await typeText(reason, setSelectedReason, setIsTypingReason, 25);
                                      
                                      // Brief pause between reason and instruction
                                      await new Promise((resolve) => setTimeout(resolve, 400));
                                      
                                      // Type instruction
                                      await typeText(instruction, setSelectedInstruction, setIsTypingInstruction, 15);
                                    }}
                                    className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md border border-blue-300"
                                  >
                                    Add to Dispute
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expanded AI Suggestions Content */}
                        {showSuggestionsById[inquiry.key] && hasSuggestions && (
                          <div className="mt-2 space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3">
                            <div className="mb-3 flex justify-between items-center">
                              <div>
                                <h4 className="text-sm font-semibold text-blue-800">AI Dispute Suggestions</h4>
                                <p className="text-xs text-blue-600">AI-powered dispute suggestions based on compliance analysis</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowSuggestionsById(prev => ({
                                    ...prev,
                                    [inquiry.key]: false
                                  }));
                                }}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md"
                              >
                                Hide Suggestions
                              </button>
                            </div>
                            <div className="space-y-2">
                              {inquirySuggestions.map((suggestion, index) => (
                                <div key={index} className="p-3 bg-white rounded border border-gray-200">
                                  <p className="text-sm text-gray-800">{suggestion}</p>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      // Auto-populate both fields with AI typing animation using the actual suggestion text
                                      const reason = suggestion.trim();
                                      const instruction = suggestion.trim();
                                      
                                      // Type reason first
                                      await typeText(reason, setSelectedReason, setIsTypingReason, 25);
                                      
                                      // Brief pause between reason and instruction
                                      await new Promise((resolve) => setTimeout(resolve, 400));
                                      
                                      // Type instruction
                                      await typeText(instruction, setSelectedInstruction, setIsTypingInstruction, 15);
                                    }}
                                    className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md border border-blue-300"
                                  >
                                    Use This Suggestion
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render dispute form - EXACT replica from Personal Information
  const renderDisputeForm = (isRecent: boolean) => {
    const reason = isRecent ? selectedRecentReason : selectedReason;
    const instruction = isRecent ? selectedRecentInstruction : selectedInstruction;
    const setReason = isRecent ? setSelectedRecentReason : setSelectedReason;
    const setInstruction = isRecent ? setSelectedRecentInstruction : setSelectedInstruction;
    const selectedItems = isRecent ? selectedRecentInquiries : selectedOlderInquiries;
    const hasSelectedItems = Object.values(selectedItems).some(Boolean);
    const isTypingReasonState = isRecent ? isRecentTypingReason : isTypingReason;
    const isTypingInstructionState = isRecent ? isRecentTypingInstruction : isTypingInstruction;
    const showArrow = isRecent ? showGuideArrow : showOlderGuideArrow;
    const isDisputeSavedState = isRecent ? isRecentDisputeSaved : isOlderDisputeSaved;

    if (!hasSelectedItems) return null;

    const disputeReasons = [
      'Inquiry not authorized by me',
      'I never applied for credit with this company',
      'This inquiry is older than 2 years',
      'This is a duplicate inquiry',
      'I was only shopping for rates',
      'This inquiry was made without my permission',
      'This is fraudulent inquiry activity',
      'Other (specify below)',
    ];

    const disputeInstructions = [
      'Please remove this unauthorized inquiry immediately',
      'Delete this inquiry as I never applied for credit',
      'Remove this outdated inquiry from my report',
      'Please delete this duplicate inquiry',
      'Remove this inquiry as I was only rate shopping',
      'Delete this unauthorized inquiry from my credit file',
      'Remove this fraudulent inquiry immediately',
      'Other (specify below)',
    ];

    // Compute dispute header text outside JSX
    const olderCount = Object.values(selectedOlderInquiries).filter(Boolean).length;
    const recentCount = Object.values(selectedRecentInquiries).filter(Boolean).length;
    const totalCount = olderCount + recentCount;
    const disputeHeaderText = totalCount === 1 ? 'Dispute Saved' : 'Disputes Saved';

    return (
      <div className="mt-4">
        <div
          className={`pt-4 rounded-lg py-4 ${isDisputeSavedState ? 'bg-green-50' : 'bg-red-50'}`}
        >


          <div className="border-t border-gray-200 mb-4"></div>
          <div className="flex items-start gap-2 mb-4 mt-2">
            {isDisputeSavedState ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">✓</span>
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
            )}
            <span className={`font-bold ${isDisputeSavedState ? 'text-green-700' : 'text-black'}`}>
              {isDisputeSavedState ? disputeHeaderText : 'Create Dispute'}
            </span>
          </div>

          <div className="space-y-4">
            {/* Reason Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-medium ${isDisputeSavedState ? 'text-green-700' : 'text-gray-700'}`}>Dispute Reason</label>
              </div>
              {isTypingReasonState ? (
                <div className="relative">
                  <div className="absolute -top-7 right-0 flex items-center gap-1 text-blue-600 text-xs z-10">
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>AI typing</span>
                  </div>
                  <div className="w-full p-3 border-[2px] border-red-500 rounded-md bg-red-50 text-gray-900 min-h-[42px] flex items-center">
                    {reason || 'AI is typing...'}
                  </div>
                </div>
              ) : (
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger
                    className={`w-full text-left ${
                      isDisputeSavedState && hasSelectedItems
                        ? 'border-green-500 bg-green-50'
                        : hasSelectedItems
                          ? 'border-red-500'
                          : 'border-gray-300'
                    }`}
                  >
                    <SelectValue placeholder="Select a dispute reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {disputeReasons.map((reasonOption, index) => (
                      <SelectItem key={index} value={reasonOption}>
                        {reasonOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Instruction Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-medium ${isDisputeSavedState ? 'text-green-700' : 'text-gray-700'}`}>Dispute Instruction</label>
              </div>
              {isTypingInstructionState ? (
                <div className="relative">
                  <div className="absolute -top-7 right-0 flex items-center gap-1 text-blue-600 text-xs z-10">
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>AI typing</span>
                  </div>
                  <div className="w-full p-3 border-[2px] border-red-500 rounded-md bg-red-50 text-gray-900 min-h-[42px] flex items-center">
                    {instruction || 'AI is typing...'}
                  </div>
                </div>
              ) : (
                <Select value={instruction} onValueChange={setInstruction}>
                  <SelectTrigger
                    className={`w-full text-left ${
                      isDisputeSavedState && hasSelectedItems
                        ? 'border-green-500 bg-green-50'
                        : hasSelectedItems
                          ? 'border-red-500'
                          : 'border-gray-300'
                    }`}
                  >
                    <SelectValue placeholder="Select dispute instructions..." />
                  </SelectTrigger>
                  <SelectContent>
                    {disputeInstructions.map((instructionOption, index) => (
                      <SelectItem key={index} value={instructionOption}>
                        {instructionOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Save Button Section */}
          <div className="flex gap-2 justify-between items-center pt-4">
            {hasSelectedItems && !isDisputeSavedState && (!reason || !instruction) ? (
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
              {showArrow && (
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
              {isDisputeSavedState ? (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 mr-1">
                  <ThickCheckIcon className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-1">
                  3
                </div>
              )}
              <Button
                onClick={() => {
                  console.log("Save button clicked — triggering choreography regardless of isDisputeSaved");
                  
                  // If already saved, trigger re-save choreography by resetting state
                  if (isDisputeSavedState) {
                    console.log('GREEN SAVE BUTTON CLICKED - Triggering re-save choreography');
                    
                    if (isRecent) {
                      // Reset Recent Inquiries state and re-trigger
                      setIsRecentDisputeSaved(false);
                      setTimeout(() => {
                        setIsRecentDisputeSaved(true);
                      }, 50);
                    } else {
                      // Reset Older Inquiries state and re-trigger  
                      setIsOlderDisputeSaved(false);
                      setTimeout(() => {
                        setIsOlderDisputeSaved(true);
                      }, 50);
                    }
                    return;
                  }

                  // New save choreography for sub-cards
                  if (isRecent) {
                    const disputeData = {
                      reason: selectedRecentReason,
                      instruction: selectedRecentInstruction,
                      selectedItems: selectedRecentInquiries,
                    };
                    
                    // Mark Recent Inquiries as saved
                    setRecentSaved(true);
                    setSavedRecentDispute(disputeData);
                    setIsRecentDisputeSaved(true);
                    
                    // Notify parent that Recent Inquiries is saved
                    if (onRecentInquiriesSaved) {
                      onRecentInquiriesSaved(true);
                    }

                    // Call the specific recent inquiry dispute saved handler for state persistence
                    if (onRecentInquiryDisputeSaved) {
                      // Convert selectedItems to the format expected by parent
                      const selectedInquiriesArray = Object.keys(selectedRecentInquiries)
                        .filter(key => selectedRecentInquiries[key])
                        .map(key => {
                          const [id, bureau] = key.split('-');
                          return { id, bureau, creditor: `Creditor-${id}` }; // Using available data structure
                        });
                      
                      onRecentInquiryDisputeSaved({
                        selectedInquiries: selectedInquiriesArray,
                        reason: selectedRecentReason,
                        instruction: selectedRecentInstruction,
                      });
                    }

                    // Call parent callback to trigger header green checkmark
                    if (onDisputeSaved) {
                      onDisputeSaved({
                        reason: selectedRecentReason,
                        instruction: selectedRecentInstruction,
                        selectedItems: selectedRecentInquiries,
                        isRecentInquiries: true,
                      });
                    }

                    // Recent Inquiries choreography: Show green feedback
                    // The Hard Inquiries choreography in hard-inquiries-section.tsx will handle the collapse sequence
                    console.log("✅ RECENT INQUIRIES SAVED: Triggering Hard Inquiries choreography");
                    
                    // Show green feedback for 1 second, then allow manual toggle
                    setTimeout(() => {
                      console.log("✅ Recent Inquiries Choreography Complete - Hard Inquiries will auto-collapse");
                      // Hard Inquiries choreography will handle collapse/scroll sequence
                    }, 1000);

                  } else {
                    // Older Inquiries save choreography
                    const selectedItems = Object.keys(selectedOlderInquiries)
                      .filter((key) => selectedOlderInquiries[key])
                      .reduce(
                        (acc, key) => {
                          acc[key] = true;
                          return acc;
                        },
                        {} as { [key: string]: boolean }
                      );

                    const disputeData = {
                      reason: selectedReason,
                      instruction: selectedInstruction,
                      selectedItems,
                    };
                    
                    // Mark Older Inquiries as saved
                    setOlderSaved(true);
                    setSavedOlderDispute(disputeData);
                    setIsOlderDisputeSaved(true);
                    
                    // Notify parent that Older Inquiries is saved
                    if (onOlderInquiriesSaved) {
                      onOlderInquiriesSaved(true);
                    }

                    // Call the specific older inquiry dispute saved handler for state persistence
                    if (onOlderInquiryDisputeSaved) {
                      // Convert selectedItems to the format expected by parent
                      const selectedInquiriesArray = Object.keys(selectedItems).map(key => {
                        const [id, bureau] = key.split('-');
                        return { id, bureau, creditor: `Creditor-${id}` }; // Using available data structure
                      });
                      
                      onOlderInquiryDisputeSaved({
                        selectedInquiries: selectedInquiriesArray,
                        reason: selectedReason,
                        instruction: selectedInstruction,
                      });
                    }

                    // Call parent callback if available
                    if (onDisputeSaved) {
                      onDisputeSaved(disputeData);
                    }

                    // Older Inquiries choreography: Show green feedback and auto-collapse ONLY this section
                    // Does NOT trigger Hard Inquiries choreography (only Recent Inquiries does that)
                    console.log("✅ OLDER INQUIRIES SAVED: Auto-collapsing Older Inquiries section only");
                    
                    // Show green feedback for 1 second, then allow manual toggle
                    setTimeout(() => {
                      console.log("✅ Older Inquiries Choreography Complete - No Hard Inquiries effects");
                      // Older Inquiries auto-collapse happens via useEffect in inquiries-working.tsx
                      // Hard Inquiries section remains unchanged
                    }, 1000);
                  }
                }}
                disabled={!Object.values(selectedItems).some(Boolean) || !reason || !instruction}
                className={`${
                  isDisputeSavedState
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white px-4 py-2 rounded-md disabled:bg-gray-400 transition-colors duration-200 w-[190px] h-10 flex items-center justify-center`}
              >
                {isDisputeSavedState ? (
                  <>
                    <ThickCheckIcon className="w-4 h-4 text-white mr-2" />
                    <span>Dispute Saved</span>
                  </>
                ) : (
                  'Save Dispute and Continue'
                )}
              </Button>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // Get total counts
  const getTotalOlderCount = () => {
    return Object.values(olderInquiries).reduce(
      (sum, bureauInquiries) => sum + bureauInquiries.length,
      0
    );
  };

  const getTotalRecentCount = () => {
    return Object.values(recentInquiries).reduce(
      (sum, bureauInquiries) => sum + bureauInquiries.length,
      0
    );
  };

  // useEffect hooks
  useEffect(() => {
    checkOlderFormCompletionAndShowArrow();
  }, [
    selectedOlderInquiries,
    selectedReason,
    selectedInstruction,
    isOlderDisputeSaved,
    isTypingReason,
    isTypingInstruction,
  ]);

  useEffect(() => {
    checkRecentFormCompletionAndShowArrow();
  }, [
    selectedRecentInquiries,
    selectedRecentReason,
    selectedRecentInstruction,
    isRecentDisputeSaved,
    isRecentTypingReason,
    isRecentTypingInstruction,
  ]);

  // REMOVED: Duplicate useEffect hooks that were causing state interference
  // The primary useEffect hooks at the top of the component handle all state restoration

  // Calculate combined dispute information
  const getCombinedDisputeInfo = () => {
    const olderCount = savedOlderDispute
      ? Object.keys(savedOlderDispute.selectedItems || {}).length
      : 0;
    const recentCount = savedRecentDispute
      ? Object.keys(savedRecentDispute.selectedItems || {}).length
      : 0;
    const totalCount = olderCount + recentCount;
    
    // Only count actual disputes saved, not bureau multipliers
    const totalDisputes = totalCount;

    return {
      olderCount,
      recentCount,
      totalCount,
      totalDisputes,
      hasOlderDispute: !!savedOlderDispute,
      hasRecentDispute: !!savedRecentDispute,
    };
  };

  const combinedInfo = getCombinedDisputeInfo();

  // Compute values for IIFE replacements
  const totalOlderInquiriesTitle = getTotalOlderCount();
  const totalRecentInquiriesTitle = getTotalRecentCount();
  let collapsedTitleText = 'Hard Inquiries Disputes Saved';
  
  // Add counts to the title line
  if (totalOlderInquiriesTitle > 0 && totalRecentInquiriesTitle > 0) {
    collapsedTitleText += ` (${totalOlderInquiriesTitle + totalRecentInquiriesTitle})`;
  } else if (totalOlderInquiriesTitle > 0) {
    collapsedTitleText += ` (${totalOlderInquiriesTitle})`;
  } else if (totalRecentInquiriesTitle > 0) {
    collapsedTitleText += ` (${totalRecentInquiriesTitle})`;
  }

  const disputedRecent = combinedInfo.hasRecentDispute ? combinedInfo.recentCount : 0;
  const disputedOlder = combinedInfo.hasOlderDispute ? combinedInfo.olderCount : 0;
  
  // Only show disputed count in line 2
  let collapsedSubtitleText = 'Dispute completed';
  if (disputedRecent > 0 && disputedOlder > 0) {
    collapsedSubtitleText = `${disputedRecent + disputedOlder} disputed`;
  } else if (disputedRecent > 0) {
    collapsedSubtitleText = `${disputedRecent} disputed`;
  } else if (disputedOlder > 0) {
    collapsedSubtitleText = `${disputedOlder} disputed`;
  }

  // Compute values for Recent Inquiry AI toggle links
  const recentInquiryViolations: string[] = [];
  const recentInquirySuggestions: string[] = [];
  
  // Collect violations and suggestions for all recent inquiries (filter out "I'm sorry" responses)
  Object.values(recentInquiries).forEach(bureauInquiries => {
    bureauInquiries.forEach(inquiry => {
      const inquiryViolations = (aiViolations && aiViolations[inquiry.key] ? aiViolations[inquiry.key] : [])
        .filter(v => !v.includes("I'm sorry") && !v.includes("cannot assist") && !v.includes("cannot fulfill"));
      const inquirySuggestions = (aiSuggestions && aiSuggestions[inquiry.key] ? aiSuggestions[inquiry.key] : [])
        .filter(s => !s.includes("I'm sorry") && !s.includes("cannot assist") && !s.includes("cannot fulfill"));
      
      recentInquiryViolations.push(...inquiryViolations);
      recentInquirySuggestions.push(...inquirySuggestions);
    });
  });
  
  const hasSelectedRecentInquiries = Object.values(selectedRecentInquiries).some(Boolean);
  
  // 🧪 TEST MODE: Add sample violations for testing toggle links when AI scan completed but no real violations
  if (aiScanCompleted && recentInquiryViolations.length === 0 && hasSelectedRecentInquiries) {
    recentInquiryViolations.push(
      "Metro 2 Field 9 Inquiry Date contains format inconsistencies across bureaus (YYYY-MM-DD required). Date of First Delinquency reporting violates FCRA §623(a)(5) accuracy standards.",
      "FCRA Permissible Purpose validation error – inquiry lacks documented consumer consent. Missing authorization under FCRA §604(a)(3)(F) for credit evaluation purpose.",
      "Metro 2 Field 7 Account Number cross-reference failure – inquiry conflicts with existing trade line data. Violates Metro 2 standardized reporting requirements for data consistency."
    );
    recentInquirySuggestions.push(
      "Dispute this inquiry for lack of permissible purpose under FCRA §604. Request furnisher to provide written documentation of consumer authorization and legitimate business need.",
      "Challenge the inquiry date accuracy under FCRA §623(a)(5). The reported date conflicts with account opening timeframes and violates Metro 2 Field 9 consistency requirements.",
      "File dispute citing Metro 2 data integrity violation. The inquiry information contradicts existing account data and fails standardized cross-verification protocols."
    );
  }
  
  const hasRecentViolations = recentInquiryViolations.length > 0;
  const hasRecentSuggestions = recentInquirySuggestions.length > 0;
  
  // Console log for debugging visual consistency
  console.log("Visual Consistency Debug:", {
    isOlderDisputeSaved,
    isRecentDisputeSaved,
    olderCount: getTotalOlderCount(),
    recentCount: getTotalRecentCount()
  });
  
  // 🔥 DEBUG: Recent Inquiries AI Toggle Logic
  console.log("🔍 [RECENT INQUIRIES] AI Toggle Debug:", {
    aiScanCompleted,
    hasSelectedRecentInquiries,
    hasRecentViolations,
    hasRecentSuggestions,
    recentInquiryViolations: recentInquiryViolations.slice(0, 3),
    selectedRecentInquiries,
    shouldShowToggle: aiScanCompleted && hasSelectedRecentInquiries && (hasRecentViolations || hasRecentSuggestions)
  });

  // Compute metro2/FCRA counts for Recent Inquiries
  const recentMetro2Count = recentInquiryViolations.filter((v) => v.includes('Metro 2')).length;
  const recentFcrCount = recentInquiryViolations.length - recentMetro2Count;
  let recentViolationTypeText = '';
  if (recentMetro2Count > 0 && recentFcrCount > 0) {
    recentViolationTypeText = ` (${recentMetro2Count} Metro 2, ${recentFcrCount} FCRA)`;
  } else if (recentMetro2Count > 0) {
    recentViolationTypeText = ` (${recentMetro2Count} Metro 2)`;
  } else if (recentFcrCount > 0) {
    recentViolationTypeText = ` (${recentFcrCount} FCRA)`;
  }

  return (
    <div className="space-y-3">
      {/* Elegant Collapse Button - Shows only after combined box has been shown and sections reopened */}
      {!showCombinedCollapsedBox &&
        hasEverShownCombinedBox &&
        (combinedInfo.hasOlderDispute || combinedInfo.hasRecentDispute) && (
          <div className="flex justify-center mb-4">
            <Button
              onClick={() => {
                setShowCombinedCollapsedBox(true);
                setHasEverShownCombinedBox(true);
                setShowOlderInquiries(false);
                setShowRecentInquiries(false);
              }}
              className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-1.5 rounded-md text-xs transition-colors duration-200 flex items-center gap-1.5"
            >
              <span className="font-medium">Collapse All Inquiries</span>
              <ChevronUp className="w-3 h-3" />
            </Button>
          </div>
        )}

      {/* Combined Collapsed Box - Shows when both sections are saved and collapsed */}
      {showCombinedCollapsedBox &&
        (combinedInfo.hasOlderDispute || combinedInfo.hasRecentDispute) && (
          <Card className="border-[2px] border-green-500 bg-green-50 transition-all duration-300 rounded-lg">
            <CardHeader
              className="cursor-pointer transition-colors p-6 flex items-center hover:bg-green-100"
              onClick={() => {
                setShowCombinedCollapsedBox(false);
                // Show individual collapsed boxes, not expanded sections
                setShowOlderInquiries(false);
                setShowRecentInquiries(false);
              }}
            >
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
                    <ThickCheckIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="text-base font-semibold text-green-700 leading-5">
                      {collapsedTitleText}
                    </div>
                    <div className="text-sm text-green-600 leading-4">
                      {collapsedSubtitleText}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-blue-600 flex-shrink-0" />
              </div>
            </CardHeader>
          </Card>
        )}



      {/* Individual Inquiry Sections - Hide when showing combined box */}
      {!showCombinedCollapsedBox && (
        <>
          {/* Older Inquiries Section */}
          <Card
            data-section="older-inquiries"
            className={`transition-all duration-300 hover:shadow-lg rounded-lg ${showOlderInquiries ? 'border-[2px] border-gray-300 pb-6' : 'border-[2px] border-gray-200'} ${isOlderDisputeSaved ? 'bg-green-50 border-[2px] border-green-500' : 'bg-white'}`}
          >
            <CardHeader
              className={
                isOlderDisputeSaved 
                  ? `cursor-pointer flex flex-row items-center p-6 bg-green-50 hover:bg-green-100 transition-colors duration-200`
                  : `cursor-pointer flex flex-row items-center p-6 bg-white hover:bg-gray-50 transition-colors duration-200`
              }
              onClick={handleOlderInquiriesToggle}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                  {isOlderDisputeSaved ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
                      <ThickCheckIcon className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-bold">
                      {getTotalOlderCount()}
                    </div>
                  )}
                  <div className={isOlderDisputeSaved ? "mt-0.5" : ""}>
                    <h3 className={`text-lg font-bold ${isOlderDisputeSaved ? 'text-green-700' : 'text-gray-700'}`}>
                      {isOlderDisputeSaved
                        ? `Older Inquiries – Disputes Saved`
                        : `${getTotalOlderCount()} Older Inquiries`}
                    </h3>
                    <p className={`text-sm ${isOlderDisputeSaved && !showOlderInquiries ? 'text-green-700' : 'text-gray-600'}`}>
                      {isOlderDisputeSaved && !showOlderInquiries
                        ? `You've saved disputes for inquiry items across TransUnion, Equifax, and Experian.`
                        : 'Inquiries older than 24 months do not impact the score'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isOlderDisputeSaved ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                    {getTotalOlderCount()} items
                  </span>
                  {showOlderInquiries ? (
                    <ChevronUp className={`w-4 h-4 ${isOlderDisputeSaved ? 'text-green-600' : 'text-gray-600'}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 ${isOlderDisputeSaved ? 'text-green-600' : 'text-gray-600'}`} />
                  )}
                </div>
              </div>
            </CardHeader>

            {showOlderInquiries && (
              <div className={`w-[1150px] max-w-[1150px] mx-auto rounded-lg p-6 ${isOlderDisputeSaved ? 'bg-green-50 border-[2px] border-green-500' : Object.values(selectedOlderInquiries).some(Boolean) ? 'bg-rose-50 border-[2px] border-red-500' : 'bg-gray-50 border-[2px] border-gray-300'}`}>
                {/* Step 1 Instruction */}
                <div className="flex items-center gap-3 mb-6">
                  {isOlderDisputeSaved ? (
                    <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                      <ThickCheckIcon className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                  )}
                  <span className={`font-semibold text-base leading-[20px] ${isOlderDisputeSaved ? 'text-green-700' : 'text-gray-900'}`}>
                    {isOlderDisputeSaved 
                      ? "You've saved disputes for inquiry items across TransUnion, Equifax, and Experian."
                      : "Choose unauthorized inquiries to dispute (optional)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renderBureauSection('TransUnion', olderInquiries.TransUnion, false)}
                  {renderBureauSection('Equifax', olderInquiries.Equifax, false)}
                  {renderBureauSection('Experian', olderInquiries.Experian, false)}
                </div>
                {renderDisputeForm(false)}
              </div>
            )}
          </Card>

          {/* Recent Inquiries Section */}
          <Card
            data-section="recent-inquiries"
            className={`transition-all duration-300 hover:shadow-lg rounded-lg ${effectiveShowRecentInquiries ? 'border-[2px] border-gray-300 pb-6' : 'border-[2px] border-gray-200'} ${isRecentDisputeSaved ? 'bg-green-50 border-[2px] border-green-500' : 'bg-white'}`}
          >
            <CardHeader
              data-testid="recent-inquiries-header"
              className={
                isRecentDisputeSaved 
                  ? `cursor-pointer flex flex-row items-center p-6 bg-green-50 hover:bg-green-100 transition-colors duration-200`
                  : `cursor-pointer flex flex-row items-center p-6 bg-white hover:bg-gray-50 transition-colors duration-200`
              }
              onClick={() => {
                console.log("Recent Inquiries header clicked — scrolling to recent-inquiries");
                
                // Scroll to Recent Inquiries section
                const recentInquiriesSection = document.querySelector('[data-section="recent-inquiries"]');
                if (recentInquiriesSection) {
                  const rect = recentInquiriesSection.getBoundingClientRect();
                  const targetY = window.scrollY + rect.top - 20;
                  
                  window.scrollTo({
                    top: targetY,
                    behavior: 'smooth'
                  });
                }
                
                console.log("→ Recent Inquiries Choreography Active:", isRecentInquiriesChoreographyActive);
                console.log("Recent Inquiries collapsed:", recentInquiriesCollapsed);
                console.log("Recent Inquiries saved state:", isRecentDisputeSaved);
                if (!isRecentInquiriesChoreographyActive) {
                  const newCollapsedState = !recentInquiriesCollapsed;
                  if (setRecentInquiriesCollapsed) {
                    setRecentInquiriesCollapsed(newCollapsedState);
                    console.log("Recent Inquiries Collapsed State Updated:", newCollapsedState);
                    console.log("Recent Inquiries Manual Toggle Triggered");
                  }
                } else {
                  console.log("→ Recent Inquiries toggle blocked - choreography active");
                }
              }}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                  {isRecentDisputeSaved ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
                      <ThickCheckIcon className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="bg-orange-500 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                      {getTotalRecentCount()}
                    </div>
                  )}
                  <div className={isRecentDisputeSaved ? "mt-0.5" : ""}>
                    <h3 className={`text-lg font-bold ${isRecentDisputeSaved ? 'text-green-700' : 'text-gray-900'}`}>
                      {isRecentDisputeSaved
                        ? `Recent Inquiries – Disputes Saved`
                        : `${getTotalRecentCount()} Recent ${getTotalRecentCount() === 1 ? 'Inquiry' : 'Inquiries'}`}
                    </h3>
                    <p className={`text-sm ${isRecentDisputeSaved ? 'text-green-700' : 'text-orange-600 font-medium tracking-tight'}`}>
                      {isRecentDisputeSaved
                        ? `You've saved disputes for inquiry items across TransUnion, Equifax, and Experian.`
                        : `${getTotalRecentCount()} ${getTotalRecentCount() === 1 ? 'inquiry' : 'inquiries'} that may impact your credit score`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isRecentDisputeSaved ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                    {getTotalRecentCount()} {getTotalRecentCount() === 1 ? 'item' : 'items'}
                  </span>
                  {effectiveShowRecentInquiries ? (
                    <ChevronUp className={`w-4 h-4 ${isRecentDisputeSaved ? 'text-green-600' : 'text-gray-600'}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 ${isRecentDisputeSaved ? 'text-green-600' : 'text-gray-600'}`} />
                  )}
                </div>
              </div>
            </CardHeader>

            {effectiveShowRecentInquiries && (
              <div className={`w-[1150px] max-w-[1150px] mx-auto rounded-lg p-6 ${isRecentDisputeSaved ? 'bg-green-50 border-[2px] border-green-500' : Object.values(selectedRecentInquiries).some(Boolean) ? 'bg-rose-50 border-[2px] border-red-500' : 'bg-gray-50 border-[2px] border-gray-300'}`}>
                <div className="flex justify-between items-center mb-0">
                  {/* Step 1 Instruction - Show green checkmark when saved */}
                  {!showCombinedCollapsedBox && !(isRecentDisputeSaved && isOlderDisputeSaved) ? (
                    <div className="flex items-center gap-3">
                      {isRecentDisputeSaved ? (
                        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                          <ThickCheckIcon className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                      )}
                      <span className={`text-base font-bold ${isRecentDisputeSaved ? 'text-green-600' : 'text-gray-700'}`}>
                        {isRecentDisputeSaved 
                          ? "You've saved disputes for inquiry items across TransUnion, Equifax, and Experian."
                          : "Choose unauthorized inquiries to dispute (optional)"
                        }
                      </span>
                    </div>
                  ) : (
                    <div></div>
                  )}
                  
                  <Button
                    size="sm"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 h-8 text-sm font-medium"
                    onClick={() => {
                      console.log(`✅ Select All Score-Impact Items triggered at ${new Date().toLocaleTimeString()}`);

                      // Get all recent inquiries
                      const allInquiries = Object.values(recentInquiries).flat();

                      // Check each inquiry for account matches
                      let hasAccountMatches = false;
                      const inquiriesWithMatches = [];

                      for (const inquiry of allInquiries) {
                        if (isInquiryTiedToOpenAccount(inquiry)) {
                          hasAccountMatches = true;
                          inquiriesWithMatches.push(inquiry);
                        }
                      }

                      if (hasAccountMatches) {
                        // Show warning modal for bulk selection with account matches
                        setWarningInquiryName(
                          `${inquiriesWithMatches.length} inquiries that match existing accounts`
                        );
                        // For bulk selection, show the first matching account name
                        setMatchingAccountName(getMatchingAccountName(inquiriesWithMatches[0]) || 'Multiple Accounts');
                        // Store all inquiries for bulk selection after warning
                        const allSelected = allInquiries.reduce(
                          (acc, inquiry) => {
                            acc[inquiry.key] = true;
                            return acc;
                          },
                          {} as { [key: string]: boolean }
                        );
                        setPendingBulkSelection(allSelected);
                        setShowRecentInquiryWarning(true);
                        console.log('📋 Bulk Selection Warning - Matching Accounts:', inquiriesWithMatches.length, 'First Account:', getMatchingAccountName(inquiriesWithMatches[0]));
                      } else {
                        // No account matches, proceed with selection
                        const allSelected = allInquiries.reduce(
                          (acc, inquiry) => {
                            acc[inquiry.key] = true;
                            return acc;
                          },
                          {} as { [key: string]: boolean }
                        );
                        setSelectedRecentInquiries(allSelected);

                        // Simple scroll to first selected item
                        console.log("Select All Score-Impact Items clicked — scrolling to first selected item");
                        const selectedInquiries = Object.keys(allSelected);
                        if (selectedInquiries.length > 0) {
                          const firstSelectedElement = document.querySelector(`[data-inquiry-key="${selectedInquiries[0]}"]`);
                          if (firstSelectedElement) {
                            const rect = firstSelectedElement.getBoundingClientRect();
                            const targetY = window.scrollY + rect.top - 20;
                            
                            window.scrollTo({
                              top: targetY,
                              behavior: 'smooth'
                            });
                          }
                        }

                        if (!selectedRecentReason && !selectedRecentInstruction) {
                          setTimeout(() => autoPopulateRecentFields(), 500);
                        }
                      }
                    }}
                  >
                    Select All Score-Impact Items
                  </Button>
                </div>
                <div ref={recentInquiriesListRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renderBureauSection('TransUnion', recentInquiries.TransUnion, true)}
                  {renderBureauSection('Equifax', recentInquiries.Equifax, true)}
                  {renderBureauSection('Experian', recentInquiries.Experian, true)}
                </div>

                {/* AI Toggle Links positioned below bureau cards and above Step 2 */}
                {(aiScanCompleted && hasSelectedRecentInquiries && (hasRecentViolations || hasRecentSuggestions)) && (
                    <div className="mt-4">
                      {/* View Compliance Violations Link */}
                      {hasRecentViolations && (
                        <div style={{ marginTop: '-6px' }}>
                          <button
                            onClick={() => {
                              setShowAllViolations(!showAllViolations);
                              if (!showAllViolations) {
                                setShowAllSuggestions(false); // Close suggestions when opening violations
                              }
                            }}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 p-2 rounded-md transition-colors font-medium"
                          >
                            <Zap className="w-4 h-4 text-blue-600" />
                            <span>
                              View {recentInquiryViolations.length} Compliance Violations
                              {recentViolationTypeText}
                            </span>
                            {showAllViolations ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {/* Expanded Violations List */}
                          {showAllViolations && (
                            <div
                              className="space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3"
                              style={{ marginTop: '-2px' }}
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <button
                                  onClick={() => setShowAllViolations(!showAllViolations)}
                                  className="text-left hover:bg-blue-100 rounded-md p-2 transition-colors"
                                >
                                  <h4 className="text-sm font-medium text-gray-900">Detected Violations</h4>
                                </button>
                                <Button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Auto-populate both fields with AI typing animation using all violations text
                                    const allViolationsText = recentInquiryViolations.join(' ');
                                    const reason = allViolationsText.trim();
                                    const instruction = allViolationsText.trim();
                                    
                                    // Type reason first
                                    await typeText(reason, setSelectedRecentReason, setIsRecentTypingReason, 25);
                                    
                                    // Brief pause between reason and instruction
                                    await new Promise((resolve) => setTimeout(resolve, 400));
                                    
                                    // Type instruction
                                    await typeText(instruction, setSelectedRecentInstruction, setIsRecentTypingInstruction, 15);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="px-4 py-2 text-sm font-black bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-blue-600 hover:border-blue-700 min-w-[140px] flex items-center whitespace-nowrap"
                                >
                                  <Zap className="w-3 h-3 mr-1 flex-shrink-0" />
                                  Use All {recentInquiryViolations.length}
                                </Button>
                              </div>
                              <div className="mt-4 space-y-2">
                                {recentInquiryViolations.map((violation, index) => (
                                  <div key={index} className="p-3 bg-white rounded border border-gray-200">
                                    <div className="flex justify-between items-center">
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
                                        onClick={async (e) => {
                                          // Auto-populate both fields with AI typing animation using the actual violation text
                                          const reason = violation.trim();
                                          const instruction = violation.trim();
                                          
                                          // Type reason first
                                          await typeText(reason, setSelectedRecentReason, setIsRecentTypingReason, 25);
                                          
                                          // Brief pause between reason and instruction
                                          await new Promise((resolve) => setTimeout(resolve, 400));
                                          
                                          // Type instruction
                                          await typeText(instruction, setSelectedRecentInstruction, setIsRecentTypingInstruction, 15);
                                        }}
                                        className="border-gray-300"
                                      >
                                        Add to Dispute
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* View AI Dispute Suggestions Link */}
                      {hasRecentSuggestions && (
                        <div style={{ marginTop: '-8px', marginBottom: '0px' }}>
                          <button
                            onClick={() => {
                              setShowAllSuggestions(!showAllSuggestions);
                              if (!showAllSuggestions) {
                                setShowAllViolations(false); // Close violations when opening suggestions
                              }
                            }}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 p-2 rounded-md transition-colors font-medium"
                          >
                            <Lightbulb className="w-4 h-4 text-blue-600" />
                            <span>View AI Dispute Suggestions</span>
                            {showAllSuggestions ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {/* Expanded Suggestions List */}
                          {showAllSuggestions && (
                            <div
                              className="space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3"
                              style={{ marginTop: '-2px' }}
                            >
                              <div className="mb-3 flex justify-between items-center">
                                <button
                                  onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                                  className="flex-1 text-left hover:bg-blue-100 rounded-md p-2 transition-colors mr-2"
                                >
                                  <h4 className="text-sm font-medium text-gray-900">AI Dispute Suggestions</h4>
                                </button>
                                <button
                                  onClick={() => setShowAllSuggestions(false)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                  aria-label="Close suggestions"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-2">
                                {recentInquirySuggestions.map((suggestion, index) => (
                                  <div key={index} className="p-3 bg-white rounded border border-gray-200">
                                    <div className="flex justify-between items-center">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 border border-blue-200"
                                            style={{ fontSize: '10px' }}
                                          >
                                            AI Suggestion
                                          </span>
                                          <span className="text-sm font-medium">{suggestion}</span>
                                        </div>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async (e) => {
                                          // Auto-populate both fields with AI typing animation using the actual suggestion text
                                          const reason = suggestion.trim();
                                          const instruction = suggestion.trim();
                                          
                                          // Type reason first
                                          await typeText(reason, setSelectedRecentReason, setIsRecentTypingReason, 25);
                                          
                                          // Brief pause between reason and instruction
                                          await new Promise((resolve) => setTimeout(resolve, 400));
                                          
                                          // Type instruction
                                          await typeText(instruction, setSelectedRecentInstruction, setIsRecentTypingInstruction, 15);
                                        }}
                                        className="border-gray-300"
                                      >
                                        Add to Dispute
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                )}

                {renderDisputeForm(true)}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Warning Modal for Older Inquiries */}
      {showOlderInquiryWarning && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => {
              setShowOlderInquiryWarning(false);
              setPendingInquirySelection(null);
            }}
          />
          <div className="fixed left-[50%] top-[50%] z-50 w-[95%] max-w-md translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 md:p-8 shadow-2xl min-h-[320px]">
            {/* X Close Button */}
            <button
              onClick={() => {
                setShowOlderInquiryWarning(false);
                setPendingInquirySelection(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Warning Icon */}
            <div className="flex items-start gap-2 mb-6 -ml-1">
              <div className="flex-shrink-0 mt-1">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-xl font-semibold text-gray-900 mb-4">
                  Warning: Old Inquiry
                </h3>

                {/* Main Content */}
                <div className="text-gray-700 mb-6 text-lg md:text-base">
                  <p className="mb-4">
                    <span className="hidden md:inline">This inquiry is more than 24 months old, so it no longer impacts your credit score.</span>
                    <span className="md:hidden">This inquiry is over 24 months old and doesn&apos;t impact your score.</span>
                  </p>
                  <p className="mb-4">
                    <span className="hidden md:inline">Disputing it won&apos;t help your score — and if there&apos;s an open account linked to it, you could lose that account, which can hurt your score.</span>
                    <span className="md:hidden">Disputing won&apos;t help your score and may close linked accounts.</span>
                  </p>
                  <p className="mb-4 font-semibold text-red-700 text-lg md:text-base">
                    <span className="hidden md:inline">We recommend that you do not dispute this inquiry.</span>
                    <span className="md:hidden">We recommend not disputing this.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOlderInquiryWarning(false);
                  setPendingInquirySelection(null);
                }}
                className="flex-1 px-4 py-4 md:px-6 md:py-3 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg font-medium flex items-center justify-center transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOlderWarningProceed}
                className="flex-1 px-4 py-4 md:px-6 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </>
      )}

      {/* Warning Modal for Recent Inquiries */}
      {showRecentInquiryWarning && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => {
              setShowRecentInquiryWarning(false);
              setPendingRecentInquirySelection(null);
              setPendingBulkSelection(null);
              setMatchingAccountName('');
            }}
          />
          <div className="fixed left-[50%] top-[50%] z-50 w-[95%] max-w-md translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 md:p-8 shadow-2xl">
            {/* X Close Button */}
            <button
              onClick={() => {
                setShowRecentInquiryWarning(false);
                setPendingRecentInquirySelection(null);
                setPendingBulkSelection(null);
                setMatchingAccountName('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Warning Icon */}
            <div className="flex items-start gap-2 mb-6 -ml-1">
              <div className="flex-shrink-0 mt-1">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-xl font-semibold text-gray-900 mb-4">
                  Warning: Account Match Found
                </h3>

                {/* Main Content */}
                <div className="text-gray-700 mb-6 text-lg md:text-base">
                  <p className="mb-4">
                    <span className="hidden md:inline">The inquiry from &quot;{warningInquiryName}&quot; appears to match an open account on your credit report.</span>
                    <span className="md:hidden">This inquiry may match an open account.</span>
                  </p>

                  {/* Matching Account Information */}
                  {matchingAccountName && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{matchingAccountName.toUpperCase()}</p>
                    </div>
                  )}

                  <p className="mb-4 font-medium">Disputing may:</p>

                  <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li className="hidden md:list-item">Potentially close your open account</li>
                    <li className="hidden md:list-item">Reduce your available credit</li>
                    <li className="hidden md:list-item">Negatively impact your credit score</li>
                    <li className="hidden md:list-item">Affect your credit utilization ratio</li>
                    <li className="md:hidden">Close your account</li>
                    <li className="md:hidden">Reduce available credit</li>
                    <li className="md:hidden">Impact your score</li>
                  </ul>

                  <p className="text-red-600 font-bold text-lg md:text-base">
                    <span className="hidden md:inline">Only dispute this inquiry if you&apos;re certain it was unauthorized or if you&apos;re willing to accept these risks.</span>
                    <span className="md:hidden">Only dispute if certain it was unauthorized.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRecentInquiryWarning(false);
                  setPendingRecentInquirySelection(null);
                  setPendingBulkSelection(null);
                  setMatchingAccountName('');
                }}
                className="flex-1 px-4 py-4 md:px-6 md:py-3 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg font-medium flex items-center justify-center transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecentWarningProceed}
                className="flex-1 px-4 py-4 md:px-6 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Inquiries;
