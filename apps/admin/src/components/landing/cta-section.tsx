"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
    return (
        <section className="py-20 relative overflow-hidden bg-slate-950">
            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-800 rounded-full blur-3xl opacity-40 -translate-x-1/2 -translate-y-1/3" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-800 rounded-full blur-3xl opacity-30 translate-x-1/3 translate-y-1/3" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-2xl mx-auto"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                        Ready to Take Control of{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                            Your Revenue?
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg mb-8">
                        Join 620+ independent hotels reclaiming margin from OTAs every day.
                    </p>

                    <Link href="/register">
                        <Button
                            size="lg"
                            className="h-13 px-9 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base rounded-xl shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 gap-2"
                        >
                            Start Your Free Trial
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </Link>
                    <p className="mt-4 text-slate-500 text-sm">
                        No credit card required · Cancel anytime
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
