"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
    {
        name: "Starter",
        price: "$199",
        period: "/mo",
        desc: "Up to 30 Rooms",
        highlight: false,
        features: [
            "AI Concierge Widget",
            "Direct Booking Page",
            "Multi-Hotel Messaging",
            "Email / Chat Support",
        ],
        cta: "Learn More",
        ctaVariant: "outline" as const,
        href: "/register?plan=starter",
    },
    {
        name: "Growth",
        price: "$499",
        period: "/mo",
        desc: "Up to 60 Rooms",
        highlight: true,
        features: [
            "Everything in Starter",
            "Advanced Revenue Analytics",
            "Multi-Staff Team Roles",
            "OTA Revenue Reports",
            "24/7 Priority Support",
        ],
        cta: "Get Started",
        ctaVariant: "default" as const,
        href: "/register?plan=growth",
    },
    {
        name: "Custom",
        price: "Custom",
        period: "",
        desc: "Unlimited Rooms",
        highlight: false,
        features: [
            "Dedicated Account Manager",
            "Custom API Integrations",
            "White-Label Option",
            "SLA-backed Support",
            "Quarterly Strategy Reviews",
        ],
        cta: "Contact Sales",
        ctaVariant: "outline" as const,
        href: "/contact",
    },
];

export function HowItWorksSection() {
    return (
        <section id="pricing" className="py-24 bg-gray-50 border-t border-gray-100">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                        Transparent <span className="text-indigo-600">Pricing</span>
                    </h2>
                    <p className="text-gray-600">
                        Plans that grow with your property. No hidden fees. Cancel anytime.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: i * 0.1 }}
                            className={`relative rounded-2xl p-7 flex flex-col ${
                                plan.highlight
                                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/25"
                                    : "bg-white border border-gray-200"
                            }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="mb-5">
                                <h3 className={`font-bold text-lg mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                                    {plan.name}
                                </h3>
                                <p className={`text-xs font-medium ${plan.highlight ? "text-indigo-200" : "text-gray-500"}`}>
                                    {plan.desc}
                                </p>
                            </div>

                            <div className="mb-6">
                                <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                                    {plan.price}
                                </span>
                                <span className={`text-sm ${plan.highlight ? "text-indigo-200" : "text-gray-500"}`}>
                                    {plan.period}
                                </span>
                            </div>

                            <ul className="flex-1 space-y-3 mb-7">
                                {plan.features.map((f, fi) => (
                                    <li key={fi} className="flex items-start gap-2 text-sm">
                                        <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-indigo-200" : "text-indigo-600"}`} />
                                        <span className={plan.highlight ? "text-indigo-100" : "text-gray-600"}>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link href={plan.href}>
                                <Button
                                    variant={plan.highlight ? "default" : "outline"}
                                    className={`w-full rounded-lg font-semibold gap-2 ${
                                        plan.highlight
                                            ? "bg-white text-indigo-700 hover:bg-indigo-50"
                                            : "border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                    {plan.cta}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
