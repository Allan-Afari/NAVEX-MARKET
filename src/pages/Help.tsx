import Navbar from "@/components/landing/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Book, Video, MessageCircle, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const Help = () => {
  const navigate = useNavigate();

  const helpCategories = [
    {
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics of using Navex Market",
      articles: [
        "How to create an account",
        "Understanding your dashboard",
        "Posting your first opportunity",
        "Browsing investment opportunities",
      ],
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Watch step-by-step video guides",
      articles: [
        { title: "Complete platform walkthrough", videoId: "platform-walkthrough" },
        { title: "Creating a deal room", videoId: "deal-room-create" },
        { title: "Using document templates", videoId: "document-templates" },
        { title: "Managing agreements", videoId: "agreements-manage" },
      ],
    },
    {
      icon: Shield,
      title: "Verification",
      description: "How to verify your identity with Smile ID",
      articles: [
        "Why verification matters",
        "Smile ID verification process",
        "Manual document upload",
        "Troubleshooting verification issues",
      ],
    },
    {
      icon: MessageCircle,
      title: "Support",
      description: "Get help from our support team",
      articles: [
        "Contact support",
        "Report a bug",
        "Feature requests",
        "Billing inquiries",
      ],
    },
  ];

  const faqs = [
    {
      question: "How do I verify my identity?",
      answer: "You can verify your identity using Smile ID during onboarding or from your profile settings. Alternatively, you can upload manual documents for verification.",
    },
    {
      question: "What are deal rooms?",
      answer: "Deal rooms are secure collaboration spaces where you can chat, share documents, negotiate terms, and manage agreements with potential investors or business partners.",
    },
    {
      question: "How do I post an investment opportunity?",
      answer: "Navigate to the marketplace and click 'Post Opportunity'. Fill in the required details about your business, funding needs, and sector. Your opportunity will be reviewed before going live.",
    },
    {
      question: "What subscription plans are available?",
      answer: "We offer Free, Pro (GH₵150/month), and Premium (GH₵450/month) plans. Pro and Premium include additional features like advanced analytics, priority matching, and bulk operations.",
    },
    {
      question: "How do I resolve a dispute?",
      answer: "If you have an issue with a deal or user, you can file a dispute from the deal room or your profile. Our admin team will review and mediate the dispute.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Help Center"
        description="Find answers and learn how to use Navex Market"
      />
      <Navbar />
      <div className="container px-4 pt-24 pb-12 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground mb-8">Find answers and learn how to use Navex Market</p>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {helpCategories.map((category) => (
            <Card
              key={category.title}
              className="hover:border-primary cursor-pointer transition-colors"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="w-5 h-5 text-primary" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {category.description}
                </p>
                <ul className="space-y-2">
                  {category.articles.map((article) => (
                    <li
                      key={typeof article === 'string' ? article : article.videoId}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {typeof article === 'string' ? article : article.title}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4 mb-8">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-2">Still need help?</h3>
                <p className="text-sm text-muted-foreground">
                  Our support team is here to assist you
                </p>
              </div>
              <Button onClick={() => navigate("/contact")}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
