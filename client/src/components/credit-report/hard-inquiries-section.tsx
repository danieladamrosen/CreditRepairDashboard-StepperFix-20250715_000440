import { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ThickCheckIcon } from '@/components/ui/thick-check-icon';

import { Inquiries } from './inquiries-working';


interface HardInquiriesSectionProps {
  creditData: any;
  savedDisputes: { [key: string]: boolean | { reason: string; instruction: string; violations?: string[] } };
  onDisputeSaved: (disputeData: any) => void;
  onDisputeReset: (disputeData: any) => void;
  onInquirySaved: (id: string, bureau: 'TU' | 'EQ' | 'EX', isRecent: boolean) => void;
  onInquiryReset: (id: string) => void;
  aiViolations?: { [inquiryId: string]: string[] };
  aiSuggestions?: { [inquiryId: string]: string[] };
  aiScanCompleted?: boolean;
  
  // Hard Inquiries collapsed state
  hardCollapsed: boolean;
  setHardCollapsed: (collapsed: boolean) => void;
  showHardInquiries: boolean;
  setShowHardInquiries: (show: boolean) => void;
  
  // Recent Inquiries state
  recentInquiriesSaved: boolean;
  setRecentInquiriesSaved: (saved: boolean) => void;
  recentInquirySelections: Array<{ id: string; bureau: string; creditor: string }>;
  setRecentInquirySelections: (selections: Array<{ id: string; bureau: string; creditor: string }>) => void;
  recentInquiryDispute: { reason: string; instruction: string; selectedInquiries: string[] } | null;
  setRecentInquiryDispute: (dispute: { reason: string; instruction: string; selectedInquiries: string[] } | null) => void;
  onRecentInquiryDisputeSaved: (disputeData?: { selectedInquiries: Array<{ id: string; bureau: string; creditor: string }>; reason: string; instruction: string }) => void;
  
  // Older Inquiries state
  olderInquiriesSaved: boolean;
  setOlderInquiriesSaved: (saved: boolean) => void;
  olderInquirySelections: Array<{ id: string; bureau: string; creditor: string }>;
  setOlderInquirySelections: (selections: Array<{ id: string; bureau: string; creditor: string }>) => void;
  olderInquiryDispute: { reason: string; instruction: string; selectedInquiries: string[] } | null;
  setOlderInquiryDispute: (dispute: { reason: string; instruction: string; selectedInquiries: string[] } | null) => void;
  onOlderInquiryDisputeSaved: (disputeData?: { selectedInquiries: Array<{ id: string; bureau: string; creditor: string }>; reason: string; instruction: string }) => void;
  onExpand?: () => void;
  onOlderExpand?: () => void;
}

