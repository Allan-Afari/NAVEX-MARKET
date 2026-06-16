import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Terms of Service" 
        description="Navex Market Terms of Service - Read our full terms and conditions" 
      />
      <Navbar />
      <div className="flex-1">
        <div className="container px-4 pt-24 pb-12 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing and using Navex Market (the "Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please do not use this Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
              <p className="text-muted-foreground mb-4">
                Permission is granted to temporarily download one copy of the materials (information or software) on 
                Navex Market for personal, non-commercial transitory viewing only. This is the grant of a license, not a 
                transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on the Service</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Disclaimer</h2>
              <p className="text-muted-foreground mb-4">
                The materials on Navex Market are provided on an 'as is' basis. Navex Market makes no warranties, expressed 
                or implied, and hereby disclaims and negates all other warranties including, without limitation, implied 
                warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of 
                intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Limitations</h2>
              <p className="text-muted-foreground mb-4">
                In no event shall Navex Market or its suppliers be liable for any damages (including, without limitation, 
                damages for loss of data or profit, or due to business interruption) arising out of the use or inability to 
                use the materials on Navex Market, even if Navex Market or an authorized representative has been notified 
                orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Accuracy of Materials</h2>
              <p className="text-muted-foreground mb-4">
                The materials appearing on Navex Market could include technical, typographical, or photographic errors. 
                Navex Market does not warrant that any of the materials on our Service are accurate, complete, or current. 
                Navex Market may make changes to the materials contained on our Service at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Links</h2>
              <p className="text-muted-foreground mb-4">
                Navex Market has not reviewed all of the sites linked to its website and is not responsible for the contents 
                of any such linked site. The inclusion of any link does not imply endorsement by Navex Market of the site. 
                Use of any such linked website is at the user's own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Modifications</h2>
              <p className="text-muted-foreground mb-4">
                Navex Market may revise these terms of service for our Service at any time without notice. By using this 
                Service, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Governing Law</h2>
              <p className="text-muted-foreground mb-4">
                These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction 
                in which Navex Market is located, and you irrevocably submit to the exclusive jurisdiction of the courts 
                in that location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:legal@navexmarket.com" className="text-primary hover:underline">
                  legal@navexmarket.com
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

export default Terms;
