import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Optional Supabase client - only create if environment variables are set
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

export default function Home({ claims }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <>
      <Head>
        <title>Prophecy Claims - Divine Timeline of Truth</title>
        <meta name="description" content="Create, track, and verify prophetic claims on the ultimate timeline of divine revelation. Join the community exploring the intersection of prophecy and reality." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content="prophecy, divine revelation, timeline, claims, spiritual, truth, community, verification" />
        <meta name="author" content="Prophecy Claims" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://prophecy.claims/" />
        <meta property="og:title" content="Prophecy Claims - Divine Timeline of Truth" />
        <meta property="og:description" content="Create, track, and verify prophetic claims on the ultimate timeline of divine revelation." />
        <meta property="og:image" content="https://prophecy.claims/startup.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://prophecy.claims/" />
        <meta property="twitter:title" content="Prophecy Claims - Divine Timeline of Truth" />
        <meta property="twitter:description" content="Create, track, and verify prophetic claims on the ultimate timeline of divine revelation." />
        <meta property="twitter:image" content="https://prophecy.claims/startup.png" />

        <link rel="canonical" href="https://prophecy.claims/" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Beta Warning Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#e89547] to-[#f4d03f] text-[#1e3a5f] text-center py-2 px-4 font-semibold text-sm shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <span className="animate-pulse">🚧</span>
          <span>BETA VERSION - Under Active Development</span>
          <span className="animate-pulse">🚧</span>
        </div>
        <div className="text-xs opacity-80 mt-1">
          Experience may vary • Features being added daily • Join our journey to divine truth
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#2c5f6f] to-[#87ceeb]"></div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full opacity-20 animate-float"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-[#e89547] to-[#d4a574] rounded-full opacity-30 animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-r from-[#2c5f6f] to-[#87ceeb] rounded-full opacity-15 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="font-display text-6xl md:text-8xl font-bold text-[#faf6f0] mb-6 leading-tight">
              PROPHECY
              <span className="block prophecy-gradient-text">CLAIMS</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-[#faf6f0] mb-8 max-w-3xl mx-auto leading-relaxed opacity-90">
              Create and track prophetic revelations on the ultimate divine timeline. 
              Submit claims, witness fulfillments, and explore the intersection of prophecy and reality.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <a 
                href="https://app.prophecy.claims" 
                target="_blank" 
                rel="noopener noreferrer"
                className="prophecy-button text-lg px-8 py-4 inline-block text-center no-underline"
              >
                Create Your Timeline
              </a>
              <Link href="/timelines" className="bg-transparent border-2 border-[#faf6f0] text-[#faf6f0] px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#faf6f0] hover:text-[#1e3a5f] transition-all duration-300 inline-block text-center no-underline">
                Explore Timelines
              </Link>
            </div>

            <div className="text-[#faf6f0] opacity-80">
              <p className="text-sm mb-2">Join thousands exploring divine truth</p>
              <div className="flex justify-center space-x-8 text-xs">
                <span>✨ 1,247 Active Prophecies</span>
                <span>🔮 892 Fulfilled Claims</span>
                <span>👥 15,432 Truth Seekers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-[#faf6f0] rounded-full flex justify-center">
            <div className="w-1 h-3 bg-[#faf6f0] rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-[#faf6f0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-6">
              The Divine Timeline Awaits
            </h2>
            <p className="text-xl text-[#2c5f6f] max-w-3xl mx-auto">
              Experience prophecy like never before with our revolutionary timeline platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="prophecy-card text-center animate-fade-in-up">
              <div className="w-16 h-16 bg-gradient-to-r from-[#d4a574] to-[#e89547] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔮</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-[#1e3a5f] mb-4">Create Prophecies</h3>
              <p className="text-[#2c5f6f] leading-relaxed">
                Submit your divine revelations with timestamps, context, and detailed descriptions. 
                Build your prophetic legacy on the eternal timeline.
              </p>
            </div>

            <div className="prophecy-card text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-gradient-to-r from-[#2c5f6f] to-[#87ceeb] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-[#1e3a5f] mb-4">Track Fulfillment</h3>
              <p className="text-[#2c5f6f] leading-relaxed">
                Monitor prophecies as they unfold in real-time. Submit evidence, witness confirmations, 
                and celebrate divine accuracy together.
              </p>
            </div>

            <div className="prophecy-card text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="w-16 h-16 bg-gradient-to-r from-[#e89547] to-[#f4d03f] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🌟</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-[#1e3a5f] mb-4">Community Verification</h3>
              <p className="text-[#2c5f6f] leading-relaxed">
                Join a community of truth seekers. Vote on claims, provide insights, 
                and help maintain the integrity of the divine record.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Preview Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#1e3a5f] to-[#2c5f6f]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#faf6f0] mb-6">
              The Prophecy Timeline
            </h2>
            <p className="text-xl text-[#87ceeb] max-w-3xl mx-auto">
              Witness the unfolding of divine truth through time
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-[#d4a574] to-[#f4d03f]"></div>

            {/* Timeline Items */}
            <div className="space-y-12">
              {[
                { date: "2024", title: "The Great Awakening", status: "fulfilled", side: "left" },
                { date: "2025", title: "Economic Transformation", status: "pending", side: "right" },
                { date: "2026", title: "Spiritual Revival", status: "pending", side: "left" },
                { date: "2027", title: "Unity of Nations", status: "pending", side: "right" }
              ].map((item, index) => (
                <div key={index} className={`flex items-center ${item.side === 'right' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-1/2 ${item.side === 'right' ? 'pl-8' : 'pr-8'}`}>
                    <div className={`prophecy-card ${item.side === 'right' ? 'ml-auto' : ''} max-w-md`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-[#d4a574]">{item.date}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'fulfilled' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status === 'fulfilled' ? '✓ Fulfilled' : '⏳ Pending'}
                        </span>
                      </div>
                      <h4 className="font-display text-lg font-semibold text-[#1e3a5f] mb-2">{item.title}</h4>
                      <p className="text-sm text-[#2c5f6f]">
                        A divine revelation submitted by the community, tracked and verified through our timeline system.
                      </p>
                    </div>
                  </div>
                  
                  {/* Timeline Node */}
                  <div className="relative z-10">
                    <div className={`w-4 h-4 rounded-full ${
                      item.status === 'fulfilled' 
                        ? 'bg-green-400' 
                        : 'bg-yellow-400'
                    } border-4 border-[#faf6f0]`}></div>
                  </div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-[#faf6f0]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-6">
            Begin Your Prophetic Journey
          </h2>
          <p className="text-xl text-[#2c5f6f] mb-10 max-w-2xl mx-auto">
            Join the community of truth seekers and contribute to the ultimate timeline of divine revelation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="https://app.prophecy.claims" 
              target="_blank" 
              rel="noopener noreferrer"
              className="prophecy-button text-lg px-10 py-4 inline-block text-center no-underline"
            >
              Start Creating Claims
            </a>
            <Link href="/viz" className="bg-transparent border-2 border-[#1e3a5f] text-[#1e3a5f] px-10 py-4 rounded-full font-semibold text-lg hover:bg-[#1e3a5f] hover:text-[#faf6f0] transition-all duration-300">
              View Analytics
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-[#faf6f0] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-display text-2xl font-bold mb-4 prophecy-gradient-text">Prophecy.Claims</h3>
              <p className="text-[#87ceeb] text-sm">
                The ultimate platform for tracking divine revelations and prophetic truth.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-[#87ceeb]">
                <li><a href="https://app.prophecy.claims" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4a574] transition-colors">Create Timeline</a></li>
                <li><Link href="/timelines" className="hover:text-[#d4a574] transition-colors">Browse Timelines</Link></li>
                <li><a href="#" className="hover:text-[#d4a574] transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-[#87ceeb]">
                <li><a href="#" className="hover:text-[#d4a574] transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-[#d4a574] transition-colors">API</a></li>
                <li><a href="#" className="hover:text-[#d4a574] transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-[#87ceeb]">
                <li><a href="#" className="hover:text-[#d4a574] transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-[#d4a574] transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-[#d4a574] transition-colors">Newsletter</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#2c5f6f] mt-8 pt-8 text-center text-sm text-[#87ceeb]">
            <p>&copy; 2024 Prophecy.Claims. All rights reserved. Built for divine truth.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

export async function getServerSideProps() {
  try {
    if (supabase) {
      const { data } = await supabase.from('submissions').select('*').limit(5);
      return { props: { claims: data || [] } };
    }
    return { props: { claims: [] } };
  } catch (error) {
    return { props: { claims: [] } };
  }
}