export function HardInquiriesSection({
  creditData,
  savedDisputes,
  onDisputeSaved,
  onDisputeReset,
  onInquirySaved,
  onInquiryReset,
  hardCollapsed,
  setHardCollapsed,
  showHardInquiries,
  setShowHardInquiries,
  recentInquiriesSaved,
  setRecentInquiriesSaved,
  recentInquirySelections,
  setRecentInquirySelections,
  recentInquiryDispute,
  setRecentInquiryDispute,
  onRecentInquiryDisputeSaved,
  olderInquiriesSaved,
  setOlderInquiriesSaved,
  olderInquirySelections,
  setOlderInquirySelections,
  olderInquiryDispute,
  setOlderInquiryDispute,
  onOlderInquiryDisputeSaved,
  aiViolations = {},
  aiSuggestions = {},
  aiScanCompleted = false,
  onExpand,
  onOlderExpand
}: HardInquiriesSectionProps) {
  const hardInquiriesRef = useRef<HTMLDivElement>(null);

  // Calculate recent inquiries count
  const calculateRecentInquiriesCount = () => {
    const inquiries = creditData?.CREDIT_RESPONSE?.CREDIT_INQUIRY || [];
    const inquiriesArray = Array.isArray(inquiries) ? inquiries : [inquiries];

    const currentDate = new Date('2025-06-18'); // Use consistent report date
    const cutoffDate = new Date(currentDate);
    cutoffDate.setMonth(cutoffDate.getMonth() - 24); // 24 months ago

    return inquiriesArray.filter((inquiry: any) => {
      const inquiryDate = new Date(inquiry['@_Date']);
      return inquiryDate >= cutoffDate;
    }).length;
  };

  // Calculate total inquiries count for badge
  const calculateTotalInquiriesCount = () => {
    const inquiries = creditData?.CREDIT_RESPONSE?.CREDIT_INQUIRY || [];
    const inquiriesArray = Array.isArray(inquiries) ? inquiries : [inquiries];
    return inquiriesArray.length;
  };

  const recentInquiriesCount = calculateRecentInquiriesCount();
  const totalInquiriesCount = calculateTotalInquiriesCount();

  // Helper function for inquiry status text
  const getInquiryStatusText = () => {
    if (recentInquiriesCount === 0) {
      return "You have 0 inquiries that affect your credit score";
    }
    const inquiryWord = recentInquiriesCount === 1 ? 'inquiry' : 'inquiries';
    return `${recentInquiriesCount} ${inquiryWord} that may impact your credit score`;
  };

  // Check if there are unsaved recent inquiries - only show orange when there are items to dispute
  // Default to gray styling unless there are actual unsaved items
  const hasUnsavedRecentInquiries = recentInquirySelections.length > 0 && !recentInquiriesSaved;
  
  const hardInquiriesColor = hasUnsavedRecentInquiries ? 'orange' : 'gray';

  // Handle header reset
  const handleHeaderReset = () => {
    setRecentInquiriesSaved(false);
    setOlderInquiriesSaved(false);
    setRecentInquirySelections([]);
    setOlderInquirySelections([]);
    setRecentInquiryDispute(null);
    setOlderInquiryDispute(null);
    
    // Reset all choreography flags
    setIsRecentInquiriesChoreographyActive(false);
    setIsOlderInquiriesChoreographyActive(false);
    setRecentInquiriesAutoCollapseComplete(false);
    setOlderInquiriesAutoCollapseComplete(false);
    console.log("→ All choreography flags reset");
  };

  // Hard Inquiries now has neutral appearance - no visual indicators
  
  // Check if both recent and older inquiries are saved
  const allInquiriesSaved = recentInquiriesSaved && olderInquiriesSaved;

  // Choreography state management - separate flags for each section
  const [hasHardChoreographed, setHasHardChoreographed] = useState(false);
  const [recentInquiriesCollapsed, setRecentInquiriesCollapsed] = useState(true);
  const [hardInquiriesGreenShown, setHardInquiriesGreenShown] = useState(false);
  const [hasRecentChoreographed, setHasRecentChoreographed] = useState(false);
  const [isHardInquiriesChoreographyActive, setIsHardInquiriesChoreographyActive] = useState(false);

  // Log state changes for debugging
  useEffect(() => {
    console.log("Recent Inquiries Collapsed State:", recentInquiriesCollapsed);
  }, [recentInquiriesCollapsed]);

  useEffect(() => {
    console.log("Hard Inquiries Collapsed State:", hardCollapsed);
  }, [hardCollapsed]);
  
  // Separate choreography flags for each section - initialize as true for immediate manual toggle
  const [hardInquiriesAutoCollapseComplete, setHardInquiriesAutoCollapseComplete] = useState(true);
  const [recentInquiriesAutoCollapseComplete, setRecentInquiriesAutoCollapseComplete] = useState(true);
  const [olderInquiriesAutoCollapseComplete, setOlderInquiriesAutoCollapseComplete] = useState(true);
  
  const [isRecentInquiriesChoreographyActive, setIsRecentInquiriesChoreographyActive] = useState(false);
  const [isOlderInquiriesChoreographyActive, setIsOlderInquiriesChoreographyActive] = useState(false);

  // Helper function for smooth scrolling to section
  const smoothScrollToSection = (sectionId: string, offset: number) => {
    console.log(`Attempting to scroll to section: ${sectionId} with offset: ${offset}`);
    const element = document.querySelector(`[data-section="${sectionId}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetScrollTop = scrollTop + rect.top - offset;
      
      console.log(`Found element ${sectionId}, scrolling to: ${targetScrollTop}`);
      window.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    } else {
      console.error(`Element not found: [data-section="${sectionId}"]`);
    }
  };

  // Log initial state flags
  useEffect(() => {
    console.log("→ Older Inquiries Initial AutoCollapseComplete: true");
    console.log("→ Recent Inquiries Initial AutoCollapseComplete: true");
    console.log("→ Recent Inquiries Collapsed State:", recentInquiriesCollapsed);
    console.log("→ setRecentInquiriesCollapsed function available: true");
    console.log("→ Hard Inquiries Initial AllInquiriesSaved:", allInquiriesSaved);
  }, []);

  // Log Hard Inquiries saved state changes
  useEffect(() => {
    console.log("Hard Inquiries Saved State Updated:", allInquiriesSaved);
  }, [allInquiriesSaved]);


  


  // Removed smooth scroll helper function to prevent continuous auto-scroll loops

  // Recent Inquiries Save → Hard Inquiries Choreography
  useEffect(() => {
    if (recentInquiriesSaved && !hasRecentChoreographed) {
      console.log("Step 1: Recent Inquiries Marked Saved");
      setHasRecentChoreographed(true);
      setIsHardInquiriesChoreographyActive(true);
      
      // Step 1: Turn Hard Inquiries green and expand
      setHardInquiriesGreenShown(true);
      setHardCollapsed(false);
      
      // Step 2: Scroll to Hard Inquiries (20px offset)
      setTimeout(() => {
        console.log("Step 2: Scrolled to Hard Inquiries");
        smoothScrollToSection('hard-inquiries', 20);
        
        // Step 3: Wait 500ms → Collapse Hard Inquiries and Recent Inquiries
        setTimeout(() => {
          console.log("Step 3: Hard Inquiries Collapsed");
          setHardCollapsed(true);
          setRecentInquiriesCollapsed(true);
          
          // Step 4: Wait 500ms → Scroll to Credit Accounts
          setTimeout(() => {
            console.log("Step 4: Scrolled to Credit Accounts");
            smoothScrollToSection('credit-accounts', 20);
            
            // Step 5: Choreography Complete
            setTimeout(() => {
              console.log("Step 5: Hard Inquiries Choreography Complete");
              setIsHardInquiriesChoreographyActive(false);
            }, 500);
          }, 500);
        }, 500);
      }, 0);
    }
    
    // Reset choreography flag when save state changes to false
    if (!recentInquiriesSaved) {
      setHasRecentChoreographed(false);
      setHardInquiriesGreenShown(false);
    }
  }, [recentInquiriesSaved, hasRecentChoreographed, setHardCollapsed]);

  // REMOVED: Older Inquiries Save → Hard Inquiries Choreography
  // Per requirements: Only Recent Inquiries should trigger Hard Inquiries choreography
  // Older Inquiries save should only collapse the Older Inquiries section itself





  return (
    <div className="mb-4" ref={hardInquiriesRef} data-section="hard-inquiries">
      {hardCollapsed ? (
        <Card className={`${
          allInquiriesSaved || hardInquiriesGreenShown ? 'bg-green-50 border-[2px] border-green-500' : 'border-[2px] border-gray-200'
        } rounded-lg transition-all duration-300 hover:shadow-lg overflow-hidden`}>
          <CardHeader
            className={`cursor-pointer flex flex-row items-center justify-between p-6 ${
              allInquiriesSaved || hardInquiriesGreenShown ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-gray-50'
            } transition-colors duration-200`}
            onClick={() => {
              console.log("Hard Inquiries header clicked — scrolling to hard-inquiries");
              console.log("→ Hard Inquiries COLLAPSED clicked - isHardInquiriesChoreographyActive:", isHardInquiriesChoreographyActive);
              console.log("Hard Inquiries collapsed: true");
              console.log("Hard Inquiries saved state:", allInquiriesSaved);
              
              // Scroll to Hard Inquiries section
              const element = document.querySelector('[data-section="hard-inquiries"]');
              if (element) {
                const elementTop = element.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementTop - 20;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
              }
              
              // Allow expansion if choreography is not actively running
              if (!isHardInquiriesChoreographyActive) {
                console.log("→ Expanding Hard Inquiries section");
                setHardCollapsed(false);
                setShowHardInquiries(true);
                onExpand?.();
              } else {
                console.log("→ Expansion blocked by active choreography");
              }
            }}
          >
            <div className="flex items-center gap-3">
              {allInquiriesSaved || hardInquiriesGreenShown ? (
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                  <ThickCheckIcon className="w-4 h-4" />
                </div>
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  hardInquiriesColor === 'orange' ? 'bg-orange-500' : 'bg-gray-500'
                }`}>
                  {totalInquiriesCount}
                </div>
              )}
              <div>
                <h3 className={`text-lg font-bold ${allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 'text-gray-700'}`}>
                  {allInquiriesSaved || hardInquiriesGreenShown ? 'Hard Inquiries – Disputes Saved' : 'Hard Inquiries'}
                </h3>
                <p className={`text-sm ${
                  allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 
                  hardInquiriesColor === 'orange' ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {allInquiriesSaved || hardInquiriesGreenShown ? 
                    "You've saved disputes for inquiry items across TransUnion, Equifax, and Experian." :
                    getInquiryStatusText()
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-sm ${
                allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 
                hardInquiriesColor === 'orange' ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {totalInquiriesCount} inquiries
              </span>
              <ChevronDown className={
                allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 
                hardInquiriesColor === 'orange' ? 'text-orange-600' : 'text-gray-600'
              } />
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card
          className={`${
            allInquiriesSaved || hardInquiriesGreenShown ? 'bg-green-50 border-[2px] border-green-500' :
            showHardInquiries 
              ? 'border-[2px] border-gray-300' 
              : 'border-[2px] border-gray-200'
          } rounded-lg transition-all duration-300 hover:shadow-lg overflow-hidden`}
        >
          <CardHeader
            className={`cursor-pointer flex flex-row items-center p-6 ${
              allInquiriesSaved || hardInquiriesGreenShown ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-gray-50'
            } transition-colors duration-200`}
            onClick={() => {
              console.log("Hard Inquiries header clicked — scrolling to hard-inquiries");
              console.log("→ Hard Inquiries EXPANDED clicked - isHardInquiriesChoreographyActive:", isHardInquiriesChoreographyActive, "showHardInquiries:", showHardInquiries);
              console.log("Hard Inquiries collapsed:", !showHardInquiries);
              console.log("Hard Inquiries saved state:", allInquiriesSaved);
              
              // Scroll to Hard Inquiries section
              const element = document.querySelector('[data-section="hard-inquiries"]');
              if (element) {
                const elementTop = element.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementTop - 20;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
              }
              
              // Allow toggle if choreography is not actively running
              if (!isHardInquiriesChoreographyActive) {
                const newExpanded = !showHardInquiries;
                console.log("→ Toggling Hard Inquiries to:", newExpanded);
                setShowHardInquiries(newExpanded);
                setHardCollapsed(!newExpanded);
                
                // Call the centralized scroll function when expanding
                if (newExpanded) {
                  onExpand?.();
                }
              } else {
                console.log("→ Toggle blocked by active choreography");
              }
            }}
          >
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                {allInquiriesSaved || hardInquiriesGreenShown ? (
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                    <ThickCheckIcon className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-bold">
                    {totalInquiriesCount}
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-bold ${allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 'text-gray-700'}`}>
                    {allInquiriesSaved || hardInquiriesGreenShown ? 'Hard Inquiries – Disputes Saved' : 'Hard Inquiries'}
                  </h3>
                  <p className={`text-sm ${
                    allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {allInquiriesSaved || hardInquiriesGreenShown ? 
                      "You've saved disputes for inquiry items across TransUnion, Equifax, and Experian." :
                      getInquiryStatusText()
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-sm ${allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 'text-gray-600'}`}>{totalInquiriesCount} inquiries</span>
                {showHardInquiries ? <ChevronUp className={allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 'text-gray-600'} /> : <ChevronDown className={allInquiriesSaved || hardInquiriesGreenShown ? 'text-green-700' : 'text-gray-600'} />}
              </div>
            </div>
          </CardHeader>
          {showHardInquiries && (
            <CardContent className={allInquiriesSaved || hardInquiriesGreenShown ? 'bg-green-50' : 'bg-white'}>
              <Inquiries
                creditData={creditData}
                onDisputeSaved={onDisputeSaved}
                onHeaderReset={handleHeaderReset}
                onOlderInquiriesSaved={setOlderInquiriesSaved}
                onRecentInquiriesSaved={setRecentInquiriesSaved}
                onRecentInquiryDisputeSaved={onRecentInquiryDisputeSaved}
                onOlderInquiryDisputeSaved={onOlderInquiryDisputeSaved}
                initialRecentSelections={recentInquirySelections}
                initialOlderSelections={olderInquirySelections}
                initialRecentDisputeData={recentInquiryDispute}
                initialOlderDisputeData={olderInquiryDispute}
                aiViolations={aiViolations}
                aiSuggestions={aiSuggestions}
                aiScanCompleted={aiScanCompleted}
                recentInquiriesCollapsed={recentInquiriesCollapsed}
                setRecentInquiriesCollapsed={setRecentInquiriesCollapsed}
                onOlderExpand={onOlderExpand}
                isRecentInquiriesChoreographyActive={isRecentInquiriesChoreographyActive}
                isOlderInquiriesChoreographyActive={isOlderInquiriesChoreographyActive}
                olderInquiriesAutoCollapseComplete={olderInquiriesAutoCollapseComplete}
                recentInquiriesAutoCollapseComplete={recentInquiriesAutoCollapseComplete}
              />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}