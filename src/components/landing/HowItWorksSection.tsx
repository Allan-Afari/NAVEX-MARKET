import { motion } from "framer-motion";
import { UserPlus, Search, FileText, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Get Verified",
    description: "Create your profile and complete identity verification to build trust.",
    color: "text-primary",
  },
  {
    icon: Search,
    title: "Discover Opportunities",
    description: "Browse verified businesses seeking funding or find investors matching your sector.",
    color: "text-accent",
  },
  {
    icon: FileText,
    title: "Structure & Sign",
    description: "Use built-in agreement templates, negotiate terms, and digitally sign contracts.",
    color: "text-warning",
  },
  {
    icon: TrendingUp,
    title: "Track & Grow",
    description: "Monitor deal progress, milestones, and payments — all with full transparency.",
    color: "text-success",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How Navex <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From discovery to completion — every step of your funding journey is structured and protected.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative glass rounded-xl p-6 text-center group hover:border-primary/30 transition-colors"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-border" />
              )}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary mb-4 ${step.color}`}>
                <step.icon className="w-6 h-6" />
              </div>
              <div className="text-xs text-muted-foreground mb-2">Step {i + 1}</div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
