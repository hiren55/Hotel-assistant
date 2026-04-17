"use client";

import { motion } from "framer-motion";
import { Bot, ShieldCheck, Building2, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
    {
        icon: <Bot className="h-6 w-6 text-indigo-600" />,
        iconBg: "bg-indigo-50",
        title: "AI Booking Flow",
        description: "A conversational AI that handles the entire booking journey from query to confirmation, available 24/7.",
    },
    {
        icon: <ShieldCheck className="h-6 w-6 text-violet-600" />,
        iconBg: "bg-violet-50",
        title: "Trust Management",
        description: "Showcase reviews, certifications, and guarantees. Our AI proactively addresses objections to build trust.",
    },
    {
        icon: <Building2 className="h-6 w-6 text-cyan-600" />,
        iconBg: "bg-cyan-50",
        title: "Room & Inventory",
        description: "Real-time room availability sync. Prevent double-bookings and maximise occupancy all year round.",
    },
    {
        icon: <BarChart3 className="h-6 w-6 text-amber-600" />,
        iconBg: "bg-amber-50",
        title: "Revenue Analytics",
        description: "Track how much you earn from every direct booking vs. OTAs and watch your revenue gap close over time.",
    },
];

export function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-slate-950 text-white overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
                    <div className="max-w-xl">
                        <p className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mb-3">Platform</p>
                        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                            Engineered for{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                                Modern Hospitality
                            </span>
                        </h2>
                        <p className="text-slate-400 mt-3 text-base">
                            The tools you need to modernise, compete, and manage your property with surgical precision.
                        </p>
                    </div>
                    <Link href="/register" className="flex-shrink-0">
                        <Button
                            variant="outline"
                            className="border-slate-700 text-white hover:bg-slate-800 hover:text-white rounded-lg gap-2"
                        >
                            Explore All Features <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {/* Feature grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-colors group"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${feature.iconBg}`}>
                                {feature.icon}
                            </div>
                            <h3 className="font-semibold text-white text-base mb-2">{feature.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
