import { useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const html = `
        <h2>Contact request from ${formData.name}</h2>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Subject:</strong> ${formData.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${formData.message.replace(/\n/g, "<br />")}</p>
      `;

      const { error } = await supabase.functions.invoke("send-email-notification", {
        body: JSON.stringify({
          to: "support@navexmarket.com",
          subject: `Navex Market contact form: ${formData.subject}`,
          html,
        }),
      });

      if (error) {
        throw error;
      }

      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Contact Us" 
        description="Get in touch with Navex Market - We'd love to hear from you" 
      />
      <Navbar />
      <div className="flex-1">
        <div className="container px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
              <p className="text-lg text-muted-foreground">
                Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="glass rounded-xl p-6 text-center">
                <Mail className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Email</h3>
                <a href="mailto:support@navexmarket.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  support@navexmarket.com
                </a>
              </div>

              <div className="glass rounded-xl p-6 text-center">
                <Phone className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Phone</h3>
                <a href="tel:+233123456789" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  +233 (0) 123 456 789
                </a>
              </div>

              <div className="glass rounded-xl p-6 text-center">
                <MapPin className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Location</h3>
                <p className="text-sm text-muted-foreground">
                  Accra, Ghana
                </p>
              </div>
            </div>

            <div className="glass rounded-xl p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    id="contact-name"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium mb-2">Subject</label>
                  <Input
                    id="contact-subject"
                    name="subject"
                    placeholder="Message subject"
                    value={formData.subject}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium mb-2">Message</label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    placeholder="Your message..."
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    className="resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                  disabled={loading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
