import Link from "next/link";
import { Bot, Twitter } from "lucide-react";

const navCols = [
    {
        heading: "Product",
        links: [
            { label: "Features", href: "#features" },
            { label: "Pricing", href: "#pricing" },
            { label: "Integrations", href: "#" },
            { label: "Changelog", href: "#" },
        ],
    },
    {
        heading: "Company",
        links: [
            { label: "About Us", href: "#about" },
            { label: "Blog", href: "#" },
            { label: "Careers", href: "#" },
            { label: "Contact", href: "/contact" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { label: "Privacy Policy", href: "#" },
            { label: "Terms of Service", href: "#" },
            { label: "Cookie Policy", href: "#" },
        ],
    },
];

export function SiteFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8 text-slate-400">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="bg-indigo-600 p-1.5 rounded-lg">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-white text-lg tracking-tight">
                                AI<span className="text-indigo-400">Hotel</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed mb-5 max-w-xs">
                            The AI-powered platform helping hotels recapture revenue from OTAs and automate direct bookings.
                        </p>
                        <a
                            href="#"
                            className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                            <Twitter className="h-4 w-4" />
                        </a>
                    </div>

                    {navCols.map((col) => (
                        <div key={col.heading}>
                            <h4 className="text-white text-sm font-semibold mb-5">{col.heading}</h4>
                            <ul className="space-y-3">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        <Link href={link.href} className="text-sm hover:text-indigo-400 transition-colors">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
                    <p>© {year} AIHotel Assistant. All rights reserved.</p>
                    <p>Built for modern hoteliers.</p>
                </div>
            </div>
        </footer>
    );
}
