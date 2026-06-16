import { motion } from "framer-motion";
import { Shield, FileText, BarChart3, MessageSquare, Star, Lock } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Trust & Verification",
    description: "Every user is verified. Trust scores built on real platform activity and deal history.",
  },
  {
    icon: FileText,
    title: "Smart Agreements",
    description: "Generate, negotiate, and digitally sign structured funding agreements with full version control.",
  },
  {
    icon: BarChart3,
    title: "Deal Tracking",
    description: "Real-time dashboards for milestones, payments, and progress — complete transparency.",
  },
  {
    icon: MessageSquare,
    title: "Secure Messaging",
    description: "Deal-linked conversations with file sharing, keeping all communication in one auditable place.",
  },
  {
    icon: Star,
    title: "Reputation System",
    description: "Platform-bound ratings and reviews that reward reliability and penalize misconduct.",
  },
  {
    icon: Lock,
    title: "Dispute Resolution",
    description: "Structured dispute process with evidence upload, admin review, and enforceable outcomes.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 gradient-hero">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Navex is <span className="text-gradient">Essential</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            More than a marketplace — it's the infrastructure that makes funding relationships work.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-6 hover:border-primary/30 transition-all group"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4 group-hover:glow-primary transition-shadow">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
