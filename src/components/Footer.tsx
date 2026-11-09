import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, FileText, Lock, Copyright, Scale, Mail, CheckCircle2 } from 'lucide-react';

type LegalModalType = 'terms' | 'privacy' | 'dmca' | '2257' | 'support' | null;

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<LegalModalType>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    if (activeModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModal]);

  return (
    <>
      <footer className="border-t border-[#1E293B] bg-[#0A0F1D] text-[#94A3B8] text-xs mt-8 sm:mt-12 py-4 sm:py-5 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-3.5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex items-baseline">
                <span className="text-lg sm:text-xl font-black tracking-wider text-[#F8FAFC] font-display">UBC</span>
                <span className="text-lg sm:text-xl font-black tracking-wider text-[#F59E0B] font-display">EXX</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2A1218] border border-[#EF4444]/50 text-[#EF4444] text-[11px] font-bold font-mono tracking-wide shadow-[0_0_10px_rgba(239,68,68,0.2)] select-none">
                <span>🔞</span>
                <span>18+ ADULTS ONLY</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-1.5 text-xs font-medium text-[#CBD5E1]">
              <button
                type="button"
                onClick={() => setActiveModal('terms')}
                className="hover:text-[#F59E0B] transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span aria-hidden="true" className="text-[#253349]">·</span>
              <button
                type="button"
                onClick={() => setActiveModal('privacy')}
                className="hover:text-[#F59E0B] transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span aria-hidden="true" className="text-[#253349]">·</span>
              <button
                type="button"
                onClick={() => setActiveModal('dmca')}
                className="hover:text-[#F59E0B] transition-colors cursor-pointer"
              >
                DMCA &amp; Copyright
              </button>
              <span aria-hidden="true" className="text-[#253349]">·</span>
              <button
                type="button"
                onClick={() => setActiveModal('2257')}
                className="hover:text-[#F59E0B] transition-colors cursor-pointer"
              >
                18 U.S.C. 2257 Compliance
              </button>
              <span aria-hidden="true" className="text-[#253349]">·</span>
              <button
                type="button"
                onClick={() => setActiveModal('support')}
                className="hover:text-[#F59E0B] transition-colors cursor-pointer"
              >
                Contact Support
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1E293B]/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#64748B]">
            <span>© 2026 UBCEXX. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {activeModal && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#131C2E]">
              <div className="flex items-center gap-2.5">
                {activeModal === 'terms' && <FileText className="w-5 h-5 text-[#F59E0B]" />}
                {activeModal === 'privacy' && <Lock className="w-5 h-5 text-[#10B981]" />}
                {activeModal === 'dmca' && <Copyright className="w-5 h-5 text-[#38BDF8]" />}
                {activeModal === '2257' && <Scale className="w-5 h-5 text-[#EF4444]" />}
                {activeModal === 'support' && <Mail className="w-5 h-5 text-[#F59E0B]" />}
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    {activeModal === 'terms' && 'Terms of Service'}
                    {activeModal === 'privacy' && 'Privacy Policy'}
                    {activeModal === 'dmca' && 'DMCA & Copyright Policy'}
                    {activeModal === '2257' && '18 U.S.C. 2257 Record-Keeping Compliance'}
                    {activeModal === 'support' && 'Contact Support & Abuse Helpdesk'}
                  </h3>
                  <span className="text-[11px] text-[#94A3B8] font-mono">UBCEXX Official Compliance</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-[#1E293B] bg-[#0B1120] text-xs overflow-x-auto scrollbar-none px-4 py-1.5 gap-1">
              {[
                { id: 'terms', label: 'Terms' },
                { id: 'privacy', label: 'Privacy' },
                { id: 'dmca', label: 'DMCA' },
                { id: '2257', label: '2257 Compliance' },
                { id: 'support', label: 'Support' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModal(tab.id as LegalModalType)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeModal === tab.id
                      ? 'bg-[#1E293B] text-[#F8FAFC] font-semibold'
                      : 'text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-[#131C2E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 text-xs text-[#CBD5E1] leading-relaxed space-y-4">
              {activeModal === 'terms' && (
                <>
                  <div className="p-3 bg-[#131C2E] rounded-xl border border-[#1E293B] flex items-center gap-3 text-[#F59E0B]">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold">
                      Age Requirement: You must be at least 18 years old or the legal age of majority to use UBCEXX.
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">1. Acceptance of Terms</h4>
                  <p>
                    By accessing or viewing any streams, images, or services provided on UBCEXX, you represent and warrant that you are at least 18 years of age (or 21 where required by law) and have the full legal capacity to enter into these terms. If you do not meet these criteria, you must leave this site immediately.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">2. Prohibited Conduct</h4>
                  <p>
                    You agree not to upload, transmit, or promote any material involving non-consensual sexual content, underage content, harassment, or illegal acts. Any violation will result in immediate termination, IP banning, and reporting to relevant civil and criminal authorities.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">3. Disclaimer of Warranties</h4>
                  <p>
                    All content and media are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranty of any kind, whether express or implied. UBCEXX makes no warranty regarding stream uptime, video quality, or host compatibility.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">4. Limitation of Liability</h4>
                  <p>
                    In no event shall UBCEXX, its operators, or affiliates be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this platform.
                  </p>
                </>
              )}

              {activeModal === 'privacy' && (
                <>
                  <div className="p-3 bg-[#131C2E] rounded-xl border border-[#1E293B] flex items-center gap-3 text-[#10B981]">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold">
                      Zero Personal Profiling: UBCEXX does not sell, trade, or rent personal browsing data.
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">1. Information We Collect</h4>
                  <p>
                    UBCEXX operates on an anonymous guest-first architecture. We do not require guest account registration, names, or email addresses for public streaming. We collect standard technical telemetry (IP address, user-agent, and country code) strictly for edge caching, load balancing, anti-adblock proxying, and malicious traffic prevention.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">2. Local Storage Usage</h4>
                  <p>
                    We store lightweight guest preferences in your browser&apos;s localStorage (such as your liked videos list and session resume markers). These records never leave your local device.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">3. Third-Party Integrations</h4>
                  <p>
                    Certain embeds or partner links may utilize third-party cookies or proxy requests to deliver streaming payloads. We encourage visitors to review the privacy notices of external embed hosts.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">4. GDPR &amp; CCPA Compliance</h4>
                  <p>
                    Visitors from the European Economic Area (EEA) and California enjoy rights to request disclosure or purging of technical logs associated with their IP address by contacting our compliance officer.
                  </p>
                </>
              )}

              {activeModal === 'dmca' && (
                <>
                  <div className="p-3 bg-[#131C2E] rounded-xl border border-[#1E293B] flex items-center gap-3 text-[#38BDF8]">
                    <Copyright className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold">
                      DMCA Notice &amp; Takedown: Valid takedown notices are processed within 24 hours.
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">1. Copyright Protection Notice</h4>
                  <p>
                    UBCEXX respects intellectual property rights and adheres to the provisions of the Digital Millennium Copyright Act (17 U.S.C. § 512). It is our policy to promptly remove or disable access to any infringing content upon receiving a valid notification.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">2. Submitting a Takedown Notice</h4>
                  <p>
                    To file a notice of infringement, your written claim must include:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-[#94A3B8]">
                    <li>A physical or electronic signature of a person authorized to act on behalf of the copyright owner.</li>
                    <li>Identification of the copyrighted work claimed to have been infringed.</li>
                    <li>The exact URL or video ID on UBCEXX where the material is located.</li>
                    <li>Your full name, address, telephone number, and official email address.</li>
                    <li>A statement that you have a good faith belief that the use is unauthorized.</li>
                    <li>A statement, under penalty of perjury, that the information in the notification is accurate.</li>
                  </ul>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">3. Designated DMCA Agent</h4>
                  <p className="font-mono text-[#F8FAFC] bg-[#131C2E] p-2.5 rounded-lg border border-[#1E293B]">
                    Email: dmca@ubcexx.com<br />
                    Subject: DMCA Takedown Request - [Video Title/ID]
                  </p>
                </>
              )}

              {activeModal === '2257' && (
                <>
                  <div className="p-3 bg-[#2A1218] rounded-xl border border-[#EF4444]/40 flex items-center gap-3 text-[#EF4444]">
                    <Scale className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold">
                      18 U.S.C. § 2257 &amp; 2257A Record-Keeping Exemption &amp; Compliance Statement
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">1. Primary Producer Documentation</h4>
                  <p>
                    All visual content published or accessible via UBCEXX depicts individuals who were at least 18 years of age at the time of creation. Records required pursuant to 18 U.S.C. 2257 and 28 C.F.R. Part 75 are maintained by the respective original producers and publishers of the content.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">2. Non-Producer Status</h4>
                  <p>
                    UBCEXX is not a primary producer of visual depictions of actual sexually explicit conduct as defined in 18 U.S.C. 2257. The platform operates as an indexer, distributor, and embedded video provider. In compliance with federal regulations, UBCEXX requires all content contributors, third-party syndicators, and partners to maintain all age verification records in full accordance with federal law.
                  </p>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">3. Custodian of Records Inquiries</h4>
                  <p>
                    For inquiries concerning the designated custodian of records for any specific stream title, contact our legal compliance team with the relevant video identifier.
                  </p>
                  <p className="font-mono text-[#F8FAFC] bg-[#131C2E] p-2.5 rounded-lg border border-[#1E293B]">
                    Legal Department: compliance@ubcexx.com<br />
                    Attention: 18 U.S.C. 2257 Record Compliance Officer
                  </p>
                </>
              )}

              {activeModal === 'support' && (
                <>
                  <div className="p-3 bg-[#131C2E] rounded-xl border border-[#1E293B] flex items-center gap-3 text-[#F59E0B]">
                    <Mail className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold">
                      24/7 Priority Support &amp; Technical Helpdesk
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">How Can We Help You?</h4>
                  <p>
                    If you have questions regarding stream playback, content reporting, advertising partnerships, or legal inquiries, please contact our administrative team through the official channels below:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-[#131C2E] border border-[#1E293B]">
                      <span className="text-[10px] uppercase font-mono text-[#F59E0B] block mb-1">General Support</span>
                      <p className="text-xs font-bold text-[#F8FAFC]">support@ubcexx.com</p>
                      <span className="text-[11px] text-[#94A3B8]">Technical &amp; playback queries</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#131C2E] border border-[#1E293B]">
                      <span className="text-[10px] uppercase font-mono text-[#EF4444] block mb-1">Content Abuse &amp; Legal</span>
                      <p className="text-xs font-bold text-[#F8FAFC]">abuse@ubcexx.com</p>
                      <span className="text-[11px] text-[#94A3B8]">Immediate review within 24h</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] pt-2">
                    You can also report broken streams directly on any video page using the &quot;Report&quot; button beneath the player.
                  </p>
                </>
              )}
            </div>

            <div className="p-4 border-t border-[#1E293B] bg-[#131C2E] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#253349] text-xs font-semibold text-[#F8FAFC] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const TubeFooter = Footer;
