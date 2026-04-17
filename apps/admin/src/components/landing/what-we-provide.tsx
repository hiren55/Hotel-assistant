"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Zap, CheckCircle } from "lucide-react";

const cards = [
    {
        icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
        iconBg: "bg-indigo-50",
        title: "Zero Commission Leakage",
        description: "Eliminate paying 15–25% to OTAs every booking. Every direct sale goes straight to your bottom line.",
        stat: "0%",
        statLabel: "Commission",
        dark: false,
    },
    {
        icon: <Users className="h-5 w-5 text-violet-600" />,
        iconBg: "bg-violet-50",
        title: "Guest Data Ownership",
        description: "Own your guest relationships. Build loyalty programmes, send follow-ups, and create repeat bookings — not Booking.com's.",
        dark: false,
    },
    {
        icon: <Zap className="h-5 w-5 text-white" />,
        iconBg: "bg-white/20",
        title: "Automatic Upselling",
        description: "Smart recommendations for room upgrades, early check-in, and add-ons are shown at exactly the right moment.",
        dark: true,    // featured dark card
    },
    {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        iconBg: "bg-green-50",
        title: "Instant Response",
        description: "AI answers guest queries in under 1 second, 24/7. No missed inquiries. No lost bookings to a faster competitor.",
        dark: false,
    },
];

export function WhatWeProvideSection() {
    return (
        <section id="why-direct" className="py-24 bg-white border-t border-gray-100">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                        Why Direct Beats{" "}
                        <span className="text-indigo-600">Third-Party</span>
                    </h2>
                    <p className="text-gray-600 text-base md:text-lg">
                        Hospitality is not a relationship — it's an ecosystem. We bridge the gap between efficiency and human touch.
                    </p>
                </div>

                {/* Cards grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {cards.map((card, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: i * 0.1 }}
                            className={`relative rounded-2xl p-6 flex flex-col gap-4 ${
                                card.dark
                                    ? "bg-indigo-700 text-white"
                                    : "bg-gray-50 border border-gray-100"
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                                {card.icon}
                            </div>

                            {card.stat && (
                                <div className="text-4xl font-extrabold text-indigo-600">{card.stat}</div>
                            )}

                            <div>
                                <h3 className={`font-semibold text-base mb-1.5 ${card.dark ? "text-white" : "text-gray-900"}`}>
                                    {card.title}
                                </h3>
                                <p className={`text-sm leading-relaxed ${card.dark ? "text-indigo-100" : "text-gray-600"}`}>
                                    {card.description}
                                </p>
                            </div>

                            {card.statLabel && (
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{card.statLabel}</span>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
