"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center justify-center px-4 py-24">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gold-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <motion.div 
          className="relative max-w-4xl mx-auto text-center z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Title */}
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-12"
            variants={fadeInUp}
          >
            <span className="text-accent-gradient">
              Why RealTea Exists
            </span>
          </motion.h1>

          {/* Gold divider */}
          <motion.div 
            className="h-px w-40 mx-auto bg-gradient-to-r from-transparent via-gold-primary to-transparent mb-16"
            variants={fadeInUp}
          />

          {/* Main Story */}
          <motion.div
            className="space-y-8 text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            <p>
              Truth changes fast. What we know today might be rewritten tomorrow.
            </p>
            
            <p className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
              RealTea exists to record reality as it happens — transparently, collaboratively, and without bias.
            </p>
            
            <p>
              Every event, verified or not, leaves a trace.
            </p>
            
            <p className="text-gold-primary font-bold text-2xl md:text-3xl">
              That trace becomes history.
            </p>
          </motion.div>

          {/* Secondary divider */}
          <motion.div 
            className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-gold-primary to-transparent my-16"
            variants={fadeInUp}
          />

          {/* Mission Points */}
          <motion.div
            className="grid md:grid-cols-3 gap-8 mt-20"
            variants={staggerContainer}
          >
            <motion.div 
              className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 hover:border-gold-primary transition-all duration-500 hover:shadow-xl hover:shadow-gold-primary/20"
              variants={fadeInUp}
              whileHover={{ y: -5 }}
            >
              <div className="text-5xl mb-4">📜</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Transparent
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Every event is sourced, timestamped, and traceable. No hidden agendas, no editorial bias.
              </p>
            </motion.div>

            <motion.div 
              className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 hover:border-gold-primary transition-all duration-500 hover:shadow-xl hover:shadow-gold-primary/20"
              variants={fadeInUp}
              whileHover={{ y: -5 }}
            >
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Collaborative
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Anyone can contribute. The community verifies, and truth emerges through collective wisdom.
              </p>
            </motion.div>

            <motion.div 
              className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 hover:border-gold-primary transition-all duration-500 hover:shadow-xl hover:shadow-gold-primary/20"
              variants={fadeInUp}
              whileHover={{ y: -5 }}
            >
              <div className="text-5xl mb-4">⚖️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Unbiased
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We don't pick sides. We document what happened, when it happened, and let the facts speak.
              </p>
            </motion.div>
          </motion.div>

          {/* CTA */}
          <motion.div 
            className="mt-20"
            variants={fadeInUp}
          >
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
              Ready to contribute to history?
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href="/submit"
                className="inline-block btn-primary"
              >
                Submit Your First Event
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Additional Info Section */}
      <section className="py-24 px-4 bg-gray-100 dark:bg-black border-t border-gray-200 dark:border-gray-800">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <span className="text-accent-gradient">How It Works</span>
          </h2>

          <div className="space-y-8">
            <motion.div 
              className="flex gap-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center text-bg-dark font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Submit an Event</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Add any significant event with a date, description, and verified source. Your submission enters the timeline immediately.
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex gap-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center text-bg-dark font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Community Verifies</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Other users can review, vote, and add supporting sources. Quality rises to the top through collective validation.
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex gap-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center text-bg-dark font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">History Evolves</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  As new information emerges, events can be updated and refined. The timeline stays accurate and current.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-8">
            Join the movement for truth.
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
            Every contribution matters. Every source counts. Every truth deserves to be remembered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/timeline" className="inline-block btn-primary">
                Explore Timeline
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/submit" className="inline-block btn-secondary">
                Add an Event
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
