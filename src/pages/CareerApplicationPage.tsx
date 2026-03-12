import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';

const CAREER_POSITIONS = [
  { title: 'Chief Technology Officer (CTO)', department: 'Technology' },
  { title: 'Director of Partnerships', department: 'Sales & Partnerships' },
  { title: 'Chief Operating Officer (COO)', department: 'Operations' },
  { title: 'Head of Marketing', department: 'Marketing' },
  { title: 'Head of People', department: 'People & HR' },
];

type FormData = {
  positionTitle: string;
  department: string;
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  currentRole: string;
  currentCompany: string;
  yearsExperience: string;
  location: string;
  skills: string;
  education: string;
  summary: string;
  resumeFile: File | null;
};

const initialFormData: FormData = {
  positionTitle: '',
  department: '',
  name: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  currentRole: '',
  currentCompany: '',
  yearsExperience: '',
  location: '',
  skills: '',
  education: '',
  summary: '',
  resumeFile: null,
};

const CareerApplicationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = (location.state as { positionTitle?: string; department?: string } | null) || {};
  const positionPreSelected = Boolean(state.positionTitle);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    positionTitle: state.positionTitle ?? '',
    department: state.department ?? '',
  });
  const [submitting, setSubmitting] = useState(false);

  // When they clicked "Apply Now" on a specific job, skip the position step
  const steps = positionPreSelected
    ? [
        { title: 'Contact', description: 'Your details' },
        { title: 'Resume', description: 'Upload resume' },
        { title: 'Experience', description: 'Background' },
        { title: 'Cover letter', description: 'Why you' },
        { title: 'Review', description: 'Submit' },
      ]
    : [
        { title: 'Position', description: 'Confirm role' },
        { title: 'Contact', description: 'Your details' },
        { title: 'Resume', description: 'Upload resume' },
        { title: 'Experience', description: 'Background' },
        { title: 'Cover letter', description: 'Why you' },
        { title: 'Review', description: 'Submit' },
      ];

  const contentIndex = positionPreSelected ? step + 1 : step;

  const update = (updates: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...updates }));

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const validateStep = (): boolean => {
    switch (contentIndex) {
      case 0:
        if (!formData.positionTitle.trim()) {
          toast({ title: 'Please select a position', variant: 'destructive' });
          return false;
        }
        return true;
      case 1:
        if (!formData.name.trim() || !formData.email.trim()) {
          toast({ title: 'Name and email are required', variant: 'destructive' });
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast({ title: 'Please enter a valid email', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!formData.resumeFile) {
          toast({ title: 'Please upload your resume', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let resumeFilePath: string | null = null;
      if (formData.resumeFile) {
        const ext = formData.resumeFile.name.split('.').pop() || 'pdf';
        const path = `career-applications/resumes/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, formData.resumeFile, { contentType: formData.resumeFile.type, upsert: false });
        if (uploadError) {
          console.warn('Resume upload failed:', uploadError);
          toast({ title: 'Resume upload failed; application will still be submitted.', variant: 'destructive' });
        } else {
          resumeFilePath = path;
        }
      }

      let jobPostingId: string | null = null;
      const { data: posting } = await supabase
        .from('job_postings')
        .select('id')
        .eq('title', formData.positionTitle)
        .limit(1)
        .maybeSingle();
      if (posting?.id) jobPostingId = posting.id;

      const yearsNum = formData.yearsExperience ? parseInt(formData.yearsExperience, 10) : null;
      const skillsArr = formData.skills.trim()
        ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : null;

      const rpcParams: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
      };
      if (formData.phone.trim()) rpcParams.phone = formData.phone.trim();
      if (formData.linkedinUrl.trim()) rpcParams.linkedin_url = formData.linkedinUrl.trim();
      if (formData.currentRole.trim()) rpcParams.applicant_role = formData.currentRole.trim();
      if (formData.currentCompany.trim()) rpcParams.current_company = formData.currentCompany.trim();
      if (Number.isInteger(yearsNum) && yearsNum != null) rpcParams.years_experience = yearsNum;
      if (formData.location.trim()) rpcParams.location = formData.location.trim();
      if (skillsArr?.length) rpcParams.skills = skillsArr.join(',');
      if (formData.education.trim()) rpcParams.education = formData.education.trim();
      if (formData.summary.trim()) rpcParams.summary = formData.summary.trim();
      if (resumeFilePath) rpcParams.resume_file_path = resumeFilePath;
      if (jobPostingId) rpcParams.job_posting_id = jobPostingId;
      if (formData.positionTitle.trim()) rpcParams.position_title = formData.positionTitle.trim();

      const { data, error } = await supabase.functions.invoke('submit-career-application', {
        body: rpcParams,
      });

      if (error) throw error;
      if (data?.error) {
        const isAlreadyApplied = String(data.error).toLowerCase().includes('already');
        toast({
          title: isAlreadyApplied ? 'Already applied' : 'Application failed',
          description: data.error,
          variant: isAlreadyApplied ? 'default' : 'destructive',
        });
        if (isAlreadyApplied) setStep(steps.length);
        return;
      }
      setStep(steps.length); // success state
      toast({ title: 'Application submitted', description: "We'll be in touch." });
    } catch (err: unknown) {
      console.error('Career application error:', err);
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      const msg = e?.message ?? 'Submission failed';
      const isAlreadyApplied = msg.toLowerCase().includes('already');
      const extra = [e?.details, e?.hint].filter(Boolean).join(' ');
      toast({
        title: isAlreadyApplied ? 'Already applied' : 'Application failed',
        description: extra ? `${msg} — ${extra}` : msg,
        variant: isAlreadyApplied ? 'default' : 'destructive',
      });
      if (isAlreadyApplied) setStep(steps.length);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === steps.length) {
      return (
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">Application received</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for applying for {formData.positionTitle}. Your application has been sent directly to our HR team and we'll be in touch.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button asChild variant="outline">
                <Link to="/careers">Back to Careers</Link>
              </Button>
              <Button asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    switch (contentIndex) {
      case 0:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Which position are you applying for?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CAREER_POSITIONS.map((pos) => (
                <button
                  key={pos.title}
                  type="button"
                  onClick={() => update({ positionTitle: pos.title, department: pos.department })}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    formData.positionTitle === pos.title
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">{pos.title}</div>
                  <div className="text-sm text-muted-foreground">{pos.department}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              {positionPreSelected && (
                <p className="text-sm text-muted-foreground mb-2">
                  Applying for <strong className="text-foreground">{formData.positionTitle}</strong>
                </p>
              )}
              <CardTitle>Contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Jane Smith"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="jane@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => update({ linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Resume</CardTitle>
              <p className="text-sm text-muted-foreground">PDF, DOC, or DOCX. Max 10 MB.</p>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => update({ resumeFile: e.target.files?.[0] ?? null })}
                  className="cursor-pointer"
                />
                {formData.resumeFile && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <FileText className="inline h-4 w-4 mr-1" />
                    {formData.resumeFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Experience & background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentRole">Current role / title</Label>
                <Input
                  id="currentRole"
                  value={formData.currentRole}
                  onChange={(e) => update({ currentRole: e.target.value })}
                  placeholder="e.g. Senior Engineer"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="currentCompany">Current company</Label>
                <Input
                  id="currentCompany"
                  value={formData.currentCompany}
                  onChange={(e) => update({ currentCompany: e.target.value })}
                  placeholder="Company name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="yearsExperience">Years of experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min={0}
                  value={formData.yearsExperience}
                  onChange={(e) => update({ yearsExperience: e.target.value })}
                  placeholder="e.g. 10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => update({ location: e.target.value })}
                  placeholder="City, State or Remote"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => update({ skills: e.target.value })}
                  placeholder="Leadership, Strategy, ..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) => update({ education: e.target.value })}
                  placeholder="Degree, institution"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Cover letter (optional)</CardTitle>
              <p className="text-sm text-muted-foreground">Why you're interested and what you'd bring to the role.</p>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.summary}
                onChange={(e) => update({ summary: e.target.value })}
                placeholder="Tell us about yourself and why you want to join Crave'n..."
                className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={6}
              />
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Review your application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Position</span>
                <p className="font-medium">{formData.positionTitle}</p>
                <Badge variant="secondary">{formData.department}</Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Contact</span>
                <p className="font-medium">{formData.name}</p>
                <p className="text-sm">{formData.email}</p>
                {formData.phone && <p className="text-sm">{formData.phone}</p>}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Experience</span>
                <p className="text-sm">
                  {formData.currentRole}
                  {formData.currentCompany && ` at ${formData.currentCompany}`}
                  {formData.yearsExperience && ` · ${formData.yearsExperience} years`}
                </p>
                {formData.resumeFile && (
                  <p className="text-sm text-muted-foreground">
                    <FileText className="inline h-4 w-4 mr-1" />
                    {formData.resumeFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/careers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Careers
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="container mx-auto px-4 pb-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 flex-1">
        {renderStep()}

        {step < steps.length && (
          <div className="max-w-lg mx-auto mt-6 flex justify-between">
            {step === 0 && positionPreSelected ? (
              <Button variant="outline" asChild>
                <Link to="/careers">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Careers
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                onClick={() => {
                  if (validateStep()) handleNext();
                }}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit application'}
              </Button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CareerApplicationPage;
