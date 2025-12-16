import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  MapPin,
  Share2,
  MessageCircle,
  Phone,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Presentation,
  Users,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface InvestmentOpportunity {
  id: string;
  company_name: string;
  location: string;
  logo_url?: string;
  banner_url?: string;
  short_summary: string;
  highlights: string[];
  target_amount: number;
  minimum_investment: number;
  investment_raised: number;
  previous_rounds: number;
  stage: string;
  investor_role: string;
  business_description: string;
  market_description: string;
  progress_description: string;
  objectives_description: string;
  why_we_win: string;
  deal_description: string;
  video_url?: string;
  gallery_images?: string[];
  tags: string[];
  team_members: Array<{
    name: string;
    role: string;
    bio: string;
    photo_url?: string;
  }>;
  financials: Array<{
    year: number;
    turnover: number;
    profit: number;
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
  }>;
}

const PitchDeck: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [interested, setInterested] = useState(false);
  const [question, setQuestion] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dialCode, setDialCode] = useState('+1');
  const stickyNavRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);

  // Fetch investment opportunity data
  useEffect(() => {
    const fetchOpportunity = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('investment_opportunities')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error('Investment opportunity not found');
        }

        // Parse JSONB fields
        const parsed = {
          ...data,
          highlights: data.highlights || [],
          tags: data.tags || [],
          gallery_images: data.gallery_images || [],
          financials: (data.financials as any) || [],
          documents: (data.documents as any) || [],
          team_members: (data.team_members as any) || [],
        };

        setOpportunity(parsed as InvestmentOpportunity);
      } catch (error) {
        console.error('Error fetching opportunity:', error);
        toast({
          title: 'Error',
          description: 'Failed to load investment opportunity',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, [id, toast]);

  // Sticky nav scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!stickyNavRef.current) return;

      const scrollY = window.scrollY;
      const navOffset = 200; // Approximate hero section height

      // Update active tab based on scroll position
      const sections = [
        { ref: overviewRef, id: 'overview' },
        { ref: detailsRef, id: 'details' },
        { ref: teamRef, id: 'team' },
        { ref: documentsRef, id: 'documents' },
        { ref: questionsRef, id: 'questions' },
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveTab(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
      overview: overviewRef,
      details: detailsRef,
      team: teamRef,
      documents: documentsRef,
      questions: questionsRef,
    };

    const ref = refs[sectionId];
    if (ref?.current) {
      const offset = 100;
      const elementPosition = ref.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveTab(sectionId);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setShareModalOpen(true);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleShortlist = async () => {
    // TODO: Implement shortlist functionality with backend
    setShortlisted(!shortlisted);
    toast({
      title: shortlisted ? 'Removed from shortlist' : 'Added to shortlist',
      description: shortlisted
        ? 'This opportunity has been removed from your shortlist'
        : 'This opportunity has been added to your shortlist',
    });
  };

  const handleInterest = async () => {
    // TODO: Implement interest functionality with backend
    setInterested(true);
    toast({
      title: 'Interest recorded',
      description: 'Your interest has been recorded. The entrepreneur will be notified.',
    });
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    // TODO: Implement question submission with backend
    toast({
      title: 'Question sent',
      description: 'Your question has been sent to the entrepreneur.',
    });
    setQuestion('');
    setQuestionModalOpen(false);
  };

  const handleCallRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    // TODO: Implement call request with backend
    toast({
      title: 'Call request sent',
      description: 'Your call request has been sent. The entrepreneur will contact you soon.',
    });
    setPhoneNumber('');
    setCallModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investment opportunity...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Investment Opportunity Not Found</h1>
          <p className="text-gray-600 mb-6">The opportunity you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="w-full relative">
        <div className="w-full h-48 md:h-96 relative">
          {opportunity.banner_url ? (
            <img
              src={opportunity.banner_url}
              alt={opportunity.company_name}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-orange-500 to-orange-600"></div>
          )}
        </div>
        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent">
          <div className="w-full absolute md:px-10 px-3 bottom-5 py-5">
            <div className="flex md:items-center items-start gap-4">
              {opportunity.logo_url && (
                <div className="w-20 h-20 shrink-0 rounded-sm border border-white bg-white xs:inline-flex hidden items-center justify-center">
                  <img
                    src={opportunity.logo_url}
                    alt={opportunity.company_name}
                    className="w-full h-full object-cover object-center rounded-sm"
                  />
                </div>
              )}
              <div className="flex grow flex-col">
                <h1 className="text-white text-2xl mb-0 font-semibold drop-shadow-sm">
                  {opportunity.company_name}
                </h1>
                <p className="text-sm flex items-end text-white drop-shadow-sm font-medium">
                  <MapPin className="w-4 h-4 text-blue-400 mr-1" />
                  {opportunity.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Navigation */}
      <div
        ref={stickyNavRef}
        className="w-full border-b border-gray-300 z-10 bg-white sticky top-0"
      >
        <div className="w-full md:max-w-7xl mx-auto flex items-center justify-between lg:px-5 px-3 scrollbar-hide overflow-x-auto gap-4 py-4">
          <div className="flex items-center gap-4 text-gray-800 text-base">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'details', label: 'Pitch Details' },
              { id: 'team', label: 'The Team' },
              { id: 'documents', label: 'Documents' },
              { id: 'questions', label: 'Questions & Answers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`whitespace-nowrap block px-2 py-2 border-b-3 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent hover:border-blue-600 text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-4">
            <Button
              onClick={handleInterest}
              className="bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap"
            >
              I'm interested
            </Button>
            <Button
              onClick={handleShortlist}
              variant="outline"
              className={`whitespace-nowrap ${shortlisted ? 'bg-gray-200' : ''}`}
            >
              {shortlisted ? 'Shortlisted' : 'Shortlist'}
            </Button>
            <Button onClick={handleShare} variant="outline" size="icon">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div ref={overviewRef} className="w-full bg-white scroll-mt-24">
        <div className="py-12 w-full md:max-w-7xl mx-auto bg-white lg:px-5 px-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            <div className="md:col-span-1 lg:col-span-2 w-full">
              {/* Risk Disclaimer */}
              <div className="p-4 mb-12 text-sm text-gray-900 font-semibold border-2 border-gray-900 w-full bg-yellow-50">
                <strong className="text-sm">Please note:</strong>
                <br />
                <span className="text-sm">
                  Investing in early stage businesses involves risks, including illiquidity, lack of
                  dividends, loss of investment and dilution, and it should be done only as part of a
                  diversified portfolio. This platform is targeted solely at investors who are
                  sufficiently sophisticated to understand these risks and make their own investment
                  decisions. Investors are encouraged to review and evaluate the investments and
                  determine at their own discretion, the appropriateness of making the particular
                  investment.
                </span>
              </div>

              {/* Short Summary */}
              <div className="w-full mb-12">
                <h2 className="text-2xl font-normal mb-4 text-gray-800">Short Summary</h2>
                <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
                  {opportunity.short_summary}
                </p>
              </div>

              {/* Highlights */}
              <div className="w-full py-12">
                <h2 className="text-2xl font-normal mb-4 text-gray-800">Highlights</h2>
                <ul className="list-disc pl-5 space-y-2">
                  {opportunity.highlights.map((highlight, index) => (
                    <li key={index} className="font-bold text-xl text-gray-800 leading-8">
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Overview Table */}
            <div className="md:col-span-1 w-full">
              <h2 className="text-2xl font-normal mb-4">Overview</h2>
              <table className="w-full border-spacing-2 text-base text-gray-800">
                <tbody>
                  <tr>
                    <td className="border-t border-b py-2">Target</td>
                    <td className="border-t border-b py-2 text-right">
                      <strong>${opportunity.target_amount.toLocaleString()}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-t border-b py-2">Minimum</td>
                    <td className="border-t border-b py-2 text-right">
                      <strong>${opportunity.minimum_investment.toLocaleString()}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-t border-b py-2">Investment Raised</td>
                    <td className="border-t border-b py-2 text-right">
                      <strong>${opportunity.investment_raised.toLocaleString()}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-t border-b py-2">Previous Rounds</td>
                    <td className="border-t border-b py-2 text-right">
                      <strong>${opportunity.previous_rounds.toLocaleString()}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-t border-b py-2">Stage</td>
                    <td className="border-t border-b py-2 text-right">
                      <strong>{opportunity.stage}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-t border-b py-2">Investor Role</td>
                    <td className="border-t border-b py-2 text-right">
                      <strong>{opportunity.investor_role}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Ask Question Box */}
              <div className="mt-16 p-4 rounded shadow border border-gray-200 bg-gray-50 text-gray-700 text-base">
                <p className="mb-1">
                  <strong>Got a question about this project?</strong>
                </p>
                <p className="text-sm mb-3">
                  If you need any more info, you can contact the entrepreneur directly.
                </p>
                <Button
                  onClick={() => setQuestionModalOpen(true)}
                  className="mt-2 bg-blue-400 hover:bg-blue-600 text-white w-full"
                >
                  Ask a question
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Section */}
      {opportunity.video_url && (
        <div className="w-full bg-white py-8">
          <div className="max-w-7xl mx-auto lg:px-5 px-3 w-full bg-white">
            <div className="lg:w-2/3 w-full relative">
              <video
                src={opportunity.video_url}
                controls
                className="w-full h-auto rounded-lg shadow-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* Pitch Details Section */}
      <div ref={detailsRef} className="py-12 w-full md:max-w-7xl mx-auto bg-white lg:px-5 px-3 scroll-mt-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          <div className="lg:col-span-2 col-span-3 w-full space-y-12">
            {opportunity.business_description && (
              <div className="w-full">
                <h2 className="text-2xl font-normal mb-4 text-gray-800">The Business</h2>
                <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
                  {opportunity.business_description}
                </p>
              </div>
            )}

            {opportunity.market_description && (
              <div className="w-full">
                <h2 className="text-2xl font-normal mb-4 text-gray-800">The Market</h2>
                <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
                  {opportunity.market_description}
                </p>
              </div>
            )}

            {opportunity.progress_description && (
              <div className="w-full">
                <h2 className="text-2xl font-normal mb-4 text-gray-800">Progress/Proof</h2>
                <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
                  {opportunity.progress_description}
                </p>
              </div>
            )}

            {opportunity.objectives_description && (
              <div className="w-full">
                <h2 className="text-2xl font-normal mb-4 text-gray-800">Objectives/Future</h2>
                <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
                  {opportunity.objectives_description}
                </p>
              </div>
            )}

            {opportunity.why_we_win && (
              <div className="w-full">
                <h2 className="text-2xl font-normal mb-4 text-gray-800">Why We Win</h2>
                <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
                  {opportunity.why_we_win}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full px-5 text-center mt-12">
          <Button
            onClick={handleInterest}
            className="bg-blue-400 hover:bg-blue-600 text-white"
            size="lg"
          >
            I'm interested
          </Button>
        </div>
      </div>

      {/* Social Engagement */}
      <div className="py-20 px-3 bg-gray-800 w-full">
        <div className="md:max-w-7xl mx-auto text-center">
          <h2 className="text-2xl text-white font-medium mb-6">
            What do you think of this project?
          </h2>
          <div className="flex items-center justify-center flex-wrap gap-4">
            <Button
              variant="outline"
              className="border-blue-100 text-blue-100 hover:bg-blue-50 hover:text-blue-400"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Like it
            </Button>
            <Button
              variant="outline"
              className="border-blue-100 text-blue-100 hover:bg-blue-50 hover:text-blue-400"
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Not interested
            </Button>
          </div>
        </div>
      </div>

      {/* Financials Section */}
      {opportunity.financials && opportunity.financials.length > 0 && (
        <div className="w-full py-16 bg-blue-50 px-3">
          <div className="md:max-w-7xl mx-auto mb-4">
            <h2 className="text-2xl font-normal">Financials</h2>
          </div>
          <div className="md:max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Year</th>
                    <th className="text-right py-2 font-semibold">Turnover</th>
                    <th className="text-right py-2 font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunity.financials.map((financial, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{financial.year}</td>
                      <td className="text-right py-2">
                        ${financial.turnover.toLocaleString()}
                      </td>
                      <td className="text-right py-2">${financial.profit.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Team Section */}
      <div ref={teamRef} className="py-16 w-full md:max-w-7xl mx-auto bg-white lg:px-5 px-3 scroll-mt-24">
        <div className="w-full mb-8">
          <h2 className="text-2xl font-normal mb-4 text-gray-800">The Team</h2>
          {opportunity.team_members && opportunity.team_members.length > 0 ? (
            <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
              Our team combines expertise across product development, logistics, marketing, and
              financial discipline.
            </p>
          ) : (
            <p className="text-lg leading-10 break-words pb-5 m-0 text-gray-700">
              Team information coming soon.
            </p>
          )}
        </div>

        {opportunity.team_members?.map((member, index) => (
          <div key={index} className="flex items-start md:gap-5 gap-4 mb-12 mt-8">
            {member.photo_url ? (
              <div className="shrink-0 md:w-24 md:h-24 w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            ) : (
              <div className="shrink-0 md:w-24 md:h-24 w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold border-2 border-gray-200">
                {member.name.charAt(0)}
              </div>
            )}
            <div className="flex flex-col flex-1">
              <h4 className="text-gray-800 text-xl font-normal capitalize my-0">
                {member.name}
              </h4>
              <span className="text-sm text-gray-600 font-normal">{member.role}</span>
              <p className="text-sm text-gray-800 font-normal mt-3">{member.bio}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Deal Section */}
      <div className="py-20 px-3 bg-gray-800 w-full">
        <div className="md:max-w-7xl mx-auto">
          <h2 className="text-3xl text-white font-medium mb-4">The Deal</h2>
          <h3 className="text-3xl text-white font-medium mb-2">
            Looking for ${opportunity.target_amount.toLocaleString()}
          </h3>
          <p className="text-xl text-white mb-4">
            Min per Investor ${opportunity.minimum_investment.toLocaleString()}
          </p>
          {opportunity.deal_description && (
            <p className="text-lg leading-10 break-words m-0 text-white mb-5">
              {opportunity.deal_description}
            </p>
          )}
          <Button
            onClick={handleInterest}
            className="bg-blue-400 hover:bg-blue-600 text-white"
            size="lg"
          >
            I'm interested
          </Button>
        </div>
      </div>

      {/* Documents Section */}
      <div ref={documentsRef} className="py-16 w-full md:max-w-7xl mx-auto bg-white lg:px-5 px-3 scroll-mt-24">
        <h2 className="text-2xl font-normal mb-4 text-gray-800">Documents</h2>
        <div className="w-full p-7 rounded-sm bg-gray-100 text-blue-600 text-sm mb-6 border border-blue-200">
          <strong>Please note:</strong> If you download any of these documents, you'll be added to
          the entrepreneur's contact list and they'll be able to message you.
        </div>
        {opportunity.documents && opportunity.documents.length > 0 ? (
          <div className="grid md:grid-cols-2 grid-cols-1 w-full gap-8 py-6">
            {opportunity.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                {doc.type === 'PDF' || doc.name.toLowerCase().includes('pdf') ? (
                  <FileText className="w-14 h-14 text-red-500 group-hover:scale-110 transition-transform" />
                ) : (
                  <Presentation className="w-14 h-14 text-blue-500 group-hover:scale-110 transition-transform" />
                )}
                <span className="font-bold text-gray-700 group-hover:text-blue-600">
                  {doc.name}
                </span>
                <Download className="w-5 h-5 text-gray-400 ml-auto group-hover:text-blue-600" />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No documents available at this time.</p>
          </div>
        )}
      </div>

      {/* Questions Section */}
      <div
        ref={questionsRef}
        className="py-20 px-3 bg-gray-800 w-full bg-no-repeat bg-cover bg-center scroll-mt-24"
      >
        <div className="md:max-w-7xl mx-auto">
          <p className="text-base text-white mb-2">Got a question about this project?</p>
          <p className="text-lg leading-10 break-words pb-5 m-0 text-white mb-4">
            If you need any more info, you can contact the entrepreneur directly.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button
              onClick={() => setQuestionModalOpen(true)}
              className="bg-blue-400 hover:bg-blue-600 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask a question
            </Button>
            <Button
              onClick={() => setCallModalOpen(true)}
              variant="outline"
              className="border-blue-100 text-blue-100 hover:bg-blue-50 hover:text-blue-400"
            >
              <Phone className="w-4 h-4 mr-2" />
              Request a call
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery */}
      {opportunity.gallery_images && opportunity.gallery_images.length > 0 && (
        <div className="py-16 w-full bg-slate-100 lg:px-5 px-3">
          <div className="gallery md:max-w-7xl mx-auto w-full flex items-center overflow-x-auto h-96 gap-4 pb-4">
            {opportunity.gallery_images.map((image, index) => (
              <img
                key={index}
                className="md:w-auto w-full h-full object-cover object-center bg-gray-200 rounded-lg shadow-md hover:scale-105 transition-transform cursor-pointer"
                src={image}
                alt={`Gallery ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {opportunity.tags && opportunity.tags.length > 0 && (
        <div className="py-16 w-full md:max-w-7xl mx-auto bg-white lg:px-5 px-3">
          <h2 className="text-2xl font-normal mb-4 text-gray-800">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {opportunity.tags.map((tag, index) => (
              <a
                key={index}
                href={`/business-proposal?searchQuery=${encodeURIComponent(tag)}`}
                className="hover:underline hover:text-gray-800 border border-gray-400 text-gray-400 rounded-sm py-1.5 px-3.5 hover:border-gray-600 transition-colors"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share this pitch</DialogTitle>
            <DialogDescription>
              Copy and share the link below or share directly to your social channel.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input readOnly value={window.location.href} className="flex-1" />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: 'Copied!',
                    description: 'Link copied to clipboard',
                  });
                }}
              >
                Copy
              </Button>
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  window.open(
                    `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}`,
                    '_blank'
                  );
                }}
              >
                LinkedIn
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(
                    `https://www.facebook.com/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                    '_blank'
                  );
                }}
              >
                Facebook
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`,
                    '_blank'
                  );
                }}
              >
                Twitter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Modal */}
      <Dialog open={questionModalOpen} onOpenChange={setQuestionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask a question</DialogTitle>
            <DialogDescription>
              Send your question directly to the entrepreneur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div>
              <Label htmlFor="question">Your Question</Label>
              <Textarea
                id="question"
                placeholder="Add your question here"
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuestionModalOpen(false);
                  setQuestion('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-400 hover:bg-blue-600 text-white">
                Send
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Call Request Modal */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a call</DialogTitle>
            <DialogDescription>
              Provide your phone number and the entrepreneur will contact you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCallRequest} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="+1"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                className="w-24"
              />
              <Input
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                type="tel"
                className="flex-1"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCallModalOpen(false);
                  setPhoneNumber('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-400 hover:bg-blue-600 text-white">
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PitchDeck;


