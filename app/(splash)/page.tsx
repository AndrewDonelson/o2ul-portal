// file: /app/(splash)/page.tsx
// description: Home page component displaying O²UL project information
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

import { Hero } from "@/components/shared/Hero";
import { ContentCard } from "@/components/shared/ContentCard";
import { Button } from "@/components/ui/button";
import TagLine from "@/components/shared/TagLine";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Coins, Shield, TrendingUp, Globe, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-16">
      
      {/* Logo Image */}
      <div className="flex justify-center mb-8">
        <Image 
          src="/images/app/O2UL-512.png" 
          alt="O²UL Logo" 
          width={512}
          height={512}
          className="h-120 w-auto animate-fade-in"
          priority
        />
      </div>

      {/* Hero Section */}
      <Hero
        primaryText="O²UL: The Dawn of Truly Universal Currency"
        message="The first global financial system designed for humanity's collective prosperity, fusing blockchain innovation with cutting-edge AI analysis."
        actionButtonText="Explore the Ecosystem"
        actionButtonUrl="/ecosystem"
        align="center"
        animate={true}
      />

      {/* Tagline */}
      <TagLine className="mb-4" />

      {/* Introduction Card */}
      <ContentCard
        cardTitle="A Revolution in Digital Money"
        variant="bordered"
        animate={true}
        className="bg-gradient-to-br from-background to-muted/50"
      >
        <div className="prose dark:prose-invert mx-auto">
          <p className="text-lg">
            O²UL (Orbis Omnira Unitas Lex) isn&apos;t just another cryptocurrency—it&apos;s the first global financial system 
            designed for humanity&apos;s collective prosperity. By fusing blockchain innovation with cutting-edge AI analysis, 
            O²UL creates something unprecedented: a dual-token system combining the investment potential of Bitcoin 
            with stability that outperforms traditional financial instruments.
          </p>
        </div>
      </ContentCard>

      {/* Dual Token System */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">The Dual-Token Advantage</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* O2V Token Card */}
          <ContentCard
            cardTitle="O2V (Value Token)"
            footerText="Digital Gold Reimagined"
            align="left"
            className="h-full"
          >
            <div className="space-y-4">
              <p>
                The O2V token follows Bitcoin&apos;s proven scarcity model with a maximum supply of just 21 million tokens. 
                But unlike Bitcoin, O2V serves a critical function within the O²UL ecosystem:
              </p>
              
              <ul className="space-y-2 list-disc pl-5">
                <li>Acts as the system&apos;s store of value and volatility buffer</li>
                <li>Provides governance rights over the entire protocol</li>
                <li>Generates passive income through transaction fee sharing</li>
                <li>Functions as a key component in the stability mechanism</li>
              </ul>
              
              <p>
                When staked, O2V holders receive 0.25% of all transaction fees—creating continuous income 
                simply for participating in network security.
              </p>
              
              <div className="flex justify-end mt-4">
                <Coins className="h-12 w-12 text-primary/60" />
              </div>
            </div>
          </ContentCard>
          
          {/* O2S Token Card */}
          <ContentCard
            cardTitle="O2S (Ultra-Stable Token)"
            footerText="Stability Redefined"
            align="left"
            className="h-full"
          >
            <div className="space-y-4">
              <p>
                The O2S token represents a quantum leap in stablecoin design. Unlike traditional stablecoins 
                pegged to single currencies like the USD, O2S derives its value from a sophisticated continental 
                fiat analysis system:
              </p>
              
              <ul className="space-y-2 list-disc pl-5">
                <li>Achieves 5.58x reduction in volatility compared to base calculations</li>
                <li>Updates every 6 hours (4x daily) for exceptional responsiveness</li>
                <li>Operates without collateral requirements through pure algorithmic design</li>
                <li>Creates stability through advanced time-weighted averaging</li>
              </ul>
              
              <div className="flex justify-end mt-4">
                <Shield className="h-12 w-12 text-primary/60" />
              </div>
            </div>
          </ContentCard>
        </div>
      </section>
      
      {/* Stability Mechanism Section */}
      <section className="space-y-8 pt-8">
        <h2 className="text-3xl font-bold text-center">How O²UL Achieves Unparalleled Stability</h2>
        
        <ContentCard className="bg-gradient-to-b from-muted/20 to-background">
          <div className="space-y-6">
            <p className="text-lg">
              The heart of O²UL&apos;s innovation lies in its approach to stability. The system gathers fiat value 
              assessments across six continents, analyzing economic data through multiple AI services. This 
              continental approach creates natural hedging against regional economic fluctuations.
            </p>
            
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-4">Time-Weighted Averaging Algorithm</h3>
                <p>The system processes data across multiple timeframes:</p>
                <ul className="space-y-2 list-disc pl-5 mt-2">
                  <li>Current values (real-time)</li>
                  <li>Short-term trends (3-day to 1-week)</li>
                  <li>Medium-term indicators (1-month to 3-month)</li>
                  <li>Long-term economic patterns (6-month to 1-year)</li>
                </ul>
              </div>
              
              <div className="flex-1 flex justify-center">
                <div className="relative p-4 animate-pulse">
                  <TrendingUp className="h-32 w-32 text-primary/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="h-16 w-16 text-primary" />
                  </div>
                </div>
              </div>
            </div>
            
            <p>
              Each timeframe utilizes custom smoothing windows to dampen volatility while remaining responsive to 
              genuine economic shifts. This creates a currency that&apos;s steady yet adaptive—providing the reliability 
              of traditional money with the freedom of digital assets.
            </p>
          </div>
        </ContentCard>
      </section>
      
      {/* Seigniorage Mechanism */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center">Seigniorage: The Self-Balancing Mechanism</h2>
        
        <ContentCard>
          <div className="space-y-4">
            <p>When O2S deviates from its target value:</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors">
                <h3 className="font-semibold mb-2">During Expansion:</h3>
                <p>New O2S tokens enter circulation, and O2V holders can burn tokens to mint new O2S</p>
              </div>
              
              <div className="border p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                <h3 className="font-semibold mb-2">During Contraction:</h3>
                <p>O2V holders can purchase O2S at a discount, removing tokens from circulation</p>
              </div>
            </div>
            
            <p className="text-center pt-4">
              This algorithmic dance between the two tokens creates a self-correcting system that 
              functions without external collateral—a breakthrough in digital currency design.
            </p>
          </div>
        </ContentCard>
      </section>
      
      {/* Technical Foundation */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center">The Technical Foundation</h2>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold text-center mb-2">Go-Ethereum Foundation</h3>
            <p className="text-sm text-center text-muted-foreground">
              Battle-tested codebase with proven security and reliability
            </p>
          </div>
          
          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold text-center mb-2">Advanced Consensus</h3>
            <p className="text-sm text-center text-muted-foreground">
              Modified Ethereum PoS for validator coordination and security
            </p>
          </div>
          
          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Coins className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold text-center mb-2">EVM Compatibility</h3>
            <p className="text-sm text-center text-muted-foreground">
              Seamless developer adoption and ecosystem integration
            </p>
          </div>
          
          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold text-center mb-2">Smart Contracts</h3>
            <p className="text-sm text-center text-muted-foreground">
              Built-in contracts for core functionality and extensibility
            </p>
          </div>
        </div>
        
        <div className="bg-muted/20 p-6 rounded-lg text-center mt-6">
          <p className="text-lg font-medium">
            The elegant 0.5% flat fee structure generates substantial revenue while significantly undercutting 
            traditional payment rails—saving users $20 per $1,000 transaction compared to credit card processors.
          </p>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="bg-gradient-to-br from-primary/5 to-muted/30 border rounded-xl p-8 text-center space-y-6">
        <h2 className="text-3xl font-bold">A Currency for Humanity&apos;s Future</h2>
        
        <div className="max-w-3xl mx-auto space-y-4">
          <p>
            O²UL isn&apos;t just technology—it&apos;s a fundamental reimagining of what money can be. Not controlled by any 
            single government or tied to any one economy, it&apos;s designed to serve humanity as a whole. The O2S token 
            isn&apos;t just stable—it&apos;s responsive to global economic reality in a way no previous currency has achieved.
          </p>
          
          <p className="text-xl font-semibold mt-6">
            Welcome to O²UL—where financial stability meets digital innovation in service of human prosperity.
          </p>
        </div>
        
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild size="lg" className="group">
            <Link href="/whitepaper">
              Read the Whitepaper
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">
              Get Started
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}