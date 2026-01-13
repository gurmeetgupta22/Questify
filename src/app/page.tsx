"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  GraduationCap, 
  Trophy, 
  FileText, 
  Download, 
  Plus, 
  Check, 
  Loader2, 
  ChevronRight,
  ArrowLeft,
  Printer,
  Sparkles,
  User as UserIcon,
  LogOut,
  History,
  Mail,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

// --- Types ---
type Domain = "School" | "College" | "Competitive";

interface Question {
  id: number;
  text: string;
  options?: string[];
  marks: number;
  answer?: string;
  explanation?: string;
}

interface Section {
  type: string;
  questions: Question[];
}

interface QuestionPaper {
  id?: string;
  title: string;
  domainInfo: string;
  instructions: string;
  sections: Section[];
  created_at?: string;
}

// --- Constants ---
const SCHOOL_CLASSES = Array.from({ length: 7 }, (_, i) => `Class ${i + 6}`);
const COLLEGE_COURSES = ["B.Tech", "B.Sc", "B.Com", "BA", "M.Tech", "M.Sc", "MBA"];
const COURSE_SUBJECTS: Record<string, string[]> = {
  "B.Tech": ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics & Communication"],
  "B.Sc": ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"],
  "B.Com": ["Accounting", "Finance", "Business Law", "Economics", "Taxation"],
  "BA": ["History", "Political Science", "Sociology", "Psychology", "English Literature"],
  "M.Tech": ["Advanced Data Structures", "VLSI Design", "Structural Engineering", "Thermal Engineering"],
  "M.Sc": ["Quantum Physics", "Organic Chemistry", "Real Analysis", "Microbiology"],
  "MBA": ["Marketing Management", "Financial Management", "Human Resource Management", "Operations Management"]
};
const EXAMS = ["NEET", "JEE Main", "JEE Advanced", "UPSC", "SSC", "Banking", "Custom"];

