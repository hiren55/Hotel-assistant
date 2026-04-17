"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function AboutSection() {
    return (
        <section id="about" className="py-24 bg-white border-t border-gray-100 overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-14 items-center">
                    {/* Left: Image */}
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative"
                    >
                        <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3]">
                            <img
                                src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80"
                                alt="Hotel team working together"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* Testimonial floating card */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="absolute -bottom-6 -right-4 md:right-8 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-[240px]"
                        >
                            <div className="flex items-center gap-0.5 mb-2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                            <p className="text-xs text-gray-600 italic leading-relaxed">
                                "Our direct bookings went up 63% in the first month. This platform pays for itself."
                            </p>
                            <p className="text-xs font-semibold text-gray-900 mt-2">— Maria S., Resort GM</p>
                            <p className="text-[10px] text-gray-400">Trusted by 620+ Reviews</p>
                        </motion.div>
                    </motion.div>

                    {/* Right: Text */}
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <p className="text-indigo-600 text-sm font-semibold tracking-widest uppercase mb-3">Our Story</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-5">
                            Modernising Hospitality,{" "}
                            <span className="text-indigo-600">
                                One Booking at a Time
                            </span>
                        </h2>

                        <div className="space-y-4 text-gray-600 text-base leading-relaxed">
                            <p>
                                Hoteliers can't run a simple dropdown to find the value hotels bring today. But today, AI can. Our platform helps you locate the right price, right room for the right guest — and close them without losing them to OTAs.
                            </p>
                            <p>
                                Our mission is to give property teams the focus that matters: connecting with guests. We handle the technology, so you can focus on the hospitality.
                            </p>
                        </div>

                        <div className="mt-8 grid grid-cols-3 gap-5">
                            {[
                                { stat: "620+", label: "Hotels Using Us" },
                                { stat: "63%", label: "Avg. Direct Boost" },
                                { stat: "$4.2M", label: "OTA Fees Saved" },
                            ].map((item, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-2xl font-extrabold text-indigo-600">{item.stat}</p>
                                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
