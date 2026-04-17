"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Star } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
    return (
        <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-white">
            {/* Subtle background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left: Text Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold tracking-widest uppercase mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            AI Revenue Engine
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.08] mb-5">
                            Recapture Your{" "}
                            <br className="hidden sm:block" />
                            Revenue from{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                                OTAs
                            </span>
                        </h1>

                        <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
                            Stop paying 20% commissions to third-party platforms. Our AI manages your direct bookings automatically, keeping your profit where it truly belongs.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/register">
                                <Button
                                    size="lg"
                                    className="w-full sm:w-auto h-12 px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 text-sm"
                                >
                                    Start Your Free Trial
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/contact">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full sm:w-auto h-12 px-7 text-sm font-semibold rounded-lg border-gray-300 hover:bg-gray-50 text-gray-700 gap-2"
                                >
                                    <Play className="h-4 w-4 fill-gray-700" />
                                    See it in Action
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-8 flex items-center gap-3 text-sm text-gray-500">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-[9px] font-bold flex items-center justify-center"
                                    >
                                        {["JD", "MK", "AL", "RS"][i - 1]}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                            <span>Trusted by 620+ hoteliers</span>
                        </div>
                    </motion.div>

                    {/* Right: Chat Mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="relative"
                    >
                        {/* Main card */}
                        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-md mx-auto lg:mx-0 lg:ml-auto">
                            {/* Card header */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="text-xs text-gray-400 font-medium mx-auto">Silver Waves Resort & Spa Daman</div>
                            </div>

                            {/* Chat body */}
                            <div className="bg-gray-50/80 p-5 space-y-4">
                                {/* Bot message */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="flex items-end gap-2"
                                >
                                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">L</div>
                                    <div className="bg-white border border-gray-200 text-gray-700 text-sm px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm max-w-[80%]">
                                        Hello! Welcome to Grand Azure. When would you like to check in? 🏨
                                    </div>
                                </motion.div>

                                {/* User message */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.8 }}
                                    className="flex justify-end"
                                >
                                    <div className="bg-indigo-600 text-white text-sm px-4 py-3 rounded-2xl rounded-br-sm shadow-sm max-w-[80%]">
                                        This weekend — 2 adults, king room
                                    </div>
                                </motion.div>

                                {/* Bot response */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 2.6 }}
                                    className="flex items-end gap-2"
                                >
                                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">L</div>
                                    <div className="bg-white border border-gray-200 text-gray-700 text-sm px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm max-w-[80%]">
                                        Perfect! King Deluxe is available at{" "}
                                        <span className="font-semibold text-indigo-700">$279/night</span> — 18% less than Booking.com 🎉
                                    </div>
                                </motion.div>

                                {/* Book button */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 3.2 }}
                                >
                                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                                        Book Directly →
                                    </button>
                                </motion.div>
                            </div>
                        </div>

                        {/* Floating stat pills */}
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute -right-4 top-8 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 hidden md:block"
                        >
                            <p className="text-xs text-gray-500 font-medium">Avg. Commission Saved</p>
                            <p className="text-xl font-extrabold text-green-600">$4,320<span className="text-sm font-medium text-gray-400">/mo</span></p>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                            className="absolute -left-4 bottom-10 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 hidden md:block"
                        >
                            <p className="text-xs text-gray-500 font-medium">Direct Booking Rate</p>
                            <p className="text-xl font-extrabold text-indigo-600">+63%</p>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