export default function QuestifyPage() {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- App State ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<Domain>("School");
  const [subDomain, setSubDomain] = useState("");
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["MCQs", "Short Answers"]);
  const [programmingLevels, setProgrammingLevels] = useState<string[]>(["Mid"]);
  const [sectionCounts, setSectionCounts] = useState<Record<string, number | string>>({ "MCQs": 5, "Short Answers": 5 });
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [includeExplanations, setIncludeExplanations] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<QuestionPaper | null>(null);
  const [previousPapers, setPreviousPapers] = useState<QuestionPaper[]>([]);
  
  const paperRef = useRef<HTMLDivElement>(null);

  // --- Auth Effects ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionLoading(false);
      if (session?.user) fetchPapers(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSessionLoading(false);
      if (session?.user) fetchPapers(session.user.id);
      else setPreviousPapers([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPapers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPreviousPapers(data.map(p => ({
        ...p.content,
        id: p.id,
        created_at: p.created_at
      })));
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  };

  const handleAuth = async (type: 'login' | 'signup') => {
    setAuthLoading(true);
    try {
      let result;
      if (type === 'signup') {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;
      
      if (type === 'signup') {
        if (result.data.session) {
          toast.success("Account created and logged in!");
          setIsAuthOpen(false);
        } else {
          toast.success("Account created! Redirecting...");
          // If the session isn't returned immediately (should be with the trigger), 
          // we can try to sign in with the same credentials
          const loginResult = await supabase.auth.signInWithPassword({ email, password });
          if (loginResult.data.session) {
            setIsAuthOpen(false);
          }
        }
      } else {
        toast.success("Welcome back!");
        setIsAuthOpen(false);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    setStep(1);
  };

  // --- Derived State ---
  const isComputerSubject = 
    (subject?.toLowerCase().includes("computer") || 
     subDomain?.toLowerCase().includes("computer") ||
     (domain === "College" && subDomain === "B.Tech" && subject === "Computer Science"));

  // --- Handlers ---
  const handleTypeToggle = (type: string) => {
    setQuestionTypes(prev => {
      const newTypes = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      
      // Sync sectionCounts
      setSectionCounts(prevCounts => {
        const next = { ...prevCounts };
        if (newTypes.includes(type) && !next[type]) {
          next[type] = 5;
        }
        return next;
      });
      
      return newTypes;
    });
  };

  const generatePaper = async () => {
    if (!subDomain || !topics || (domain === "College" && !subject)) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const formattedCounts = questionTypes.map(type => `${type}: ${sectionCounts[type] || 5}`).join(", ");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          subDomain,
          subject,
          topics,
          questionTypes,
          programmingLevels: questionTypes.includes("Programming codes") ? programmingLevels : null,
          numQuestions: formattedCounts,
          includeAnswers,
          includeExplanations
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setGeneratedPaper(data);
      setStep(3);
      toast.success("Question paper generated!");

      // Save to Supabase if user is logged in
      if (user) {
        await supabase.from('question_papers').insert({
          user_id: user.id,
          title: data.title,
          domain: domain,
          sub_domain: subDomain,
          content: data
        });
        fetchPapers(user.id);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!paperRef.current) return;
    
    try {
      toast.info("Preparing high-quality PDF...");
      const element = paperRef.current;
      
      // Temporary style to ensure it looks good for PDF
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1000,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('printable-paper');
          if (clonedElement) {
            clonedElement.style.padding = '40px';
            clonedElement.style.width = '1000px';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.color = '#000000';
            
            // Helper to convert any color to RGB using canvas
            const toRgb = (color: string) => {
              if (!color || color === 'transparent' || color === 'none') return color;
              if (color.startsWith('rgb') || color.startsWith('#')) return color;
              
              const tempCanvas = clonedDoc.createElement('canvas');
              tempCanvas.width = 1;
              tempCanvas.height = 1;
              const ctx = tempCanvas.getContext('2d');
              if (!ctx) return color;
              
              ctx.fillStyle = color;
              ctx.fillRect(0, 0, 1, 1);
              const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
              return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            };

            // Comprehensive fix for modern CSS colors (oklch, oklab) which html2canvas cannot parse
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const style = window.getComputedStyle(htmlEl);
              
              // Properties to check for modern colors
              const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'textDecorationColor', 'columnRuleColor'];
              
              colorProps.forEach(prop => {
                const value = style.getPropertyValue(prop.replace(/([A-Z])/g, "-$1").toLowerCase());
                if (value && (value.includes('oklch') || value.includes('oklab') || value.includes('var(') || value.includes('hsl'))) {
                  // Force to computed RGB value using our helper
                  (htmlEl.style as any)[prop] = toRgb(value);
                }
              });

              // Special handling for box-shadow as it often uses modern colors in Tailwind v4
              const boxShadow = style.boxShadow;
              if (boxShadow && (boxShadow.includes('oklch') || boxShadow.includes('oklab'))) {
                htmlEl.style.boxShadow = 'none'; 
              }
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Add subsequent pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Questify_${domain}_${subDomain}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to export PDF. Try printing instead.");
    }
  };

  const downloadTXT = () => {
    try {
      if (!generatedPaper) {
        toast.error("No paper found to export");
        return;
      }
      
      let content = `${generatedPaper.title}\n`;
      content += `${generatedPaper.domainInfo}\n`;
      content += `Instructions: ${generatedPaper.instructions}\n\n`;
      
      generatedPaper.sections.forEach(section => {
        content += `\n--- ${section.type} ---\n`;
        section.questions.forEach((q, idx) => {
          content += `${idx + 1}. ${q.text} [${q.marks} Marks]\n`;
          if (q.options && q.options.length > 0) {
            q.options.forEach((opt, i) => {
              content += `   ${String.fromCharCode(65 + i)}) ${opt}\n`;
            });
          }
          if (q.answer) content += `   Ans: ${q.answer}\n`;
          if (q.explanation) content += `   Exp: ${q.explanation}\n`;
          content += `\n`;
        });
      });

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Questify_${domain}_${subDomain}.txt`.replace(/\s+/g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("TXT downloaded!");
    } catch (err) {
      console.error("TXT Export Error:", err);
      toast.error("Failed to export TXT");
    }
  };

  const handlePrint = () => {
    const styleId = 'questify-print-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @media print {
          body * { visibility: hidden; }
          #printable-paper, #printable-paper * { visibility: visible; }
          #printable-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    }
    window.print();
  };

  // --- Render Steps ---
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="text-slate-500 font-medium animate-pulse">Initializing Questify...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Questify</h1>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 h-2 w-full" />
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to start generating and saving your practice papers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="name@example.com" 
                        className="pl-10 h-11" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        className="pl-10 pr-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        className="absolute right-3 top-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 mt-2" 
                    disabled={authLoading}
                    onClick={() => handleAuth('login')}
                  >
                    {authLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Sign In"}
                  </Button>
                </TabsContent>
                <TabsContent value="signup" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="name@example.com" 
                        className="pl-10 h-11" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        className="pl-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 mt-2" 
                    disabled={authLoading}
                    onClick={() => handleAuth('signup')}
                  >
                    {authLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Create Account"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border-t py-4">
              <p className="text-xs text-center text-slate-500">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(1)}>
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Questify</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <Button 
                variant="ghost" 
                size="sm" 
                className={step === 4 ? "text-indigo-600" : ""}
                onClick={() => setStep(4)}
              >
                <History className="h-4 w-4 mr-2" /> My Papers
              </Button>
            )}
            
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-xs font-medium text-slate-500">Logged in as</span>
                  <span className="text-sm font-bold truncate max-w-[150px]">{user.email}</span>
                </div>
                <Button variant="outline" size="icon" onClick={handleLogout} className="rounded-full">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full px-6">
                    Sign In
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Welcome to Questify</DialogTitle>
                    <DialogDescription className="text-center">
                      Save your progress and access generated papers anytime.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="login" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">Login</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="name@example.com" 
                            className="pl-10" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            className="pl-10 pr-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button 
                            className="absolute right-3 top-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-indigo-600" 
                        disabled={authLoading}
                        onClick={() => handleAuth('login')}
                      >
                        {authLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Sign In"}
                      </Button>
                    </TabsContent>
                    <TabsContent value="signup" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="name@example.com" 
                            className="pl-10" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            className="pl-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-indigo-600" 
                        disabled={authLoading}
                        onClick={() => handleAuth('signup')}
                      >
                        {authLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Create Account"}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            )}

            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(prev => prev === 4 ? 1 : prev - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <Badge variant="outline" className="px-3 py-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
                  AI-Powered Practice
                </Badge>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  Generate Your Next <span className="text-indigo-600">Practice Paper</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                  Questify creates syllabus-aligned questions for school, college, and competitive exams in seconds.
                </p>
                {!user && (
                  <div className="pt-4">
                    <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50" onClick={() => setIsAuthOpen(true)}>
                      Sign up to save your papers
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DomainCard 
                  icon={<BookOpen className="h-8 w-8 text-blue-500" />}
                  title="School"
                  description="Class 6 to 12. Support for CBSE, ICSE and State boards."
                  selected={domain === "School"}
                  onClick={() => { setDomain("School"); setStep(2); }}
                />
                <DomainCard 
                  icon={<GraduationCap className="h-8 w-8 text-emerald-500" />}
                  title="College"
                  description="UG/PG courses, semesters and specific subjects."
                  selected={domain === "College"}
                  onClick={() => { setDomain("College"); setStep(2); }}
                />
                <DomainCard 
                  icon={<Trophy className="h-8 w-8 text-amber-500" />}
                  title="Competitive"
                  description="NEET, JEE, UPSC, SSC, Banking and more."
                  selected={domain === "Competitive"}
                  onClick={() => { setDomain("Competitive"); setStep(2); }}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="border-slate-200 dark:border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Configure Your Paper</CardTitle>
                  <CardDescription>Customize the details for your {domain} practice set.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sub-domain Selection */}
                  <div className="space-y-2">
                    <Label>{domain === "School" ? "Select Class" : domain === "College" ? "Select Course" : "Select Exam"}</Label>
                    <Select onValueChange={(val) => { setSubDomain(val); setSubject(""); }} value={subDomain}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Choose ${domain === "School" ? "Class" : domain === "College" ? "Course" : "Exam"}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {domain === "School" && SCHOOL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        {domain === "College" && COLLEGE_COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        {domain === "Competitive" && EXAMS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject Selection for College */}
                  {domain === "College" && subDomain && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <Label>Select Subject</Label>
                      <Select onValueChange={setSubject} value={subject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {COURSE_SUBJECTS[subDomain]?.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  {/* Topics Input */}
                  <div className="space-y-2">
                    <Label htmlFor="topics">Topics (comma separated)</Label>
                    <Input 
                      id="topics" 
                      placeholder="e.g. Trigonometry, Calculus, Organic Chemistry" 
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                    />
                  </div>

                  {/* Question Types */}
                  <div className="space-y-3">
                    <Label>Question Types</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {["MCQs", "Short Answers", "Long Answers", "Case-based", ...(isComputerSubject ? ["Programming codes"] : [])].map((type) => (
                        <div key={type} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => handleTypeToggle(type)}>
                          <Checkbox id={type} checked={questionTypes.includes(type)} onCheckedChange={() => handleTypeToggle(type)} />
                          <label htmlFor={type} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section Wise Questions */}
                  {questionTypes.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
                    >
                      <Label className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Set Questions per Section
                      </Label>
                      <div className="space-y-4">
                        {questionTypes.map((type, idx) => (
                          <div key={type} className="flex items-center justify-between gap-4">
                            <Label htmlFor={`count-${type}`} className="text-sm">
                              Section {String.fromCharCode(65 + idx)}: <span className="font-bold">{type}</span>
                            </Label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Questions:</span>
                              <Input 
                                id={`count-${type}`}
                                type="number"
                                min={1}
                                max={20}
                                className="w-20 h-9"
                                value={sectionCounts[type] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : parseInt(e.target.value);
                                  setSectionCounts(prev => ({ ...prev, [type]: val }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <Separator />

                  {/* Toggles */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Include Answers</Label>
                        <p className="text-sm text-slate-500">Add correct answers to the paper</p>
                      </div>
                      <Switch checked={includeAnswers} onCheckedChange={setIncludeAnswers} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Include Explanations</Label>
                        <p className="text-sm text-slate-500">Provide logical reasoning for answers</p>
                      </div>
                      <Switch checked={includeExplanations} onCheckedChange={setIncludeExplanations} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg" disabled={loading} onClick={generatePaper}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Question Paper
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {step === 3 && generatedPaper && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Preview Your Paper</h2>
                  <p className="text-slate-500">Ready to download or print</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadTXT}>
                    <FileText className="h-4 w-4 mr-2" /> TXT
                  </Button>
                  <Button variant="outline" onClick={downloadPDF}>
                    <Download className="h-4 w-4 mr-2" /> PDF
                  </Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </div>
              </div>

              {/* Paper Content Preview */}
              <div 
                ref={paperRef}
                id="printable-paper"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-8 md:p-12 min-h-[1000px] text-slate-900 dark:text-slate-100"
              >
                <div className="text-center space-y-2 mb-10">
                  <div className="flex justify-center mb-4">
                    <div className="bg-indigo-600 p-2 rounded-xl">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-black uppercase tracking-widest border-b-4 border-indigo-600 inline-block px-4 pb-1">
                    {generatedPaper.title}
                  </h1>
                  <p className="text-lg font-bold text-indigo-600 pt-2">{generatedPaper.domainInfo}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-8 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-2">Instructions:</h3>
                  <p className="text-sm leading-relaxed italic">{generatedPaper.instructions}</p>
                </div>

                <div className="space-y-12">
                  {generatedPaper.sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black uppercase bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-1">
                          SECTION {String.fromCharCode(65 + sIdx)}
                        </h2>
                        <span className="font-bold text-slate-500 tracking-wider">— {section.type}</span>
                        <div className="flex-1 border-b-2 border-slate-100 dark:border-slate-800" />
                      </div>

                      <div className="space-y-8 pl-2">
                        {section.questions.map((q, qIdx) => (
                          <div key={qIdx} className="space-y-3 relative group">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-3">
                                <span className="font-bold text-indigo-600">Q{qIdx + 1}.</span>
                                <p className="font-medium text-lg leading-relaxed">{q.text}</p>
                              </div>
                              <span className="shrink-0 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold">
                                {q.marks} Marks
                              </span>
                            </div>

                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2 text-sm border border-slate-100 dark:border-slate-800 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <span className="font-bold text-slate-400">{String.fromCharCode(65 + oIdx)}.</span>
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {(q.answer || q.explanation) && (
                              <div className="mt-4 pl-8 border-l-2 border-indigo-100 dark:border-indigo-900 space-y-2 py-1">
                                {q.answer && (
                                  <div className="text-sm">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Answer:</span> 
                                    {section.type.includes("Programming") || q.answer.includes(";") || q.answer.includes("{") ? (
                                      <CodeBlock code={q.answer} />
                                    ) : (
                                      <span className="ml-1">{q.answer}</span>
                                    )}
                                  </div>
                                )}
                                {q.explanation && (
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Explanation:</span> {q.explanation}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-20 pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 uppercase tracking-[0.2em]">
                  Generated by Questify AI • Focus on Practice, Excel in Exams
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Previous Papers</h2>
                  <p className="text-slate-500">Access your history of generated questions</p>
                </div>
                <Button onClick={() => setStep(1)} className="bg-indigo-600">
                  <Plus className="h-4 w-4 mr-2" /> New Paper
                </Button>
              </div>

              {previousPapers.length === 0 ? (
                <Card className="p-12 text-center space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <History className="h-8 w-8 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle>No history yet</CardTitle>
                    <CardDescription>Generated papers will appear here for you to download again anytime.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Generate your first paper
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previousPapers.map((paper, idx) => (
                    <Card 
                      key={paper.id || idx} 
                      className="group hover:border-indigo-600 transition-all cursor-pointer overflow-hidden"
                      onClick={() => { setGeneratedPaper(paper); setStep(3); }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30">
                            {paper.domainInfo.split(' ')[0]}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            {paper.created_at ? new Date(paper.created_at).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>
                        <CardTitle className="text-lg line-clamp-1 mt-2">{paper.title}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">
                          {paper.instructions}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="bg-slate-50 dark:bg-slate-900 py-2 px-6 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-slate-500">
                          {paper.sections.reduce((acc, s) => acc + s.questions.length, 0)} QUESTIONS
                        </span>
                        <ChevronRight className="h-4 w-4 text-indigo-600" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Questify. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---
function CodeBlock({ code }: { code: string }) {
  return (
    <div className="code-snippet-container my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-50 font-mono text-xs md:text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Code Solution</span>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/20" />
          <div className="w-2 h-2 rounded-full bg-amber-500/20" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
        </div>
      </div>
      <pre className="p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        <code className="block">{code.trim()}</code>
      </pre>
    </div>
  );
}

function DomainCard({ icon, title, description, selected, onClick }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  selected: boolean,
  onClick: () => void 
}) {
  return (
    <Card 
      className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl group ${
        selected ? 'border-indigo-600' : 'hover:border-indigo-200 dark:hover:border-indigo-800'
      }`}
      onClick={onClick}
    >
      <AnimatePresence>
        {selected && (
          <motion.div
            layoutId="highlight"
            className="absolute inset-0 bg-indigo-600/5 dark:bg-indigo-600/10 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </AnimatePresence>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity z-10">
        {icon}
      </div>
      <CardHeader className="relative z-10">
        <div className="mb-2">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="relative z-10">
        <div className={`flex items-center text-sm font-medium ${selected ? 'text-indigo-600' : 'text-slate-500'}`}>
          Select {title} <ChevronRight className="ml-1 h-4 w-4" />
        </div>
      </CardFooter>
      {selected && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 bg-indigo-600 text-white rounded-full p-1 z-20"
        >
          <Check className="h-3 w-3" />
        </motion.div>
      )}
    </Card>
  );
}
