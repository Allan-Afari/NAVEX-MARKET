import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Privacy Policy" 
        description="Navex Market Privacy Policy - Learn how we protect your data" 
      />
      <Navbar />
      <div className="flex-1">
        <div className="container px-4 pt-24 pb-12 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                Navex Market ("we", "us", "our", or "Company") operates the Navex Market platform. 
                This page informs you of our policies regarding the collection, use, and disclosure of personal data 
                when you use our Service and the choices you have associated with that data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information Collection and Use</h2>
              <p className="text-muted-foreground mb-4">
                We collect several different types of information for various purposes to provide and improve our Service to you.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Personal data: Name, email address, phone number, address</li>
                <li>Usage data: Pages visited, time spent, device information, IP address</li>
                <li>Business information: Company details, verification documents</li>
                <li>Financial information: Transaction history, payment methods</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Use of Data</h2>
              <p className="text-muted-foreground mb-4">
                Navex Market uses the collected data for various purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>To provide and maintain our Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To provide customer support and respond to your inquiries</li>
                <li>To gather analysis or valuable information so we can improve our Service</li>
                <li>To monitor the usage of our Service</li>
                <li>To detect, prevent, and address technical and security issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Security of Data</h2>
              <p className="text-muted-foreground mb-4">
                The security of your data is important to us but remember that no method of transmission over the Internet 
                or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect 
                your personal data, we cannot guarantee its absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
                Privacy Policy on this page and updating the "effective date" at the bottom of this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@navexmarket.com" className="text-primary hover:underline">
                  privacy@navexmarket.com
                </a>
              </p>
            </section>

            <div className="text-xs text-muted-foreground mt-8 pt-8 border-t border-border">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
