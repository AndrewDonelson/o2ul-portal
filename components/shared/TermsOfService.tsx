// file: /components/shared/TermsOfService.tsx
// feature: WebApp Core
"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ChevronUp, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, parseTemplateVars } from "@/lib/utils";

interface ContactInfo {
    type: "contact";
    email: string;
    website: string;
}

interface ListContent {
    type: "list";
    items: string[];
}

interface Section {
    id: string;
    heading: string;
    content: (string | ListContent)[];
}

interface TermsOfService {
    title: string;
    lastUpdated: string;
    introduction: {
        heading: string;
        content: string[];
    };
    sections: Section[];
    contact: {
        heading: string;
        content: (string | ContactInfo)[];
    };
    footer: {
        text: string;
        company: string;
        rights: string;
    };
}

export default function TermsOfService() {
    const [terms, setTerms] = useState<TermsOfService | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const router = useRouter();

    // Fetch terms of service data
    useEffect(() => {
        fetch("/json/terms-of-service.json")
            .then((res) => res.json())
            .then((data) => parseTemplateVars(data))
            .then((data) => setTerms(data))
            .catch((err) => setError("Failed to load terms of service"));
    }, []);

    // Handle scroll to top button visibility
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 200);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (error) {
        return (
            <Alert variant="destructive" className="m-4">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!terms) {
        return <LoadingSpinner size="lg" />;
    }

    return (
        <div className="container mx-auto px-4 py-8 relative min-h-screen">
            {/* Card Component */}
            <Card className="w-full max-w-4xl mx-auto overflow-hidden animate-fade-in">
                <CardHeader className="text-center space-y-2 mb-8 animate-fade-in-down border-b bg-muted/50">
                    <CardTitle className="text-3xl font-bold">{terms.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Last Updated: {terms.lastUpdated}
                    </p>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Introduction */}
                    <section className="animate-fade-in-up delay-100">
                        <h2 className="text-2xl font-semibold mb-4">{terms.introduction.heading}</h2>
                        {terms.introduction.content.map((paragraph, idx) => (
                            <p key={idx} className="mb-4 text-muted-foreground">
                                {paragraph}
                            </p>
                        ))}
                    </section>

                    <Separator className="my-8" />

                    {/* Main Sections */}
                    <ScrollArea className="h-full">
                        {terms.sections.map((section, sectionIdx) => (
                            <section
                                key={section.id}
                                id={section.id}
                                className={cn(
                                    "mb-8 animate-fade-in-up",
                                    `delay-${(sectionIdx + 2) * 100}`
                                )}
                            >
                                <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
                                {section.content.map((content, contentIdx) => {
                                    if (typeof content === "string") {
                                        return (
                                            <p key={contentIdx} className="mb-4 text-muted-foreground">
                                                {content}
                                            </p>
                                        );
                                    } else if (content.type === "list") {
                                        return (
                                            <ul key={contentIdx} className="list-disc pl-6 mb-4 space-y-2">
                                                {content.items.map((item, itemIdx) => (
                                                    <li
                                                        key={itemIdx}
                                                        className="text-muted-foreground animate-fade-in-left"
                                                        style={{ animationDelay: `${itemIdx * 100}ms` }}
                                                    >
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    }
                                })}
                            </section>
                        ))}

                        {/* Contact Section */}
                        <section className="mb-8 animate-fade-in-up delay-300">
                            <h2 className="text-2xl font-semibold mb-4">{terms.contact.heading}</h2>
                            {terms.contact.content.map((content, idx) => {
                                if (typeof content === "string") {
                                    return (
                                        <p key={idx} className="mb-4 text-muted-foreground">
                                            {content}
                                        </p>
                                    );
                                } else if (content.type === "contact") {
                                    return (
                                        <div key={idx} className="space-y-2">
                                            <p className="text-muted-foreground">
                                                Email: <a href={`mailto:${content.email}`} className="text-primary hover:underline">
                                                    {content.email}
                                                </a>
                                            </p>
                                            <p className="text-muted-foreground">
                                                Website: <a href={content.website} className="text-primary hover:underline">
                                                    {content.website}
                                                </a>
                                            </p>
                                        </div>
                                    );
                                }
                            })}
                        </section>
                    </ScrollArea>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 text-center border-t bg-muted/50 p-6 animate-fade-in-up delay-500">
                    <p className="text-sm text-muted-foreground">{terms.footer.text}</p>
                    <p className="text-sm font-semibold">
                        {terms.footer.company} - {terms.footer.rights}
                    </p>
                </CardFooter>
            </Card>

            {/* Scroll to Top Button */}
            <Button
                variant="secondary"
                size="icon"
                className={cn(
                    "fixed bottom-8 right-8 rounded-full shadow-lg transition-all duration-300",
                    showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                )}
                onClick={scrollToTop}
            >
                <ChevronUp className="h-6 w-6" />
            </Button>
        </div>
    );
}