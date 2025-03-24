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
import {
  ArrowRight, Coins, Shield, TrendingUp, Globe, Zap,
  Layers, Lock, Database, Workflow, UserCheck
} from "lucide-react";

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

      {/* Project Structure Section */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Comprehensive Ecosystem Architecture</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <ContentCard
            cardTitle="o2ul-proprietary"
            align="left"
            className="h-full"
          >
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>

              <p>Private repository containing our core innovations:</p>

              <ul className="space-y-2 list-disc pl-5">
                <li>Stability Core algorithms</li>
                <li>AI-powered Oracle Module</li>
                <li>Seigniorage Engine</li>
                <li>Custom State Trie for historical data</li>
              </ul>

              <p className="text-sm text-muted-foreground italic">
                These proprietary modules form the foundation of our revolutionary stability mechanism.
              </p>
            </div>
          </ContentCard>

          <ContentCard
            cardTitle="o2ul-blockchain"
            align="left"
            className="h-full"
          >
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Layers className="h-8 w-8 text-primary" />
                </div>
              </div>

              <p>Public Go-Ethereum fork with essential extensions:</p>

              <ul className="space-y-2 list-disc pl-5">
                <li>EVM compatibility for seamless integration</li>
                <li>Built-in token mechanism contracts</li>
                <li>Modified PoS consensus mechanism</li>
                <li>DBVerification contract for data integrity</li>
                <li>Integration APIs for proprietary modules</li>
              </ul>

              <p className="text-sm text-muted-foreground italic">
                Built on Ethereum&apos;s battle-tested foundation with our specialized enhancements.
              </p>
            </div>
          </ContentCard>

          <ContentCard
            cardTitle="o2ul-portal"
            align="left"
            className="h-full"
          >
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
              </div>

              <p>Comprehensive user interface with modern architecture:</p>

              <ul className="space-y-2 list-disc pl-5">
                <li>Next.js framework for optimal performance</li>
                <li>Convex + Convex-auth data management</li>
                <li>Web3.js blockchain connectivity</li>
                <li>TailwindCSS + ShadCN component library</li>
                <li>Responsive design for all devices</li>
              </ul>

              <p className="text-sm text-muted-foreground italic">
                User-friendly interface connecting our powerful blockchain technology.
              </p>
            </div>
          </ContentCard>
        </div>
      </section>

      {/* Dual Token System */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">The Dual-Token Advantage</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* O2V Token Card */}
          <ContentCard
            cardTitle="O2V (Value Token)"
            align="left"
            className="h-full"
          >
            <div className="flex flex-col h-full">
              <div className="space-y-4 flex-grow">
                <p>
                  The O2V token follows Bitcoin&apos;s proven scarcity model with a maximum supply of just 21 million tokens.
                  But unlike Bitcoin, O2V serves critical functions within the O²UL ecosystem:
                </p>

                <ul className="space-y-2 list-disc pl-5">
                  <li>Acts as the system&apos;s store of value and volatility buffer</li>
                  <li>Provides governance rights over the entire protocol</li>
                  <li>Generates passive income through transaction fee sharing (0.25%)</li>
                  <li>Functions as a key component in the stability mechanism</li>
                  <li>Powers the seigniorage system during expansions and contractions</li>
                </ul>

                <p>
                  Governance rights enable voting on fee distribution, protocol upgrades,
                  stability parameters, and oracle data sources through formal on-chain processes.
                </p>

                <div className="flex justify-end mt-auto pt-4">
                  <Coins className="h-12 w-12 text-primary/60" />
                </div>
              </div>

              <div className="mt-auto">
                <div className="border-t mt-4 pt-4 text-muted-foreground font-medium">
                  Digital Gold Reimagined
                </div>
              </div>
            </div>
          </ContentCard>

          {/* O2S Token Card */}
          <ContentCard
            cardTitle="O2S (Ultra-Stable Token)"
            align="left"
            className="h-full"
          >
            <div className="flex flex-col h-full">
              <div className="space-y-4 flex-grow">
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
                  <li>Naturally hedges against regional economic fluctuations</li>
                </ul>
                <p className="hidden md:block pb-5">&nbsp;</p>
                <div className="flex justify-end mt-auto pt-4">
                  <Shield className="h-12 w-12 text-primary/60" />
                </div>
              </div>

              <div className="mt-auto">
                <div className="border-t mt-4 pt-4 text-muted-foreground font-medium">
                  Stability Redefined
                </div>
              </div>
            </div>
          </ContentCard>
        </div>
      </section>

      {/* Stability Mechanism Section */}
      <section className="pt-12 pb-8">
        <h2 className="text-3xl font-bold text-center mb-8">How O²UL Achieves Unparalleled Stability</h2>

        <ContentCard className="bg-gradient-to-b from-muted/5 to-background/80 overflow-hidden">
          <div className="space-y-8">
            <p className="text-lg leading-relaxed">
              The heart of O²UL&apos;s innovation lies in its approach to stability. The system gathers fiat value
              assessments across six continents (North America, Europe, Asia, Africa, South America, Oceania),
              analyzing economic data through multiple AI services including Perplexity, Google, and Claude.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div className="bg-primary/5 p-5 rounded-lg border border-primary/10">
                  <h3 className="text-xl font-semibold mb-4 text-primary">Time-Weighted Averaging Algorithm</h3>
                  <p className="mb-4 font-medium">The system processes data across multiple timeframes:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div className="flex justify-between py-2 px-3 rounded bg-background/80 border border-border/30">
                      <span className="font-medium">Current values:</span>
                      <span className="text-primary">Real-time</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded bg-background/80 border border-border/30">
                      <span className="font-medium">3-day:</span>
                      <span className="text-primary">3-day average</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded bg-background/80 border border-border/30">
                      <span className="font-medium">1-week:</span>
                      <span className="text-primary">7-day average</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded bg-background/80 border border-border/30">
                      <span className="font-medium">1-month:</span>
                      <span className="text-primary">14-day average</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded bg-background/80 border border-border/30">
                      <span className="font-medium">3-month:</span>
                      <span className="text-primary">30-day average</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded bg-background/80 border border-border/30">
                      <span className="font-medium">6-month:</span>
                      <span className="text-primary">60-day average</span>
                    </div>
                    <div className="sm:col-span-2 flex justify-between py-2 px-3 rounded bg-background/80 border border-border/30">
                      <span className="font-medium">1-year:</span>
                      <span className="text-primary">90-day average</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5">
                <div className="relative aspect-square max-w-[300px] mx-auto">
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl animate-pulse"></div>
                  <div className="relative h-full w-full flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-spin-slow"></div>
                    <div className="absolute inset-[15%] border-2 border-primary/30 rounded-full animate-spin-reverse"></div>
                    <div className="absolute inset-[30%] border-2 border-primary/40 rounded-full animate-pulse"></div>
                    <Globe className="h-20 w-20 text-primary animate-float" />
                    <TrendingUp className="absolute h-10 w-10 text-primary/80 top-1/4 right-1/4 animate-float-delay" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/10 p-5 rounded-lg border border-border/30 text-center">
              <p className="leading-relaxed">
                All smoothing calculations are performed by validator nodes with consensus required to establish new values,
                resulting in extremely small and predictable price adjustments while maintaining
                responsiveness to genuine economic shifts.
              </p>
            </div>
          </div>
        </ContentCard>
      </section>

      {/* Seigniorage Mechanism */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center">Seigniorage: The Self-Balancing Mechanism</h2>

        <ContentCard>
          <div className="space-y-4">
            <p>Our pure algorithmic design operates without collateralization through supply adjustments when O2S deviates from its target value:</p>

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
              The system includes circuit breakers to prevent extreme movements by limiting supply adjustments during periods of high volatility.
              This algorithmic dance between the two tokens creates a self-correcting system that
              functions without external collateral—a breakthrough in digital currency design.
            </p>
          </div>
        </ContentCard>
      </section>

      {/* User Management and Data Verification Section */}
      <section className="space-y-8 pt-8">
        <h2 className="text-3xl font-bold text-center">Advanced User Management & Data Integrity</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <ContentCard
            cardTitle="Dual Authentication System"
            align="left"
            className="h-full"
          >
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
              </div>

              <p>Our User Management System supports multiple authentication methods:</p>

              <ul className="space-y-2 list-disc pl-5">
                <li>Traditional OAuth providers (Google, GitHub, etc.)</li>
                <li>Web3 wallet integration (Metamask + others)</li>
                <li>Secure JWT token management</li>
                <li>Role-based access control</li>
                <li>Cross-device authentication support</li>
              </ul>

              <p>
                Users can link both authentication methods to one account, providing flexibility without compromising security.
              </p>
            </div>
          </ContentCard>

          <ContentCard
            cardTitle="DBVerification Technology"
            align="left"
            className="h-full"
          >
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Database className="h-8 w-8 text-primary" />
                </div>
              </div>

              <p>Our hybrid database-blockchain architecture ensures data integrity:</p>

              <ul className="space-y-2 list-disc pl-5">
                <li>Cryptographic hashes of records stored on blockchain</li>
                <li>Off-chain data storage efficiency with Convex DB</li>
                <li>Tamper-evident profile data verification</li>
                <li>Revision tracking for compliance and auditing</li>
                <li>Gas-optimized batch operations for cost efficiency</li>
              </ul>

              <p>
                This provides the performance of traditional databases with the security guarantees of blockchain technology.
              </p>
            </div>
          </ContentCard>
        </div>
      </section>

      {/* Fee Structure Section */}
      <section className="pt-12 pb-8">
        <h2 className="text-3xl font-bold text-center mb-8">Competitive Fee Structure</h2>

        <ContentCard className="overflow-hidden border-primary/10">
          <div className="p-0">
            <div className="grid md:grid-cols-12 gap-0">
              <div className="md:col-span-5 bg-primary/5 p-8 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl animate-pulse opacity-70"></div>
                  <div className="relative flex flex-col items-center text-center space-y-2">
                    <span className="text-5xl font-bold text-primary">0.5%</span>
                    <span className="text-lg font-medium">Flat Transaction Fee</span>
                    <span className="text-sm text-muted-foreground">No hidden charges</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 p-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">Transparent Fee Distribution</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-background rounded-lg p-4 border border-border/30 flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-green-500 font-bold">50%</span>
                    </div>
                    <div>
                      <p className="font-medium">Value Token Holders</p>
                      <p className="text-sm text-muted-foreground">When staked (0.25%)</p>
                    </div>
                  </div>

                  <div className="bg-background rounded-lg p-4 border border-border/30 flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-500 font-bold">50%</span>
                    </div>
                    <div>
                      <p className="font-medium">Protocol Treasury</p>
                      <p className="text-sm text-muted-foreground">Development (0.25%)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="font-medium">Minimum Fee:</span>
                    <span>$0.01 equivalent</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="font-medium">Minimum Transaction:</span>
                    <span>$2.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium">Maximum Cap:</span>
                    <span>None - scales with size</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-gradient-to-r from-primary/10 to-background border-t border-primary/10">
              <h4 className="text-lg font-medium mb-4">Transaction Fee Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left pb-2">Payment Method</th>
                      <th className="text-right pb-2">Typical Fee</th>
                      <th className="text-right pb-2">Cost per $1,000</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-2 font-medium">Credit Cards</td>
                      <td className="text-right text-red-500">2.5% - 3.5%</td>
                      <td className="text-right">$25.00 - $35.00</td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2 font-medium">Bitcoin (BTC)</td>
                      <td className="text-right">Variable (~$1-20)</td>
                      <td className="text-right">$1.00 - $20.00</td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2 font-medium">Ethereum (ETH)</td>
                      <td className="text-right">Variable (~$2-50)</td>
                      <td className="text-right">$2.00 - $50.00</td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2 font-medium">USDT (Tether)</td>
                      <td className="text-right">~0.1% + network</td>
                      <td className="text-right">$1.00 - $10.00</td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2 font-medium">USDC</td>
                      <td className="text-right">~0.1% + network</td>
                      <td className="text-right">$1.00 - $10.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-primary">O²UL</td>
                      <td className="text-right text-green-500 font-medium">0.5% flat</td>
                      <td className="text-right font-medium text-green-500">$5.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-3">Note: Cryptocurrency fees vary significantly based on network congestion, while O²UL maintains a predictable flat fee structure.</p>
            </div>
          </div>
        </ContentCard>
      </section>

      {/* Portal Features */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Comprehensive Portal Features</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ContentCard
            cardTitle="Block Explorer"
            className="h-full"
          >
            <ul className="space-y-2 pl-5">
              <li>Real-time blockchain data</li>
              <li>Detailed transaction history</li>
              <li>Network statistics dashboard</li>
              <li>Smart contract interaction</li>
            </ul>
          </ContentCard>

          <ContentCard
            cardTitle="Integrated Wallet"
            className="h-full"
          >
            <ul className="space-y-2 pl-5">
              <li>Secure key management</li>
              <li>Transaction creation/signing</li>
              <li>Balance tracking interface</li>
              <li>Value Token staking portal</li>
            </ul>
          </ContentCard>

          <ContentCard
            cardTitle="Stablecoin Dashboard"
            className="h-full"
          >
            <ul className="space-y-2 pl-5">
              <li>Continental value visualization</li>
              <li>AI source monitoring</li>
              <li>Stability metrics tracking</li>
              <li>Supply adjustment analytics</li>
            </ul>
          </ContentCard>

          <ContentCard
            cardTitle="Node Operator Portal"
            className="h-full"
          >
            <ul className="space-y-2 pl-5">
              <li>Validator performance metrics</li>
              <li>Oracle status monitoring</li>
              <li>Network participation tools</li>
              <li>Consensus verification stats</li>
            </ul>
          </ContentCard>
        </div>
      </section>

      {/* Development Roadmap */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center">Development Roadmap</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 md:col-span-2 text-right font-medium">
              Q1-Q2 2025
            </div>
            <div className="col-span-1 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</div>
            </div>
            <div className="col-span-8 md:col-span-9">
              <h3 className="font-semibold text-lg">Core Development</h3>
              <p className="text-sm text-muted-foreground">
                Establish proprietary stability mechanisms, fork Go-Ethereum, implement DBVerification contract, and develop integration points.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 md:col-span-2 text-right font-medium">
              Q3-Q4 2025
            </div>
            <div className="col-span-1 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">2</div>
            </div>
            <div className="col-span-8 md:col-span-9">
              <h3 className="font-semibold text-lg">Portal Development</h3>
              <p className="text-sm text-muted-foreground">
                Build frontend interface, implement wallet functionality, create visualization dashboard, and develop dual-auth User Management.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 md:col-span-2 text-right font-medium">
              Q1-Q2 2026
            </div>
            <div className="col-span-1 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">3</div>
            </div>
            <div className="col-span-8 md:col-span-9">
              <h3 className="font-semibold text-lg">Testing and Optimization</h3>
              <p className="text-sm text-muted-foreground">
                Deploy extensive testnet, conduct security audits, optimize performance, and complete User Management integration testing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 md:col-span-2 text-right font-medium">
              Q3 2026
            </div>
            <div className="col-span-1 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">4</div>
            </div>
            <div className="col-span-8 md:col-span-9">
              <h3 className="font-semibold text-lg">Mainnet Launch</h3>
              <p className="text-sm text-muted-foreground">
                Public launch of blockchain, initial token distribution, governance system establishment, and production-ready portal release.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 md:col-span-2 text-right font-medium">
              Q4 2026+
            </div>
            <div className="col-span-1 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">5</div>
            </div>
            <div className="col-span-8 md:col-span-9">
              <h3 className="font-semibold text-lg">Ecosystem Expansion</h3>
              <p className="text-sm text-muted-foreground">
                Third-party integrations, merchant adoption programs, enhanced oracle systems, and advanced enterprise verification capabilities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Foundation - Summary */}
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
                <Workflow className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold text-center mb-2">Hybrid Architecture</h3>
            <p className="text-sm text-center text-muted-foreground">
              Combining database efficiency with blockchain security
            </p>
          </div>
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